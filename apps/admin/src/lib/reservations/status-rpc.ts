import type { ReservationRow, ReservationStatus } from "@hospedex/types";

import type { criarClienteSupabaseServer } from "../supabase/server";

type ClienteSupabaseServer = Awaited<ReturnType<typeof criarClienteSupabaseServer>>;

type EscopoStatusOperacional = {
  ownerId: string;
  tenantId: string;
  userId: string;
};

/**
 * Centraliza a transicao operacional de status da reserva.
 *
 * Check-in, check-out e conclusao precisam atualizar status, datas e timeline
 * juntos. A RPC garante atomicidade no banco e evita divergencia entre Reservas,
 * Confirmacoes, Calendario e Area do Hospede.
 */
export async function alterarStatusReservaOperacionalSeguro({
  escopo,
  motivo,
  reserva,
  statusDestino,
  supabase
}: {
  escopo: EscopoStatusOperacional;
  motivo: string;
  reserva: Pick<ReservationRow, "id">;
  statusDestino: Extract<ReservationStatus, "checked_in" | "checked_out" | "completed">;
  supabase: ClienteSupabaseServer;
}) {
  const { error } = await supabase.rpc("set_reservation_status_operational", {
    p_owner_id: escopo.ownerId,
    p_reason: motivo,
    p_reservation_id: reserva.id,
    p_target_status: statusDestino,
    p_tenant_id: escopo.tenantId,
    p_user_id: escopo.userId
  });

  if (error) {
    throw new Error(traduzirErroStatusOperacional(error.message));
  }
}

function traduzirErroStatusOperacional(mensagemBanco: string) {
  const mensagem = mensagemBanco.toLocaleLowerCase("pt-BR");

  if (mensagem.includes("permissao") || mensagem.includes("permission")) {
    return "Voce nao tem permissao para alterar esta reserva.";
  }

  if (mensagem.includes("nao encontrada")) {
    return "Reserva nao encontrada.";
  }

  if (mensagem.includes("encerrada")) {
    return "Reserva encerrada nao permite alterar status.";
  }

  if (mensagem.includes("transicao") || mensagem.includes("invalida")) {
    return "Transicao de status invalida para esta reserva.";
  }

  return "Nao foi possivel alterar o status da reserva.";
}
