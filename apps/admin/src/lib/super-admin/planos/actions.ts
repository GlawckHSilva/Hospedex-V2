"use server";

import type { PlanRow } from "@hospedex/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirSuperAdmin } from "../../auth/context";
import { criarClienteSupabaseServer } from "../../supabase/server";

const CAMINHO_PLANOS = "/super-admin/planos";
const STATUS_PLANO: PlanRow["status"][] = ["draft", "active", "archived"];

type SupabaseServer = Awaited<ReturnType<typeof criarClienteSupabaseServer>>;

type EntradaPlano = {
  codigo: string;
  descricao: string | null;
  limitePropriedades: number;
  limiteUnidades: number;
  nome: string;
  recursos: string[];
  status: PlanRow["status"];
  valorMensal: number;
};

export async function criarPlanoAction(formData: FormData) {
  const contexto = await exigirSuperAdmin();
  const supabase = await criarClienteSupabaseServer();
  const entrada = obterEntradaPlano(formData);

  try {
    const { data, error } = await supabase
      .from("plans")
      .insert({
        annual_price: calcularValorAnual(entrada.valorMensal),
        code: entrada.codigo,
        description: entrada.descricao,
        max_properties: entrada.limitePropriedades,
        max_units: entrada.limiteUnidades,
        monthly_price: entrada.valorMensal,
        name: entrada.nome,
        status: entrada.status
      })
      .select("*")
      .single<PlanRow>();

    if (error || !data) throw new Error(error?.message ?? "Plano nao retornado apos criacao.");

    await salvarRecursosPlano(supabase, data.id, entrada.recursos);
    await registrarAuditoria(supabase, contexto.userId, data.id, "super_admin.plan.created");
    revalidarModulo();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao criar plano.");
  }

  redirect(`${CAMINHO_PLANOS}?sucesso=plano-criado`);
}

export async function atualizarPlanoAction(formData: FormData) {
  const contexto = await exigirSuperAdmin();
  const supabase = await criarClienteSupabaseServer();
  const planId = textoObrigatorio(formData, "planId", "plano");
  const entrada = obterEntradaPlano(formData);

  try {
    const { data, error } = await supabase
      .from("plans")
      .update({
        annual_price: calcularValorAnual(entrada.valorMensal),
        code: entrada.codigo,
        description: entrada.descricao,
        max_properties: entrada.limitePropriedades,
        max_units: entrada.limiteUnidades,
        monthly_price: entrada.valorMensal,
        name: entrada.nome,
        status: entrada.status
      })
      .eq("id", planId)
      .select("*")
      .single<PlanRow>();

    if (error || !data) throw new Error(error?.message ?? "Plano nao encontrado para edicao.");

    await salvarRecursosPlano(supabase, data.id, entrada.recursos);
    await registrarAuditoria(supabase, contexto.userId, data.id, "super_admin.plan.updated");
    revalidarModulo();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao atualizar plano.");
  }

  redirect(`${CAMINHO_PLANOS}?sucesso=plano-atualizado`);
}

async function salvarRecursosPlano(
  supabase: SupabaseServer,
  planId: string,
  recursosSelecionados: string[]
) {
  const { data, error } = await supabase
    .from("feature_flags")
    .select("id")
    .returns<Array<{ id: string }>>();

  if (error) throw new Error(error.message);

  const idsValidos = new Set((data ?? []).map((flag) => flag.id));
  const selecionados = new Set(recursosSelecionados);

  if ([...selecionados].some((id) => !idsValidos.has(id))) {
    throw new ErroRegraPlano("Recurso invalido para este plano.");
  }

  const linhas = (data ?? []).map((flag) => ({
    enabled: selecionados.has(flag.id),
    feature_flag_id: flag.id,
    limits: {},
    plan_id: planId
  }));

  if (!linhas.length) return;

  const { error: erroUpsert } = await supabase
    .from("plan_features")
    .upsert(linhas, { onConflict: "plan_id,feature_flag_id" });

  if (erroUpsert) throw new Error(erroUpsert.message);
}

async function registrarAuditoria(
  supabase: SupabaseServer,
  actorId: string,
  planId: string,
  action: string
) {
  const { error } = await supabase.from("audit_logs").insert({
    action,
    actor_id: actorId,
    entity_id: planId,
    entity_table: "plans",
    metadata: {},
    tenant_id: null
  });

  if (error) console.error("Erro ao registrar auditoria de plano.", error.message);
}

function obterEntradaPlano(formData: FormData): EntradaPlano {
  const nome = textoObrigatorio(formData, "nome", "nome");

  return {
    codigo: gerarCodigo(textoOpcional(formData, "codigo") ?? nome),
    descricao: textoOpcional(formData, "descricao"),
    limitePropriedades: numeroInteiro(formData, "limitePropriedades", "limite de propriedades", 1),
    limiteUnidades: numeroInteiro(formData, "limiteUnidades", "limite de unidades", 1),
    nome,
    recursos: formData.getAll("recursos").map((valor) => valor.toString()),
    status: validarStatusPlano(textoObrigatorio(formData, "status", "status")),
    valorMensal: numeroDecimal(formData, "valorMensal", "valor mensal")
  };
}

function validarStatusPlano(valor: string): PlanRow["status"] {
  if (STATUS_PLANO.includes(valor as PlanRow["status"])) return valor as PlanRow["status"];
  throw new ErroRegraPlano("Status do plano invalido.");
}

function calcularValorAnual(valorMensal: number) {
  // Regra administrativa simples ate existir tela comercial de desconto anual.
  return Number((valorMensal * 12).toFixed(2));
}

function textoObrigatorio(formData: FormData, chave: string, label: string): string {
  const valor = formData.get(chave)?.toString().trim();
  if (!valor) throw new ErroRegraPlano(`Informe ${label}.`);
  return valor;
}

function textoOpcional(formData: FormData, chave: string): string | null {
  const valor = formData.get(chave)?.toString().trim();
  return valor ? valor : null;
}

function numeroInteiro(formData: FormData, chave: string, label: string, minimo: number) {
  const valor = Number.parseInt(textoObrigatorio(formData, chave, label), 10);
  if (Number.isNaN(valor) || valor < minimo) {
    throw new ErroRegraPlano(`Informe ${label} valido.`);
  }

  return valor;
}

function numeroDecimal(formData: FormData, chave: string, label: string) {
  const normalizado = textoObrigatorio(formData, chave, label).replace(",", ".");
  const valor = Number.parseFloat(normalizado);
  if (Number.isNaN(valor) || valor < 0) throw new ErroRegraPlano(`Informe ${label} valido.`);
  return Number(valor.toFixed(2));
}

function gerarCodigo(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function redirecionarComErro(erro: unknown, mensagemLog: string): never {
  const mensagem =
    erro instanceof ErroRegraPlano ? erro.message : "Nao foi possivel concluir a operacao do plano.";

  if (!(erro instanceof ErroRegraPlano)) {
    console.error(mensagemLog, erro);
  }

  redirect(`${CAMINHO_PLANOS}?erro=${encodeURIComponent(mensagem)}`);
}

function revalidarModulo() {
  revalidatePath(CAMINHO_PLANOS);
  revalidatePath("/super-admin");
}

class ErroRegraPlano extends Error {}
