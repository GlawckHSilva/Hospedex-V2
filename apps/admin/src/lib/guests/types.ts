import type {
  CrmGuestRating,
  CrmGuestRow,
  CrmGuestStatus,
  PropertyRow,
  ReservationGuestRow,
  ReservationNoteRow,
  ReservationRow,
  ReservationStatusHistoryRow
} from "@hospedex/types";

/**
 * Contratos do modulo de Hospedes e CRM.
 *
 * Os componentes recebem perfis ja consolidados por tenant para evitar que a UI
 * replique regras de busca, historico, receita e isolamento multi-tenant.
 */

export type FiltrosHospedes = {
  busca?: string;
  status?: CrmGuestStatus | "todos";
};

export type ReservaHospede = ReservationRow & {
  propriedade: PropertyRow | null;
  historico: ReservationStatusHistoryRow[];
  observacoes: ReservationNoteRow[];
};

export type HospedeCrmCompleto = CrmGuestRow & {
  reservas: ReservaHospede[];
  timeline: EventoTimelineHospede[];
  metricas: {
    quantidadeReservas: number;
    valorTotalGasto: number;
    ultimaHospedagem: string | null;
    proximaHospedagem: string | null;
    cancelamentos: number;
    checkIns: number;
    checkOuts: number;
  };
};

export type EventoTimelineHospede = {
  id: string;
  data: string;
  titulo: string;
  detalhe: string;
};

export type DadosModuloHospedes = {
  filtros: FiltrosHospedes;
  hospedes: HospedeCrmCompleto[];
  podeGerenciar: boolean;
  resumo: {
    total: number;
    ativos: number;
    atencao: number;
    bloqueados: number;
  };
  tenantNome: string;
};

export type SearchParamsHospedes = {
  sucesso?: string | undefined;
  erro?: string | undefined;
};

export const STATUS_HOSPEDE_CRM: Array<CrmGuestStatus | "todos"> = [
  "todos",
  "active",
  "blocked"
];

export const AVALIACOES_HOSPEDE_CRM: CrmGuestRating[] = [
  "excellent",
  "good",
  "neutral",
  "attention",
  "blocked"
];

export const LABEL_STATUS_HOSPEDE_CRM: Record<CrmGuestStatus | "todos", string> = {
  todos: "Todos",
  active: "Ativo",
  blocked: "Bloqueado",
  deleted: "Excluido"
};

export const LABEL_AVALIACAO_HOSPEDE_CRM: Record<CrmGuestRating, string> = {
  excellent: "Excelente",
  good: "Bom",
  neutral: "Neutro",
  attention: "Atencao",
  blocked: "Bloqueado"
};

export type EntradaHospedeCrm = {
  birthDate: string | null;
  city: string | null;
  documentNumber: string | null;
  email: string | null;
  fullName: string;
  internalRating: CrmGuestRating;
  phone: string | null;
  privateNotes: string | null;
  state: string | null;
};

export type ChaveHospedeReserva = Pick<
  ReservationGuestRow,
  "document_number" | "email" | "full_name" | "phone"
>;
