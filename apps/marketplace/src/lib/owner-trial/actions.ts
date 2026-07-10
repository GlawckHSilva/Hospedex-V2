"use server";

import { redirect } from "next/navigation";

import { criarClienteSupabaseAdmin } from "../supabase/admin";

const PLANOS_VALIDOS = ["essencial", "inicial", "profissional", "premium"] as const;
const FORMAS_PAGAMENTO = ["pix", "credit_card", "debit_card"] as const;
const CICLOS = ["monthly", "annual"] as const;

/**
 * Cria o Auth no servidor e delega a parte relacional a uma RPC transacional.
 * Se o banco falhar, o usuario Auth e removido para evitar conta incompleta.
 */
export async function iniciarTrialProprietarioAction(formData: FormData) {
  const planoCodigo = texto(formData, "plano").toLowerCase();
  let authUserId: string | null = null;

  try {
    const entrada = validarEntrada(formData, planoCodigo);
    const supabase = criarClienteSupabaseAdmin();
    const plano = await carregarPlano(supabase, entrada.planoCodigo);

    if (entrada.quantidadeEstimada > plano.max_properties) {
      throw new ErroCadastro(`Este plano permite ate ${plano.max_properties} casa(s).`);
    }

    const { data: authData, error: erroAuth } = await supabase.auth.admin.createUser({
      email: entrada.email,
      email_confirm: true,
      password: entrada.senha,
      user_metadata: {
        full_name: entrada.nomeCompleto,
        phone: entrada.telefone,
        profile_context: "owner_trial"
      }
    });

    if (erroAuth || !authData.user) {
      throw new ErroCadastro(traduzirErroAuth(erroAuth?.message));
    }

    authUserId = authData.user.id;

    const { error: erroProvisionamento } = await supabase.rpc("provision_public_owner_trial", {
      p_auth_user_id: authUserId,
      p_cidade: entrada.cidade,
      p_ciclo_cobranca: entrada.ciclo,
      p_email: entrada.email,
      p_estado: entrada.estado,
      p_forma_pagamento: entrada.formaPagamento,
      p_license_key: gerarChaveLicenca(),
      p_nome: entrada.nomeCompleto,
      p_plano_codigo: entrada.planoCodigo,
      p_quantidade_estimada: entrada.quantidadeEstimada,
      p_telefone: entrada.telefone,
      p_tenant_nome: entrada.empreendimento,
      p_tenant_slug: gerarSlug(entrada.empreendimento)
    });

    if (erroProvisionamento) {
      throw new ErroCadastro(traduzirErroBanco(erroProvisionamento.message));
    }
  } catch (erro) {
    if (authUserId) {
      try {
        await criarClienteSupabaseAdmin().auth.admin.deleteUser(authUserId);
      } catch (erroRemocao) {
        console.error("Nao foi possivel remover o usuario Auth incompleto.", erroRemocao);
      }
    }

    console.error("Erro ao iniciar trial publico do proprietario.", erro);
    const mensagem =
      erro instanceof ErroCadastro ? erro.message : "Nao foi possivel criar sua conta agora.";
    redirect(`/anunciar/cadastro?plan=${encodeURIComponent(planoCodigo)}&erro=${encodeURIComponent(mensagem)}`);
  }

  const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL?.trim() || "https://hospedex.vercel.app";
  redirect(
    `${adminUrl}/login?message=${encodeURIComponent("Conta criada. Entre para iniciar seus 30 dias gratis.")}`
  );
}

