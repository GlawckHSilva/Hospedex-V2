import type {
  PropertyRow,
  ReservationExtraServiceRow,
  ReservationGuestRow,
  ReservationNoteRow,
  ReservationRow,
  ReservationStatus,
  ReservationStatusHistoryRow,
  UnitRow
} from "@hospedex/types";

/**
 * Contratos do módulo de Reservas.
 *
 * A tela trabalha com objetos já montados por tenant para evitar que componentes
 * espalhem regras de relacionamento, status e multi-tenant.
 */

export type FiltrosReservas = {
  busca?: string;
  propriedadeId?: string;
  unidadeId?: string;
  dataInicio?: string;
  dataFim?: string;
  status?: ReservationStatus | "todos";
};

export type ReservaComRelacionamentos = ReservationRow & {
  propriedade: PropertyRow | null;
  unidade: UnitRow | null;
  hospedes: ReservationGuestRow[];
  historico: ReservationStatusHistoryRow[];
  servicosExtras: ReservationExtraServiceRow[];
  observacoes: ReservationNoteRow[];
  valorServicosExtras: number;
  valorTotalComExtras: number;
};

export type DadosModuloReservas = {
  filtros: FiltrosReservas;
  podeGerenciar: boolean;
  propriedades: PropertyRow[];
  reservas: ReservaComRelacionamentos[];
  resumo: {
    pendentes: number;
    confirmadas: number;
    hospedadas: number;
    canceladas: number;
  };
  unidades: UnitRow[];
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

export const LABEL_STATUS_RESERVA: Record<ReservationStatus, string> = {
  pending: "Pendente",
  awaiting_payment: "Aguardando pagamento",
  confirmed: "Confirmada",
  checked_in: "Hospedado",
  checked_out: "Check-out realizado",
  completed: "Concluída",
  cancelled: "Cancelada"
};

export function obterVariantStatusReserva(status: ReservationStatus) {
  if (status === "confirmed" || status === "checked_in" || status === "completed") {
    return "success";
  }

  if (status === "awaiting_payment" || status === "checked_out") return "info";
  if (status === "cancelled") return "warning";
  return "secondary";
}
