import type { IntegrationProvider, IntegrationStatus } from "@hospedex/types";

/**
 * Contratos da Central de Integracoes.
 *
 * A configuracao publica nunca recebe tokens ou chaves. Esses dados pertencem
 * ao backend e ao ambiente seguro quando cada conector for implementado.
 */

export type FrequenciaSincronizacao = "manual" | "hourly" | "daily";

export type ModoUsoIntegracao =
  | "hospedex"
  | "conta_propria"
  | "smtp_proprio"
  | "google_calendar"
  | "ical"
  | "automatico"
  | "manual";

export type ConfiguracaoPublicaIntegracao = {
  ativaPeloProprietario: boolean;
  cidade: string | null;
  formatoData: string | null;
  frequenciaSincronizacao: FrequenciaSincronizacao;
  fusoHorario: string | null;
  idioma: string | null;
  mensagensAutomaticas: boolean;
  modoUso: ModoUsoIntegracao | null;
  nomePublico: string | null;
  nomeRemetente: string | null;
  numeroPublico: string | null;
};

export type OpcaoUsoIntegracao = {
  descricao: string;
  label: string;
  valor: ModoUsoIntegracao;
};

export type DefinicaoIntegracao = {
  categoria: string;
  descricao: string;
  futura: boolean;
  nome: string;
  opcoesUso: readonly OpcaoUsoIntegracao[];
  provider: IntegrationProvider;
  sincronizavel: boolean;
};

export type IntegracaoGerenciamento = DefinicaoIntegracao & {
  ativa: boolean;
  configuracao: ConfiguracaoPublicaIntegracao;
  configuradaEm: string | null;
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
    configuradas: number;
    pendentes: number;
    total: number;
  };
  tenantNome: string;
};

export type SearchParamsIntegracoes = {
  erro?: string | undefined;
  sucesso?: string | undefined;
};
