import type {
  ReservationPaymentMethod,
  ReservationPaymentStatus,
  ReservationStatus
} from "@hospedex/types";

export const LABEL_STATUS_RESERVA: Record<ReservationStatus, string> = {
  awaiting_payment: "Aguardando pagamento",
  cancelled: "Cancelada",
  checked_in: "Hospedado",
  checked_out: "Check-out realizado",
  completed: "Concluida",
  confirmed: "Confirmada",
  pending: "Pendente"
};

export const MENSAGEM_STATUS_RESERVA: Partial<Record<ReservationStatus, string>> = {
  cancelled: "Sua reserva foi cancelada.",
  completed: "Estadia concluida.",
  confirmed: "Sua reserva foi confirmada.",
  pending: "Sua solicitacao foi enviada e esta aguardando aprovacao do proprietario."
};

export const LABEL_STATUS_PAGAMENTO: Record<ReservationPaymentStatus, string> = {
  cancelled: "Cancelado",
  overdue: "Atrasado",
  paid: "Pago",
  partial: "Parcial",
  pending: "Pendente",
  received: "Recebido",
  refunded: "Estornado"
};

export const LABEL_FORMA_PAGAMENTO: Record<ReservationPaymentMethod, string> = {
  bank_transfer: "Transferencia bancaria",
  cash: "Dinheiro",
  credit_card: "Cartao de credito",
  debit_card: "Cartao de debito",
  pix: "Pix"
};

export function formatarMoedaHospede(valor: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    maximumFractionDigits: 0,
    style: "currency"
  }).format(valor ?? 0);
}

export function formatarDataHospede(valor: string | null | undefined) {
  if (!valor) return "Nao informado";

  const data = new Date(`${valor}T12:00:00`);
  if (Number.isNaN(data.getTime())) return "Nao informado";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(data);
}

export function formatarDataHoraHospede(valor: string | null | undefined) {
  if (!valor) return "Nao informado";

  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "Nao informado";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo"
  }).format(data);
}

export function tomStatusReserva(status: ReservationStatus) {
  if (status === "confirmed" || status === "checked_in" || status === "completed") {
    return "success" as const;
  }

  if (status === "cancelled") return "danger" as const;
  if (status === "awaiting_payment" || status === "pending") return "warning" as const;

  return "neutral" as const;
}

export function tomStatusPagamento(status: ReservationPaymentStatus) {
  if (status === "paid" || status === "received") return "success" as const;
  if (status === "partial") return "info" as const;
  if (status === "cancelled" || status === "refunded") return "danger" as const;
  return "warning" as const;
}
