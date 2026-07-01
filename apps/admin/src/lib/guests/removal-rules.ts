import type { CrmGuestRow, ReservationGuestRow, ReservationRow } from "@hospedex/types";

/**
 * Regras de remoção do hóspede no CRM do proprietário.
 *
 * Remover do CRM é sempre uma exclusão lógica do vínculo do tenant. A conta
 * pública/global do hóspede e o histórico operacional precisam permanecer
 * preservados para reservas, financeiro, relatórios e auditoria.
 */

type ReservaParaRegra = Pick<
  ReservationRow,
  "check_in" | "check_out" | "payment_status" | "status"
>;

const STATUS_RESERVA_ATIVA = new Set<ReservationRow["status"]>([
  "pending",
  "awaiting_payment",
  "confirmed",
  "checked_in"
]);

const STATUS_PAGAMENTO_PENDENTE = new Set<ReservationRow["payment_status"]>([
  "overdue",
  "partial",
  "pending"
]);

export type ResultadoRemocaoHospedeCrm = {
  motivo: string | null;
  permitida: boolean;
};

export function avaliarRemocaoHospedeCrm(
  reservas: ReservaParaRegra[],
  hoje = new Date().toISOString().slice(0, 10)
): ResultadoRemocaoHospedeCrm {
  const reservasValidas = reservas.filter((reserva) => reserva.status !== "cancelled");

  if (reservasValidas.some((reserva) => STATUS_RESERVA_ATIVA.has(reserva.status))) {
    return {
      motivo: "Este hóspede possui reservas ou pendências vinculadas.",
      permitida: false
    };
  }

  if (
    reservasValidas.some(
      (reserva) => reserva.check_out >= hoje && reserva.status !== "completed"
    )
  ) {
    return {
      motivo: "Não é possível apagar hóspedes com hospedagem futura ou ativa.",
      permitida: false
    };
  }

  if (reservasValidas.some((reserva) => STATUS_PAGAMENTO_PENDENTE.has(reserva.payment_status))) {
    return {
      motivo: "Este hóspede possui pagamento pendente vinculado.",
      permitida: false
    };
  }

  return { motivo: null, permitida: true };
}

export function hospedeReservaCorrespondeAoCrmGuest(
  hospede: Pick<CrmGuestRow, "document_number" | "email" | "full_name" | "phone">,
  chave: Pick<ReservationGuestRow, "document_number" | "email" | "full_name" | "phone">
): boolean {
  return Boolean(
    (hospede.email && chave.email && hospede.email.toLowerCase() === chave.email.toLowerCase()) ||
      (hospede.phone && chave.phone && hospede.phone === chave.phone) ||
      (hospede.document_number &&
        chave.document_number &&
        hospede.document_number === chave.document_number) ||
      (!hospede.email &&
        !hospede.phone &&
        !hospede.document_number &&
        hospede.full_name.toLowerCase() === chave.full_name.toLowerCase())
  );
}
