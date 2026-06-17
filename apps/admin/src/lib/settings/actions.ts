"use server";

import type { FeatureFlagRow, TenantCleaningPolicy } from "@hospedex/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirAutenticacao } from "../auth/context";
import type { ContextoAutenticacao } from "../auth/types";
import { criarClienteSupabaseServer } from "../supabase/server";
import {
  podeGerenciarConfiguracoes,
  podeGerenciarModulosConfiguracoes
} from "./data";
import {
  MODULOS_GERENCIAMENTO_CONFIGURAVEIS,
  POLITICAS_LIMPEZA,
  type ChaveModuloGerenciamento
} from "./types";

/**
 * Server actions das Configuracoes do Gerenciamento.
 *
 * Todas as alteracoes sensiveis passam pelo servidor e pela sessao Supabase do
 * usuario autenticado. A service role nao entra no frontend nem nestas actions.
 */

const CAMINHO_CONFIGURACOES = "/configuracoes";

class ErroRegraConfiguracoes extends Error {}

type EscopoConfiguracoes = {
  contexto: ContextoAutenticacao;
  ownerId: string;
  tenantId: string;
};

export async function atualizarConfiguracoesGeraisAction(formData: FormData) {
  const escopo = await carregarEscopoConfiguracoes();

  try {
    const supabase = await criarClienteSupabaseServer();
    const entrada = obterEntradaGeral(formData);

    const { error: erroTenant } = await supabase
      .from("tenants")
      .update({ name: entrada.tenantName })
      .eq("id", escopo.tenantId)
      .eq("owner_id", escopo.ownerId);

    if (erroTenant) throw new Error(erroTenant.message);

    const { error } = await supabase.from("tenant_settings").upsert(
      {
        tenant_id: escopo.tenantId,
        owner_id: escopo.ownerId,
        logo_url: entrada.logoUrl,
        primary_color: entrada.primaryColor,
        phone: entrada.phone,
        whatsapp: entrada.whatsapp,
        email: entrada.email,
        city: entrada.city,
        state: entrada.state,
        short_description: entrada.shortDescription
      },
      { onConflict: "tenant_id" }
    );

    if (error) throw new Error(error.message);
    revalidarConfiguracoes();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao salvar configuracoes gerais.");
  }

  redirect(`${CAMINHO_CONFIGURACOES}?sucesso=configuracoes-atualizadas`);
}

export async function atualizarPreferenciasOperacionaisAction(formData: FormData) {
  const escopo = await carregarEscopoConfiguracoes();

  try {
    const supabase = await criarClienteSupabaseServer();
    const entrada = obterEntradaOperacional(formData);

    const { error } = await supabase.from("tenant_settings").upsert(
      {
        tenant_id: escopo.tenantId,
        owner_id: escopo.ownerId,
        default_check_in_time: entrada.defaultCheckInTime,
        default_check_out_time: entrada.defaultCheckOutTime,
        cleaning_policy: entrada.cleaningPolicy,
        allow_manual_reservations: entrada.allowManualReservations,
        require_payment_confirmation: entrada.requirePaymentConfirmation,
        require_checkin_confirmation: entrada.requireCheckinConfirmation,
        require_checkout_confirmation: entrada.requireCheckoutConfirmation
      },
      { onConflict: "tenant_id" }
    );

    if (error) throw new Error(error.message);
    revalidarConfiguracoes();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao salvar preferencias operacionais.");
  }

  redirect(`${CAMINHO_CONFIGURACOES}?sucesso=preferencias-atualizadas`);
}

export async function alternarModuloGerenciamentoAction(formData: FormData) {
  const escopo = await carregarEscopoModulos();

  try {
    const supabase = await criarClienteSupabaseServer();
    const key = validarChaveModulo(textoObrigatorio(formData, "modulo", "modulo"));
    const enabled = textoObrigatorio(formData, "ativo", "status") === "true";
    const { data: flag, error: erroFlag } = await supabase
      .from("feature_flags")
      .select("*")
      .eq("key", key)
      .maybeSingle<FeatureFlagRow>();

    if (erroFlag) throw new Error(erroFlag.message);
    if (!flag) throw new ErroRegraConfiguracoes("Modulo nao liberado para este tenant.");
    if (!flag.owner_configurable) {
      throw new ErroRegraConfiguracoes("Este modulo so pode ser alterado pelo Super Admin.");
    }

    const { error } = await supabase.from("tenant_features").upsert(
      {
        tenant_id: escopo.tenantId,
        feature_flag_id: flag.id,
        enabled,
        configured_by: escopo.contexto.userId
      },
      { onConflict: "tenant_id,feature_flag_id" }
    );

    if (error) throw new Error(error.message);
    revalidarConfiguracoes();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao atualizar modulo.");
  }

  redirect(`${CAMINHO_CONFIGURACOES}?sucesso=modulo-atualizado`);
}

export async function alterarSenhaConfiguracoesAction(formData: FormData) {
  await exigirAutenticacao();

  try {
    const senha = textoObrigatorio(formData, "password", "nova senha");
    const confirmacao = textoObrigatorio(formData, "passwordConfirm", "confirmacao da senha");

    if (senha.length < 8) {
      throw new ErroRegraConfiguracoes("A senha deve ter pelo menos 8 caracteres.");
    }
    if (senha !== confirmacao) {
      throw new ErroRegraConfiguracoes("A confirmacao da senha nao confere.");
    }

    const supabase = await criarClienteSupabaseServer();
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) throw new Error(error.message);
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao alterar senha.");
  }

  redirect(`${CAMINHO_CONFIGURACOES}?sucesso=senha-atualizada`);
}