function validarEntrada(formData: FormData, planoCodigo: string) {
  const nome = textoObrigatorio(formData, "nome", "nome");
  const sobrenome = textoObrigatorio(formData, "sobrenome", "sobrenome");
  const email = textoObrigatorio(formData, "email", "e-mail").toLowerCase();
  const telefone = textoObrigatorio(formData, "telefone", "telefone");
  const senha = textoObrigatorio(formData, "senha", "senha");
  const confirmacaoSenha = textoObrigatorio(formData, "confirmacaoSenha", "confirmacao de senha");
  const empreendimento = textoObrigatorio(formData, "empreendimento", "nome do empreendimento");
  const cidade = textoObrigatorio(formData, "cidade", "cidade");
  const estado = textoObrigatorio(formData, "estado", "estado").toUpperCase();
  const quantidadeEstimada = Number(textoObrigatorio(formData, "quantidadeEstimada", "quantidade de casas"));
  const ciclo = textoObrigatorio(formData, "ciclo", "ciclo de cobranca");
  const formaPagamento = textoObrigatorio(formData, "formaPagamento", "forma de pagamento");

  if (!PLANOS_VALIDOS.includes(planoCodigo as (typeof PLANOS_VALIDOS)[number])) {
    throw new ErroCadastro("Selecione um plano valido.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ErroCadastro("Informe um e-mail valido.");
  if (!/^\d{10,13}$/.test(telefone.replace(/\D/g, ""))) throw new ErroCadastro("Informe um telefone valido.");
  if (senha.length < 8) throw new ErroCadastro("A senha deve ter pelo menos 8 caracteres.");
  if (senha !== confirmacaoSenha) throw new ErroCadastro("As senhas nao conferem.");
  if (!/^[A-Z]{2}$/.test(estado)) throw new ErroCadastro("Informe o estado com 2 letras.");
  if (!Number.isInteger(quantidadeEstimada) || quantidadeEstimada < 1) {
    throw new ErroCadastro("Informe uma quantidade de casas valida.");
  }
  if (!CICLOS.includes(ciclo as (typeof CICLOS)[number])) throw new ErroCadastro("Ciclo de cobranca invalido.");
  if (!FORMAS_PAGAMENTO.includes(formaPagamento as (typeof FORMAS_PAGAMENTO)[number])) {
    throw new ErroCadastro("Forma de pagamento invalida.");
  }
  if (formData.get("aceiteTermos") !== "on") throw new ErroCadastro("Aceite os termos do trial.");

  return {
    cidade,
    ciclo,
    email,
    empreendimento,
    estado,
    formaPagamento,
    nomeCompleto: `${nome} ${sobrenome}`,
    planoCodigo,
    quantidadeEstimada,
    senha,
    telefone: telefone.replace(/\D/g, "")
  };
}

async function carregarPlano(
  supabase: ReturnType<typeof criarClienteSupabaseAdmin>,
  codigo: string
) {
  const { data, error } = await supabase
    .from("plans")
    .select("id,max_properties")
    .eq("code", codigo)
    .eq("status", "active")
    .maybeSingle<{ id: string; max_properties: number }>();

  if (error || !data) throw new ErroCadastro("O plano selecionado nao esta disponivel.");
  return data;
}

function textoObrigatorio(formData: FormData, chave: string, campo: string) {
  const valor = texto(formData, chave);
  if (!valor) throw new ErroCadastro(`Informe ${campo}.`);
  return valor;
}

function texto(formData: FormData, chave: string) {
  return formData.get(chave)?.toString().trim() ?? "";
}

function gerarSlug(nome: string) {
  const base = nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 42) || "hospedagem";
  return `${base}-${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
}

function gerarChaveLicenca() {
  return `HSPX-TRIAL-${crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
}

function traduzirErroAuth(mensagem?: string) {
  const erro = mensagem?.toLowerCase() ?? "";
  if (erro.includes("already") || erro.includes("registered")) return "Ja existe uma conta com este e-mail.";
  if (erro.includes("password")) return "A senha informada nao atende aos requisitos de seguranca.";
  if (erro.includes("email")) return "Informe um e-mail valido.";
  return "Nao foi possivel criar o acesso de proprietario.";
}

function traduzirErroBanco(mensagem: string) {
  const erro = mensagem.toLowerCase();
  if (erro.includes("plano")) return "O plano selecionado nao esta disponivel.";
  if (erro.includes("quantidade")) return "A quantidade de casas excede o limite do plano.";
  if (erro.includes("e-mail") || erro.includes("email")) return "Ja existe uma conta com este e-mail.";
  return "Nao foi possivel ativar o trial. Nenhuma cobranca foi realizada.";
}

class ErroCadastro extends Error {}
