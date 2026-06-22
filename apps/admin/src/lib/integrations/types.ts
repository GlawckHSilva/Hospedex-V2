import type { IntegrationProvider, IntegrationStatus } from "@hospedex/types";

/**
 * Contratos da Central de Integracoes.
 *
 * A configuracao publica nunca recebe tokens ou chaves. Esses dados pertencem
 * ao backend e ao ambiente seguro quando cada conector for implementado.
 */

export type FrequenciaSincronizacao = "manual" | "hourly" | "daily";

export type ConfiguracaoPublicaIntegracao = {
  frequenciaSincronizacao: FrequenciaSincronizacao;
  nomeInterno: string | null;
  observacoes: string | null;
};

export type DefinicaoIntegracao = {
  categoria: string;
  descricao: string;
  futura: boolean;
  nome: string;
  provider: IntegrationProvider;
  sincronizavel: boolean;
};

export type IntegracaoGerenciamento = DefinicaoIntegracao & {
  configuracao: ConfiguracaoPublicaIntegracao;
  configuradaEm: string | null;
  enabled: boolean;
  id: string | null;
  lastSyncedAt: string | null;
  status: IntegrationStatus;
};

export type DadosCentralIntegracoes = {
  erroCarregamento: string | null;
  integracoes: IntegracaoGerenciamento[];
  podeGerenciar: boolean;
  resumo: {
    ativas: number;
    futuras: number;
    pendentes: number;
    total: number;
  };
  tenantNome: string;
};

export type SearchParamsIntegracoes = {
  erro?: string | undefined;
  sucesso?: string | undefined;
};
