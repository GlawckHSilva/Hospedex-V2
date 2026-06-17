import type {
  CleaningTaskRow,
  CleaningTaskStatus,
  ProfileRow,
  PropertyRow,
  ReservationGuestRow,
  ReservationRow,
  UnitRow
} from "@hospedex/types";

/**
 * Contratos do fluxo operacional de check-in, check-out e limpeza.
 *
 * O modulo trabalha com dados ja isolados por tenant para manter a UI simples e
 * concentrar regras de permissao, feature flag e multi-tenant no servidor.
 */

export type ReservaOperacional = ReservationRow & {
  propriedade: PropertyRow | null;
  unidade: UnitRow | null;
  hospedePrincipal: ReservationGuestRow | null;
};

export type TarefaLimpezaCompleta = CleaningTaskRow & {
  propriedade: PropertyRow | null;
  unidade: UnitRow | null;
  reserva: ReservationRow | null;
  responsavel: ProfileRow | null;
};

export type DadosModuloLimpeza = {
  checkInsHoje: ReservaOperacional[];
  checkOutsHoje: ReservaOperacional[];
  hoje: string;
  limpezaAtiva: boolean;
  podeGerenciarLimpeza: boolean;
  podeGerenciarOperacao: boolean;
  propriedades: PropertyRow[];
  responsaveis: ProfileRow[];
  sucesso?: string | undefined;
  tarefas: TarefaLimpezaCompleta[];
  tenantNome: string;
  unidades: UnitRow[];
};

export type SearchParamsLimpeza = {
  sucesso?: string | undefined;
  erro?: string | undefined;
};

export const STATUS_TAREFA_LIMPEZA: CleaningTaskStatus[] = [
  "awaiting_cleaning",
  "in_cleaning",
  "completed",
  "cancelled"
];

export const LABEL_STATUS_TAREFA_LIMPEZA: Record<CleaningTaskStatus, string> = {
  awaiting_cleaning: "Aguardando limpeza",
  in_cleaning: "Em limpeza",
  completed: "Concluida",
  cancelled: "Cancelada"
};