async function carregarEscopoConfiguracoes(): Promise<EscopoConfiguracoes> {
  const contexto = await exigirAutenticacao();

  if (!contexto.tenant || !podeGerenciarConfiguracoes(contexto)) {
    redirect("/sem-acesso?motivo=permissao-insuficiente");
  }

  return {
    contexto,
    ownerId: contexto.tenant.owner_id,
    tenantId: contexto.tenant.id
  };
}

async function carregarEscopoModulos(): Promise<EscopoConfiguracoes> {
  const contexto = await exigirAutenticacao();

  if (!contexto.tenant || !podeGerenciarModulosConfiguracoes(contexto)) {
    redirect("/sem-acesso?motivo=permissao-insuficiente");
  }

  return {
    contexto,
    ownerId: contexto.tenant.owner_id,
    tenantId: contexto.tenant.id
  };
}

function obterEntradaGeral(formData: FormData) {
  return {
    city: textoOpcional(formData, "city"),
    email: textoOpcional(formData, "email"),
    logoUrl: textoOpcional(formData, "logoUrl"),
    phone: textoOpcional(formData, "phone"),
    primaryColor: validarCor(textoObrigatorio(formData, "primaryColor", "cor principal")),
    shortDescription: textoOpcional(formData, "shortDescription"),
    state: validarEstado(textoOpcional(formData, "state")),
    tenantName: textoObrigatorio(formData, "tenantName", "nome do empreendimento"),
    whatsapp: textoOpcional(formData, "whatsapp")
  };
}

function obterEntradaOperacional(formData: FormData) {
  return {
    allowManualReservations: checkboxAtivo(formData, "allowManualReservations"),
    cleaningPolicy: validarPoliticaLimpeza(
      textoObrigatorio(formData, "cleaningPolicy", "politica de limpeza")
    ),
    defaultCheckInTime: validarHora(textoObrigatorio(formData, "defaultCheckInTime", "check-in")),
    defaultCheckOutTime: validarHora(
      textoObrigatorio(formData, "defaultCheckOutTime", "check-out")
    ),
    requireCheckinConfirmation: checkboxAtivo(formData, "requireCheckinConfirmation"),
    requireCheckoutConfirmation: checkboxAtivo(formData, "requireCheckoutConfirmation"),
    requirePaymentConfirmation: checkboxAtivo(formData, "requirePaymentConfirmation")
  };
}

function validarChaveModulo(valor: string): ChaveModuloGerenciamento {
  const chaves = MODULOS_GERENCIAMENTO_CONFIGURAVEIS.map((modulo) => modulo.key);
  if (chaves.includes(valor as ChaveModuloGerenciamento)) {
    return valor as ChaveModuloGerenciamento;
  }

  throw new ErroRegraConfiguracoes("Modulo invalido.");
}

function validarPoliticaLimpeza(valor: string): TenantCleaningPolicy {
  const politicas = POLITICAS_LIMPEZA.map((politica) => politica.value);
  if (politicas.includes(valor as TenantCleaningPolicy)) {
    return valor as TenantCleaningPolicy;
  }

  throw new ErroRegraConfiguracoes("Politica de limpeza invalida.");
}

function validarCor(valor: string): string {
  if (/^#[0-9A-Fa-f]{6}$/.test(valor)) return valor;
  throw new ErroRegraConfiguracoes("Informe uma cor principal valida.");
}

function validarEstado(valor: string | null): string | null {
  if (!valor) return null;
  if (/^[A-Za-z]{2}$/.test(valor)) return valor.toUpperCase();
  throw new ErroRegraConfiguracoes("Informe o estado com duas letras.");
}

function validarHora(valor: string): string {
  if (/^\d{2}:\d{2}$/.test(valor)) return valor;
  throw new ErroRegraConfiguracoes("Informe um horario valido.");
}

function textoObrigatorio(formData: FormData, chave: string, label: string): string {
  const valor = formData.get(chave)?.toString().trim();
  if (!valor) throw new ErroRegraConfiguracoes(`Informe ${label}.`);
  return valor;
}

function textoOpcional(formData: FormData, chave: string): string | null {
  const valor = formData.get(chave)?.toString().trim();
  return valor ? valor : null;
}

function checkboxAtivo(formData: FormData, chave: string): boolean {
  return formData.get(chave) === "on";
}

function revalidarConfiguracoes() {
  revalidatePath(CAMINHO_CONFIGURACOES);
  revalidatePath("/");
}

function redirecionarComErro(erro: unknown, mensagemPadrao: string): never {
  if (!(erro instanceof ErroRegraConfiguracoes)) {
    console.error(mensagemPadrao, erro);
  }

  const mensagem = erro instanceof ErroRegraConfiguracoes ? erro.message : mensagemPadrao;
  redirect(`${CAMINHO_CONFIGURACOES}?erro=${encodeURIComponent(mensagem)}`);
}
