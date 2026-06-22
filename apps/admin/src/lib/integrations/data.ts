import type { JsonValue, TenantIntegrationRow } from "@hospedex/types";

import type { ContextoAutenticacao } from "../auth/types";
import { criarClienteSupabaseServer } from "../supabase/server";
import { CATALOGO_INTEGRACOES } from "./catalog";
import { podeGerenciarIntegracoes } from "./permissions";
import type {
  ConfiguracaoPublicaIntegracao,
  DadosCentralIntegracoes,
  FrequenciaSincronizacao,
  IntegracaoGerenciamento,
} from "./types";

/**
 * Carrega o estado real das integracoes do tenant autenticado.
 *
 * A ausencia de uma linha representa integracao ainda nao configurada. Isso
 * permite que novos tenants usem o catalogo sem depender de dados mockados.
 */

export async function carregarCentralIntegracoes(
  contexto: ContextoAutenticacao,
): Promise<DadosCentralIntegracoes> {
  const tenant = contexto.tenant;

  if (!tenant) {
    return montarDados([], contexto, "Tenant nao encontrado.");
  }

  const supabase = await criarClienteSupabaseServer();
  const { data, error } = await supabase
    .from("tenant_integrations")
    .select("*")
    .eq("tenant_id", tenant.id)
    .returns<TenantIntegrationRow[]>();

  if (error) {
    console.error("Nao foi possivel carregar as integracoes.", error.message);
  }

  return montarDados(
    data ?? [],
    contexto,
    error ? "Nao foi possivel carregar as integracoes." : null,
  );
}

function montarDados(
  registros: TenantIntegrationRow[],
  contexto: ContextoAutenticacao,
  erroCarregamento: string | null,
): DadosCentralIntegracoes {
  const porProvider = new Map(
    registros.map((registro) => [registro.provider, registro]),
  );
  const integracoes: IntegracaoGerenciamento[] = CATALOGO_INTEGRACOES.map(
    (definicao) => {
      const registro = porProvider.get(definicao.provider);

      return {
        ...definicao,
        configuracao: normalizarConfiguracao(registro?.public_settings),
        configuradaEm: registro?.configured_at ?? null,
        enabled: registro?.enabled ?? false,
        id: registro?.id ?? null,
        lastSyncedAt: registro?.last_synced_at ?? null,
        status: registro?.status ?? "disabled",
      };
    },
  );

  const operacionais = integracoes.filter((integracao) => !integracao.futura);

  return {
    erroCarregamento,
    integracoes,
    podeGerenciar: podeGerenciarIntegracoes(contexto),
    resumo: {
      ativas: operacionais.filter((integracao) => integracao.enabled).length,
      futuras: integracoes.filter((integracao) => integracao.futura).length,
      pendentes: operacionais.filter(
        (integracao) =>
          integracao.enabled &&
          ["not_configured", "pending_backend"].includes(integracao.status),
      ).length,
      total: integracoes.length,
    },
    tenantNome: contexto.tenant?.name ?? "Tenant nao encontrado",
  };
}

function normalizarConfiguracao(
  valor: JsonValue | undefined,
): ConfiguracaoPublicaIntegracao {
  const objeto = ehObjetoJson(valor) ? valor : {};

  return {
    frequenciaSincronizacao: normalizarFrequencia(
      objeto.frequencia_sincronizacao,
    ),
    nomeInterno: textoOuNull(objeto.nome_interno),
    observacoes: textoOuNull(objeto.observacoes),
  };
}

function ehObjetoJson(
  valor: JsonValue | undefined,
): valor is Record<string, JsonValue> {
  return Boolean(valor && typeof valor === "object" && !Array.isArray(valor));
}

function textoOuNull(valor: JsonValue | undefined): string | null {
  return typeof valor === "string" && valor.trim() ? valor : null;
}

function normalizarFrequencia(
  valor: JsonValue | undefined,
): FrequenciaSincronizacao {
  if (valor === "hourly" || valor === "daily") return valor;
  return "manual";
}
