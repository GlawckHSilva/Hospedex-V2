"use server";

import type { CleaningTaskStatus, ReservationRow, ReservationStatus } from "@hospedex/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { criarClienteSupabaseServer } from "../supabase/server";
import {
  carregarEscopoLimpeza,
  carregarEscopoOperacao,
  carregarPropriedadeLimpeza,
  carregarReservaOperacional,
  carregarTarefaLimpeza,
  ErroRegraLimpeza,
  type ClienteSupabaseServer,
  type EscopoLimpeza
} from "./permissions";
import { STATUS_TAREFA_LIMPEZA } from "./types";

/**
 * Server actions de check-in, check-out e limpeza.
 *
 * Mudancas de reserva e tarefas operacionais ficam no servidor para garantir
 * tenant correto, responsavel auditavel e timeline consistente.
 */

const CAMINHO_LIMPEZA = "/limpeza";

type EntradaTarefaLimpeza = {
  assignedTo: string | null;
  notes: string | null;
  propertyId: string;
  reservationId: string | null;
  scheduledFor: string | null;
  status: CleaningTaskStatus;
  title: string;
};

export async function confirmarCheckInAction(formData: FormData) {
  const escopo = await carregarEscopoOperacao();

  try {
    const supabase = await criarClienteSupabaseServer();
    const reserva = await carregarReservaOperacional(
      supabase,
      escopo,
      textoObrigatorio(formData, "reservaId", "reserva")
    );
    const observacao = textoOpcional(formData, "observacao");

    if (reserva.status !== "confirmed") {
      throw new ErroRegraLimpeza("Apenas reservas confirmadas podem fazer check-in.");
    }

    await atualizarStatusReservaOperacional(
      supabase,
      escopo,
      reserva,
      "checked_in",
      "Check-in confirmado manualmente.",
      observacao
    );
    revalidarOperacao();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao confirmar check-in.");
  }

  redirect(`${CAMINHO_LIMPEZA}?sucesso=checkin-confirmado`);
}

export async function confirmarCheckOutAction(formData: FormData) {
  const escopo = await carregarEscopoOperacao();

  try {
    const supabase = await criarClienteSupabaseServer();
    const reserva = await carregarReservaOperacional(
      supabase,
      escopo,
      textoObrigatorio(formData, "reservaId", "reserva")
    );
    const observacao = textoOpcional(formData, "observacao");

    if (reserva.status !== "checked_in") {
      throw new ErroRegraLimpeza("Apenas reservas hospedadas podem fazer check-out.");
    }

    await atualizarStatusReservaOperacional(
      supabase,
      escopo,
      reserva,
      "checked_out",
      "Check-out confirmado manualmente.",
      observacao
    );

    if (escopo.contexto.featureFlags.cleaning) {
      await criarTarefaCheckout(supabase, escopo, reserva, observacao);
    }

    revalidarOperacao();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao confirmar check-out.");
  }

  redirect(`${CAMINHO_LIMPEZA}?sucesso=checkout-confirmado`);
}

export async function criarTarefaLimpezaAction(formData: FormData) {
  const escopo = await carregarEscopoLimpeza();

  try {
    const supabase = await criarClienteSupabaseServer();
    const entrada = await obterEntradaTarefa(supabase, escopo, formData);

    const { error } = await supabase.from("cleaning_tasks").insert({
      tenant_id: escopo.tenantId,
      owner_id: escopo.ownerId,
      property_id: entrada.propertyId,
      reservation_id: entrada.reservationId,
      assigned_to: entrada.assignedTo,
      source: "manual",
      status: entrada.status,
      title: entrada.title,
      notes: entrada.notes,
      scheduled_for: entrada.scheduledFor,
      completed_at: entrada.status === "completed" ? new Date().toISOString() : null,
      completed_by: entrada.status === "completed" ? escopo.userId : null,
      created_by: escopo.userId
    });

    if (error) throw new Error(error.message);
    if (entrada.reservationId) {
      await registrarNotaReserva(supabase, escopo, entrada.reservationId, "Tarefa de limpeza criada.");
    }
    revalidarOperacao();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao criar tarefa de limpeza.");
  }

  redirect(`${CAMINHO_LIMPEZA}?sucesso=tarefa-criada`);
}

