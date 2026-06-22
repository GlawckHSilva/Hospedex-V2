"use server";

import type {
  IntegrationProvider,
  TenantIntegrationRow,
} from "@hospedex/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { criarClienteSupabaseServer } from "../supabase/server";
import { obterDefinicaoIntegracao, providerIntegracaoValido } from "./catalog";
import {
  exigirAcessoIntegracoes,
  podeGerenciarIntegracoes,
} from "./permissions";
import type { FrequenciaSincronizacao } from "./types";

/**
 * Mutacoes da Central de Integracoes.
 *
 * Somente preferencias nao sensiveis entram no payload. Credenciais futuras
 * devem ser tratadas pelo backend e nunca por FormData ou codigo cliente.
 */

const CAMINHO_INTEGRACOES = "/integracoes";
const FREQUENCIAS = new Set<FrequenciaSincronizacao>([
  "manual",
  "hourly",
  "daily",
]);

class ErroRegraIntegracoes extends Error {}

export async function alternarIntegracaoAction(formData: FormData) {
  const escopo = await carregarEscopo();

  try {
    const provider = obterProvider(formData);
    validarDisponibilidade(provider);
    const enabled = textoObrigatorio(formData, "ativo", "status") === "true";
    const supabase = await criarClienteSupabaseServer();
    const atual = await carregarRegistro(supabase, escopo.tenantId, provider);
    const status = enabled
      ? atual?.configured_at
        ? "pending_backend"
        : "not_configured"
      : "disabled";

    const { error } = await supabase.from("tenant_integrations").upsert(
      {
        enabled,
        provider,
        status,
        tenant_id: escopo.tenantId,
      },
      { onConflict: "tenant_id,provider" },
    );

    if (error) throw new Error(error.message);
    revalidarModulo();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao alterar a integracao.");
  }

  redirect(`${CAMINHO_INTEGRACOES}?sucesso=status-atualizado`);
}

export async function salvarConfiguracaoIntegracaoAction(formData: FormData) {
  const escopo = await carregarEscopo();

  try {
    const provider = obterProvider(formData);
    validarDisponibilidade(provider);
    const definicao = obterDefinicaoIntegracao(provider);
    const supabase = await criarClienteSupabaseServer();
    const atual = await carregarRegistro(supabase, escopo.tenantId, provider);
    const frequencia = definicao.sincronizavel
      ? obterFrequencia(formData)
      : "manual";

    const { error } = await supabase.from("tenant_integrations").upsert(
      {
        configured_at: new Date().toISOString(),
        configured_by: escopo.userId,
        enabled: atual?.enabled ?? false,
        provider,
        public_settings: {
          frequencia_sincronizacao: frequencia,
          nome_interno: textoOpcional(formData, "nomeInterno", 80),
          observacoes: textoOpcional(formData, "observacoes", 500),
        },
        status: atual?.enabled ? "pending_backend" : "disabled",
        tenant_id: escopo.tenantId,
      },
      { onConflict: "tenant_id,provider" },
    );

    if (error) throw new Error(error.message);
    revalidarModulo();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao salvar a configuracao da integracao.");
  }

  redirect(`${CAMINHO_INTEGRACOES}?sucesso=configuracao-salva`);
}

async function carregarEscopo() {
  const contexto = await exigirAcessoIntegracoes();

  if (!contexto.tenant || !podeGerenciarIntegracoes(contexto)) {
    redirect("/sem-acesso?motivo=permissao-insuficiente");
  }

  return {
    tenantId: contexto.tenant.id,
    userId: contexto.userId,
  };
}

type SupabaseServer = Awaited<ReturnType<typeof criarClienteSupabaseServer>>;

async function carregarRegistro(
  supabase: SupabaseServer,
  tenantId: string,
  provider: IntegrationProvider,
) {
  const { data, error } = await supabase
    .from("tenant_integrations")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("provider", provider)
    .maybeSingle<TenantIntegrationRow>();

  if (error) throw new Error(error.message);
  return data;
}

function obterProvider(formData: FormData): IntegrationProvider {
  const valor = textoObrigatorio(formData, "provider", "integracao");
  if (!providerIntegracaoValido(valor)) {
    throw new ErroRegraIntegracoes("Integracao invalida.");
  }
  return valor;
}

function validarDisponibilidade(provider: IntegrationProvider) {
  if (obterDefinicaoIntegracao(provider).futura) {
    throw new ErroRegraIntegracoes(
      "Esta integracao ainda nao esta disponivel.",
    );
  }
}

function obterFrequencia(formData: FormData): FrequenciaSincronizacao {
  const valor = textoObrigatorio(formData, "frequencia", "frequencia");
  if (!FREQUENCIAS.has(valor as FrequenciaSincronizacao)) {
    throw new ErroRegraIntegracoes("Frequencia de sincronizacao invalida.");
  }
  return valor as FrequenciaSincronizacao;
}

function textoObrigatorio(
  formData: FormData,
  chave: string,
  label: string,
): string {
  const valor = String(formData.get(chave) ?? "").trim();
  if (!valor) throw new ErroRegraIntegracoes(`Informe ${label}.`);
  return valor;
}

function textoOpcional(
  formData: FormData,
  chave: string,
  limite: number,
): string | null {
  const valor = String(formData.get(chave) ?? "").trim();
  if (!valor) return null;
  if (valor.length > limite) {
    throw new ErroRegraIntegracoes(
      `O campo ${chave} excedeu o limite permitido.`,
    );
  }
  return valor;
}

function revalidarModulo() {
  revalidatePath(CAMINHO_INTEGRACOES);
}

function redirecionarComErro(erro: unknown, fallback: string): never {
  const mensagem = erro instanceof Error ? erro.message : fallback;
  redirect(`${CAMINHO_INTEGRACOES}?erro=${encodeURIComponent(mensagem)}`);
}
