import type {
  PropertyRow,
  ReservationChargeRow,
  ReservationExtraServiceRow,
  ReservationGuestRow,
  ReservationNoteRow,
  ReservationPaymentRow,
  ReservationPaymentStatus,
  ReservationRow,
  ReservationStatus,
  ReservationStatusHistoryRow,
  TransactionRow
} from "@hospedex/types";

/**
 * Contratos do módulo de Reservas.
 *
 * A tela trabalha com objetos já montados por tenant para evitar que componentes
 * espalhem regras de relacionamento, status e multi-tenant.
 */

export type FiltrosReservas = {
  aba?: AbaReservas;
  busca?: string;
  origem?: ReservationRow["source"] | "todos";
  pagamento?: StatusPagamentoReserva | "todos";
  propriedadeId?: string;
  dataInicio?: string;
  dataFim?: string;
  status?: ReservationStatus | "todos";
};

export type AbaReservas =
  | "todas"
  | "solicitacoes"
  | "aguardando-pagamento"
  | "confirmadas"
  | "em-hospedagem"
  | "finalizadas"
  | "canceladas";

export type StatusPagamentoReserva = ReservationPaymentStatus;

export type ReservaComRelacionamentos = ReservationRow & {
  propriedade: PropertyRow | null;
  hospedes: ReservationGuestRow[];
  historico: ReservationStatusHistoryRow[];
  cobrancas: ReservationChargeRow[];
  pagamentos: ReservationPaymentRow[];
  lancamentosFinanceiros: TransactionRow[];
  statusPagamento: StatusPagamentoReserva;
  servicosExtras: ReservationExtraServiceRow[];
  observacoes: ReservationNoteRow[];
  valorServicosExtras: number;
  valorTotalComExtras: number;
};

export type DadosModuloReservas = {
  filtros: FiltrosReservas;
  podeGerenciar: boolean;
  podeGerenciarPagamento: boolean;
  propriedades: PropertyRow[];
  reservas: ReservaComRelacionamentos[];
  resumo: {
    pendentes: number;
    confirmadas: number;
    hospedadas: number;
    concluidas: number;
    canceladas: number;
    pagamentosPendentes: number;
    pagamentosRecebidos: number;
  };
};

export type SearchParamsReservas = {
  sucesso?: string | undefined;
  erro?: string | undefined;
};

export const STATUS_RESERVA: ReservationStatus[] = [
  "pending",
  "awaiting_payment",
  "confirmed",
  "checked_in",
  "checked_out",
  "completed",
  "cancelled"
];

export const ABAS_RESERVAS: Array<{
  key: AbaReservas;
  label: string;
  status: ReservationStatus | "todos";
}> = [
  {
    key: "todas",
    label: "Todas",
    status: "todos"
  },
  {
    key: "solicitacoes",
    label: "Solicitações",
    status: "pending"
  },
  {
    key: "aguardando-pagamento",
    label: "Aguardando pagamento",
    status: "awaiting_payment"
  },
  {
    key: "confirmadas",
    label: "Confirmadas",
    status: "confirmed"
  },
  {
    key: "em-hospedagem",
    label: "Em hospedagem",
    status: "checked_in"
  },
  {
    key: "finalizadas",
    label: "Finalizadas",
    status: "completed"
  },
  {
    key: "canceladas",
    label: "Canceladas",
    status: "cancelled"
  }
];

export const ORIGENS_RESERVA: Array<ReservationRow["source"]> = [
  "marketplace",
  "manual",
  "direct",
  "external"
];

export const STATUS_PAGAMENTO_RESERVA: StatusPagamentoReserva[] = [
  "pending",
  "partial",
  "paid",
  "received",
  "overdue",
  "cancelled",
  "refunded"
];

export const LABEL_STATUS_RESERVA: Record<ReservationStatus, string> = {
  pending: "Pendente",
  awaiting_payment: "Aguardando pagamento",
  confirmed: "Confirmada",
  checked_in: "Hospedado",
  checked_out: "Check-out realizado",
  completed: "Concluída",
  cancelled: "Cancelada"
};

export const LABEL_ORIGEM_RESERVA: Record<ReservationRow["source"], string> = {
  direct: "Canal direto",
  external: "Outro canal",
  manual: "Manual",
  marketplace: "Marketplace"
};

export const LABEL_STATUS_PAGAMENTO_RESERVA: Record<StatusPagamentoReserva, string> = {
  cancelled: "Pagamento cancelado",
  overdue: "Pagamento atrasado",
  paid: "Pagamento quitado",
  partial: "Pagamento parcial",
  received: "Pagamento recebido",
  pending: "Pagamento pendente",
  refunded: "Pagamento estornado"
};

export function obterVariantStatusPagamentoReserva(status: StatusPagamentoReserva) {
  if (status === "received" || status === "paid") return "success";
  if (status === "partial") return "info";
  if (status === "pending") return "info";
  if (status === "refunded" || status === "overdue") return "warning";
  return "secondary";
}

export function obterVariantStatusReserva(status: ReservationStatus) {
  if (status === "confirmed" || status === "checked_in" || status === "completed") {
    return "success";
  }

  if (status === "awaiting_payment" || status === "checked_out") return "info";
  if (status === "cancelled") return "warning";
  return "secondary";
}