export async function atualizarTarefaLimpezaAction(formData: FormData) {
  const escopo = await carregarEscopoLimpeza();

  try {
    const supabase = await criarClienteSupabaseServer();
    const tarefaId = textoObrigatorio(formData, "tarefaId", "tarefa");
    await carregarTarefaLimpeza(supabase, escopo, tarefaId);
    const entrada = await obterEntradaTarefa(supabase, escopo, formData);

    const { error } = await supabase
      .from("cleaning_tasks")
      .update({
        property_id: entrada.propertyId,
        reservation_id: entrada.reservationId,
        assigned_to: entrada.assignedTo,
        status: entrada.status,
        title: entrada.title,
        notes: entrada.notes,
        scheduled_for: entrada.scheduledFor,
        completed_at: entrada.status === "completed" ? new Date().toISOString() : null,
        completed_by: entrada.status === "completed" ? escopo.userId : null
      })
      .eq("id", tarefaId)
      .eq("tenant_id", escopo.tenantId);

    if (error) throw new Error(error.message);
    if (entrada.reservationId) {
      await registrarNotaReserva(supabase, escopo, entrada.reservationId, "Tarefa de limpeza atualizada.");
    }
    revalidarOperacao();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao atualizar tarefa de limpeza.");
  }

  redirect(`${CAMINHO_LIMPEZA}?sucesso=tarefa-atualizada`);
}

export async function alterarStatusTarefaLimpezaAction(formData: FormData) {
  const escopo = await carregarEscopoLimpeza();

  try {
    const supabase = await criarClienteSupabaseServer();
    const tarefaId = textoObrigatorio(formData, "tarefaId", "tarefa");
    const status = validarStatusLimpeza(textoObrigatorio(formData, "status", "status"));
    const tarefa = await carregarTarefaLimpeza(supabase, escopo, tarefaId);

    const { error } = await supabase
      .from("cleaning_tasks")
      .update({
        status,
        completed_at: status === "completed" ? new Date().toISOString() : tarefa.completed_at,
        completed_by: status === "completed" ? escopo.userId : tarefa.completed_by
      })
      .eq("id", tarefa.id)
      .eq("tenant_id", escopo.tenantId);

    if (error) throw new Error(error.message);
    if (tarefa.reservation_id) {
      await registrarNotaReserva(
        supabase,
        escopo,
        tarefa.reservation_id,
        `Status da limpeza alterado para ${status}.`
      );
    }
    revalidarOperacao();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao alterar status da limpeza.");
  }

  redirect(`${CAMINHO_LIMPEZA}?sucesso=status-limpeza`);
}

async function obterEntradaTarefa(
  supabase: ClienteSupabaseServer,
  escopo: EscopoLimpeza,
  formData: FormData
): Promise<EntradaTarefaLimpeza> {
  const propertyId = textoObrigatorio(formData, "propertyId", "propriedade");
  const reservationId = textoOpcional(formData, "reservationId");

  await carregarPropriedadeLimpeza(supabase, escopo, propertyId);
  if (reservationId) await carregarReservaOperacional(supabase, escopo, reservationId);

  return {
    assignedTo: textoOpcional(formData, "assignedTo"),
    notes: textoOpcional(formData, "notes"),
    propertyId,
    reservationId,
    scheduledFor: dataOpcional(formData, "scheduledFor"),
    status: validarStatusLimpeza(textoObrigatorio(formData, "status", "status")),
    title: textoObrigatorio(formData, "title", "titulo")
  };
}

