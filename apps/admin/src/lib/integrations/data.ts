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
  ModoUsoIntegracao,
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
  const integracoes: IntegracaoGerenciamento[] = CATALOGO_INTEGRACOES.flatMap(
    (definicao) => {
      const registro = porProvider.get(definicao.provider);

      // A disponibilidade pertence ao Super Admin. Integracoes bloqueadas nao
      // sao reveladas nem configuradas pelo proprietario.
      if (!registro?.enabled || definicao.futura) return [];

      const configuracao = normalizarConfiguracao(
        registro.public_settings,
        registro.enabled,
      );

      return [
        {
          ...definicao,
          ativa: configuracao.ativaPeloProprietario,
          configuracao,
          configuradaEm: registro.configured_at,
          id: registro.id,
          lastSyncedAt: registro.last_synced_at,
          status: registro.status,
        },
      ];
    },
  );

  return {
    erroCarregamento,
    integracoes,
    podeGerenciar: podeGerenciarIntegracoes(contexto),
    resumo: {
      ativas: integracoes.filter((integracao) => integracao.ativa).length,
      configuradas: integracoes.filter((integracao) => integracao.configuradaEm)
        .length,
      pendentes: integracoes.filter((integracao) => !integracao.configuradaEm)
        .length,
      total: integracoes.length,
    },
    tenantNome: contexto.tenant?.name ?? "Tenant nao encontrado",
  };
}

function normalizarConfiguracao(
  valor: JsonValue | undefined,
  ativaAnterior: boolean,
): ConfiguracaoPublicaIntegracao {
  const objeto = ehObjetoJson(valor) ? valor : {};

  return {
    // Registros anteriores usavam enabled como disponibilidade e ativacao.
    // O fallback preserva o comportamento ate o proprietario salvar a escolha.
    ativaPeloProprietario:
      typeof objeto.ativa_pelo_proprietario === "boolean"
        ? objeto.ativa_pelo_proprietario
        : ativaAnterior,
    cidade: textoOuNull(objeto.cidade),
    formatoData: textoOuNull(objeto.formato_data),
    frequenciaSincronizacao: normalizarFrequencia(
      objeto.frequencia_sincronizacao,
    ),
    fusoHorario: textoOuNull(objeto.fuso_horario),
    idioma: textoOuNull(objeto.idioma),
    mensagensAutomaticas: objeto.mensagens_automaticas === true,
    modoUso: normalizarModoUso(objeto.modo_uso),
    nomePublico:
      textoOuNull(objeto.nome_publico) ?? textoOuNull(objeto.nome_interno),
    nomeRemetente: textoOuNull(objeto.nome_remetente),
    numeroPublico: textoOuNull(objeto.numero_publico),
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

function normalizarModoUso(
  valor: JsonValue | undefined,
): ModoUsoIntegracao | null {
  const modos: ModoUsoIntegracao[] = [
    "hospedex",
    "conta_propria",
    "smtp_proprio",
    "google_calendar",
    "ical",
    "automatico",
    "manual",
  ];

  return typeof valor === "string" &&
    modos.includes(valor as ModoUsoIntegracao)
    ? (valor as ModoUsoIntegracao)
    : null;
}
