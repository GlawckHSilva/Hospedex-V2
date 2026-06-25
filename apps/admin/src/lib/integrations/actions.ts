"use server";

import type {
  IntegrationProvider,
  JsonValue,
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
import type {
  FrequenciaSincronizacao,
  ModoUsoIntegracao,
} from "./types";

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
    const ativaPeloProprietario =
      textoObrigatorio(formData, "ativo", "status") === "true";
    const supabase = await criarClienteSupabaseServer();
    const atual = await carregarRegistro(supabase, escopo.tenantId, provider);
    validarLiberacaoAdministrativa(atual);
    const configuracaoAtual = obterObjetoConfiguracao(atual.public_settings);
    const status =
      ativaPeloProprietario &&
      !["connected", "error"].includes(atual.status)
        ? atual.configured_at
          ? "pending_backend"
          : "not_configured"
        : atual.status;

    const { error } = await supabase.from("tenant_integrations").upsert(
      {
        enabled: true,
        provider,
        public_settings: {
          ...configuracaoAtual,
          ativa_pelo_proprietario: ativaPeloProprietario,
        },
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
    validarLiberacaoAdministrativa(atual);
    const modoUso = obterModoUso(formData, provider);
    validarCamposObrigatorios(formData, provider);
    const frequencia = definicao.sincronizavel
      ? obterFrequencia(formData)
      : "manual";
    const ativaPeloProprietario =
      String(formData.get("ativoPeloProprietario") ?? "") === "true";
    const configuracaoAtual = obterObjetoConfiguracao(atual.public_settings);
    const status =
      ativaPeloProprietario &&
      !["connected", "error"].includes(atual.status)
        ? "pending_backend"
        : atual.status;

    const { error } = await supabase.from("tenant_integrations").upsert(
      {
        configured_at: new Date().toISOString(),
        configured_by: escopo.userId,
        enabled: true,
        provider,
        public_settings: {
          ...configuracaoAtual,
          ativa_pelo_proprietario: ativaPeloProprietario,
          cidade: textoOpcional(formData, "cidade", 100),
          formato_data: textoOpcional(formData, "formatoData", 20),
          frequencia_sincronizacao: frequencia,
          fuso_horario: textoOpcional(formData, "fusoHorario", 80),
          idioma: textoOpcional(formData, "idioma", 20),
          mensagens_automaticas:
            String(formData.get("mensagensAutomaticas") ?? "") === "true",
          modo_uso: modoUso,
          nome_publico: textoOpcional(formData, "nomePublico", 80),
          nome_remetente: textoOpcional(formData, "nomeRemetente", 80),
          numero_publico: textoOpcional(formData, "numeroPublico", 30),
        },
        status,
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

function validarLiberacaoAdministrativa(
  registro: TenantIntegrationRow | null,
): asserts registro is TenantIntegrationRow {
  if (!registro?.enabled) {
    throw new ErroRegraIntegracoes(
      "Esta integracao nao esta liberada para seu plano ou licenca.",
    );
  }
}

function obterModoUso(
  formData: FormData,
  provider: IntegrationProvider,
): ModoUsoIntegracao {
  const valor = textoObrigatorio(formData, "modoUso", "forma de utilizacao");
  const permitidos = obterDefinicaoIntegracao(provider).opcoesUso.map(
    (opcao) => opcao.valor,
  );

  if (!permitidos.includes(valor as ModoUsoIntegracao)) {
    throw new ErroRegraIntegracoes(
      "Forma de utilizacao invalida para esta integracao.",
    );
  }

  return valor as ModoUsoIntegracao;
}

function validarCamposObrigatorios(
  formData: FormData,
  provider: IntegrationProvider,
) {
  if (provider === "whatsapp") {
    textoObrigatorio(formData, "nomePublico", "nome publico");
    textoObrigatorio(formData, "numeroPublico", "numero publico");
  }

  if (provider === "email") {
    textoObrigatorio(formData, "nomeRemetente", "nome do remetente");
  }

  if (provider === "payments") {
    textoObrigatorio(formData, "nomePublico", "nome exibido ao hospede");
  }

  if (provider === "google_maps" || provider === "weather") {
    textoObrigatorio(formData, "cidade", "cidade");
  }

  if (provider === "ical") {
    textoObrigatorio(formData, "fusoHorario", "fuso horario");
    textoObrigatorio(formData, "formatoData", "formato de data");
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

function obterObjetoConfiguracao(
  valor: JsonValue,
): Record<string, JsonValue> {
  return valor && typeof valor === "object" && !Array.isArray(valor)
    ? valor
    : {};
}

function revalidarModulo() {
  revalidatePath(CAMINHO_INTEGRACOES);
}

function redirecionarComErro(erro: unknown, fallback: string): never {
  const mensagem = erro instanceof Error ? erro.message : fallback;
  redirect(`${CAMINHO_INTEGRACOES}?erro=${encodeURIComponent(mensagem)}`);
}