async function atualizarStatusReservaOperacional(
  supabase: ClienteSupabaseServer,
  escopo: EscopoLimpeza,
  reserva: ReservationRow,
  statusDestino: ReservationStatus,
  motivo: string,
  observacao: string | null
) {
  const agora = new Date().toISOString();
  const dados: Record<string, string> = { status: statusDestino };
  if (statusDestino === "checked_in") dados.checked_in_at = agora;
  if (statusDestino === "checked_out") dados.checked_out_at = agora;

  const { error } = await supabase
    .from("reservations")
    .update(dados)
    .eq("id", reserva.id)
    .eq("tenant_id", escopo.tenantId)
    .eq("owner_id", escopo.ownerId);

  if (error) throw new Error(error.message);

  await supabase.from("reservation_status_history").insert({
    tenant_id: escopo.tenantId,
    reservation_id: reserva.id,
    from_status: reserva.status,
    to_status: statusDestino,
    changed_by: escopo.userId,
    reason: observacao ?? motivo,
    metadata: { origem: "limpeza_operacional" }
  });

  await registrarNotaReserva(supabase, escopo, reserva.id, observacao ?? motivo);
}

async function criarTarefaCheckout(
  supabase: ClienteSupabaseServer,
  escopo: EscopoLimpeza,
  reserva: ReservationRow,
  observacao: string | null
) {
  const { data: existente, error: erroBusca } = await supabase
    .from("cleaning_tasks")
    .select("*")
    .eq("tenant_id", escopo.tenantId)
    .eq("reservation_id", reserva.id)
    .neq("status", "cancelled")
    .limit(1)
    .maybeSingle();

  if (erroBusca) throw new Error(erroBusca.message);
  if (existente) return;

  const { error } = await supabase.from("cleaning_tasks").insert({
    tenant_id: escopo.tenantId,
    owner_id: escopo.ownerId,
    property_id: reserva.property_id,
    reservation_id: reserva.id,
    assigned_to: null,
    source: "checkout",
    status: "awaiting_cleaning",
    title: `Limpeza apos check-out ${reserva.code}`,
    notes: observacao,
    scheduled_for: reserva.check_out,
    created_by: escopo.userId
  });

  if (error) throw new Error(error.message);
  await registrarNotaReserva(supabase, escopo, reserva.id, "Tarefa de limpeza criada apos check-out.");
}

async function registrarNotaReserva(
  supabase: ClienteSupabaseServer,
  escopo: EscopoLimpeza,
  reservaId: string,
  conteudo: string
) {
  const { error } = await supabase.from("reservation_notes").insert({
    tenant_id: escopo.tenantId,
    reservation_id: reservaId,
    note_type: "system",
    content: conteudo,
    created_by: escopo.userId
  });

  if (error) throw new Error(error.message);
}

function validarStatusLimpeza(valor: string): CleaningTaskStatus {
  if (STATUS_TAREFA_LIMPEZA.includes(valor as CleaningTaskStatus)) {
    return valor as CleaningTaskStatus;
  }

  throw new ErroRegraLimpeza("Status de limpeza invalido.");
}

function dataOpcional(formData: FormData, chave: string): string | null {
  const valor = textoOpcional(formData, chave);
  if (!valor) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    throw new ErroRegraLimpeza("Informe uma data valida.");
  }
  return valor;
}

function textoObrigatorio(formData: FormData, chave: string, label: string): string {
  const valor = formData.get(chave)?.toString().trim();
  if (!valor) throw new ErroRegraLimpeza(`Informe ${label}.`);
  return valor;
}

function textoOpcional(formData: FormData, chave: string): string | null {
  const valor = formData.get(chave)?.toString().trim();
  return valor ? valor : null;
}

function redirecionarComErro(erro: unknown, mensagemLog: string): never {
  const mensagem =
    erro instanceof ErroRegraLimpeza ? erro.message : "Nao foi possivel concluir a operacao.";

  if (!(erro instanceof ErroRegraLimpeza)) {
    console.error(mensagemLog, erro);
  }

  redirect(`${CAMINHO_LIMPEZA}?erro=${encodeURIComponent(mensagem)}`);
}

function revalidarOperacao() {
  revalidatePath(CAMINHO_LIMPEZA);
  revalidatePath("/reservas");
  revalidatePath("/calendario");
}
