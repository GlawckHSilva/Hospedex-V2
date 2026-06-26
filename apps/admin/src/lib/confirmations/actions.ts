"use server";

import type {
  CleaningTaskRow,
  CleaningTaskStatus,
  ReservationRow,
  ReservationStatus
} from "@hospedex/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirAutenticacao } from "../auth/context";
import type { ContextoAutenticacao } from "../auth/types";
import { criarClienteSupabaseServer } from "../supabase/server";
import {
  podeGerenciarLimpezaDiaria,
  podeGerenciarOperacaoDiaria
} from "./data";

const CAMINHO_CONFIRMACOES = "/confirmacoes";

class ErroConfirmacao extends Error {}

type EscopoConfirmacao = {
  contexto: ContextoAutenticacao;
  ownerId: string;
  tenantId: string;
  userId: string;
};

export async function confirmarCheckInConfirmacaoAction(formData: FormData) {
  await alterarStatusReservaOperacional(formData, {
    motivoPadrao: "Check-in confirmado pela operacao diaria.",
    statusAtualPermitido: "confirmed",
    statusDestino: "checked_in",
    sucesso: "checkin-confirmado"
  });
}

export async function confirmarCheckOutConfirmacaoAction(formData: FormData) {
  await alterarStatusReservaOperacional(formData, {
    motivoPadrao: "Check-out confirmado pela operacao diaria.",
    statusAtualPermitido: "checked_in",
    statusDestino: "checked_out",
    sucesso: "checkout-confirmado"
  });
}

export async function confirmarPagamentoConfirmacaoAction(formData: FormData) {
  await alterarStatusReservaOperacional(formData, {
    motivoPadrao: "Pagamento confirmado pela operacao diaria.",
    statusAtualPermitido: "awaiting_payment",
    statusDestino: "confirmed",
    sucesso: "pagamento-confirmado"
  });
}

export async function cancelarReservaConfirmacaoAction(formData: FormData) {
  const escopo = await carregarEscopoOperacao();

  try {
    const supabase = await criarClienteSupabaseServer();
    const reserva = await carregarReserva(supabase, escopo, textoObrigatorio(formData, "reservaId", "reserva"));
    const observacao = textoOpcional(formData, "observacao");

    if (["cancelled", "completed"].includes(reserva.status)) {
      throw new ErroConfirmacao("Reserva ja encerrada.");
    }

    await atualizarReserva(supabase, escopo, reserva, "cancelled", observacao ?? "Reserva cancelada pela operacao diaria.");
    revalidarConfirmacoes();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao cancelar reserva.");
  }

  redirect(`${CAMINHO_CONFIRMACOES}?sucesso=reserva-cancelada`);
}

export async function confirmarLimpezaConfirmacaoAction(formData: FormData) {
  const escopo = await carregarEscopoLimpeza();

  try {
    const supabase = await criarClienteSupabaseServer();
    const tarefa = await carregarTarefaLimpeza(supabase, escopo, textoObrigatorio(formData, "tarefaId", "tarefa"));
    const observacao = textoOpcional(formData, "observacao");

    if (tarefa.status === "completed") {
      throw new ErroConfirmacao("Limpeza ja concluida.");
    }

    await atualizarTarefaLimpeza(supabase, escopo, tarefa, "completed", observacao);
    revalidarConfirmacoes();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao confirmar limpeza.");
  }

  redirect(`${CAMINHO_CONFIRMACOES}?sucesso=limpeza-confirmada`);
}

async function alterarStatusReservaOperacional(
  formData: FormData,
  regra: {
    motivoPadrao: string;
    statusAtualPermitido: ReservationStatus;
    statusDestino: ReservationStatus;
    sucesso: string;
  }
) {
  const escopo = await carregarEscopoOperacao();

  try {
    const supabase = await criarClienteSupabaseServer();
    const reserva = await carregarReserva(supabase, escopo, textoObrigatorio(formData, "reservaId", "reserva"));
    const observacao = textoOpcional(formData, "observacao");

    if (reserva.status !== regra.statusAtualPermitido) {
      throw new ErroConfirmacao("Status atual da reserva nao permite esta confirmacao.");
    }

    await atualizarReserva(supabase, escopo, reserva, regra.statusDestino, observacao ?? regra.motivoPadrao);
    revalidarConfirmacoes();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao confirmar reserva.");
  }

  redirect(`${CAMINHO_CONFIRMACOES}?sucesso=${regra.sucesso}`);
}

async function carregarEscopoOperacao(): Promise<EscopoConfirmacao> {
  const contexto = await exigirAutenticacao();

  if (!contexto.tenant) {
    redirect(
      contexto.role === "super_admin"
        ? "/super-admin"
        : "/sem-acesso?motivo=tenant-nao-encontrado"
    );
  }

  if (!contexto.featureFlags.confirmations) {
    redirect("/sem-acesso?motivo=feature-flag-desabilitada");
  }

  if (!podeGerenciarOperacaoDiaria(contexto)) {
    redirect("/sem-acesso?motivo=permissao-insuficiente");
  }

  return criarEscopo(contexto);
}

async function carregarEscopoLimpeza(): Promise<EscopoConfirmacao> {
  const contexto = await exigirAutenticacao();

  if (!contexto.tenant) {
    redirect(
      contexto.role === "super_admin"
        ? "/super-admin"
        : "/sem-acesso?motivo=tenant-nao-encontrado"
    );
  }

  if (!contexto.featureFlags.confirmations) {
    redirect("/sem-acesso?motivo=feature-flag-desabilitada");
  }

  if (!podeGerenciarLimpezaDiaria(contexto)) {
    redirect("/sem-acesso?motivo=permissao-insuficiente");
  }

  return criarEscopo(contexto);
}

function criarEscopo(contexto: ContextoAutenticacao): EscopoConfirmacao {
  return {
    contexto,
    ownerId: contexto.tenant!.owner_id,
    tenantId: contexto.tenant!.id,
    userId: contexto.userId
  };
}

async function carregarReserva(
  supabase: Awaited<ReturnType<typeof criarClienteSupabaseServer>>,
  escopo: EscopoConfirmacao,
  reservaId: string
) {
  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .eq("id", reservaId)
    .eq("tenant_id", escopo.tenantId)
    .eq("owner_id", escopo.ownerId)
    .maybeSingle<ReservationRow>();

  if (error || !data) throw new ErroConfirmacao("Reserva nao encontrada para este tenant.");
  return data;
}

async function carregarTarefaLimpeza(
  supabase: Awaited<ReturnType<typeof criarClienteSupabaseServer>>,
  escopo: EscopoConfirmacao,
  tarefaId: string
) {
  const { data, error } = await supabase
    .from("cleaning_tasks")
    .select("*")
    .eq("id", tarefaId)
    .eq("tenant_id", escopo.tenantId)
    .eq("owner_id", escopo.ownerId)
    .maybeSingle<CleaningTaskRow>();

  if (error || !data) throw new ErroConfirmacao("Tarefa de limpeza nao encontrada.");
  return data;
}

async function atualizarReserva(
  supabase: Awaited<ReturnType<typeof criarClienteSupabaseServer>>,
  escopo: EscopoConfirmacao,
  reserva: ReservationRow,
  statusDestino: ReservationStatus,
  motivo: string
) {
  const agora = new Date().toISOString();
  const dados: Partial<ReservationRow> = { status: statusDestino };

  if (statusDestino === "checked_in") dados.checked_in_at = agora;
  if (statusDestino === "checked_out") dados.checked_out_at = agora;
  if (statusDestino === "cancelled") {
    dados.cancelled_at = agora;
    dados.cancelled_by = escopo.userId;
    dados.cancellation_reason = motivo;
  }

  const { error } = await supabase
    .from("reservations")
    .update(dados)
    .eq("id", reserva.id)
    .eq("tenant_id", escopo.tenantId)
    .eq("owner_id", escopo.ownerId);

  if (error) throw new Error(error.message);

  await supabase.from("reservation_status_history").insert({
    changed_by: escopo.userId,
    from_status: reserva.status,
    metadata: { origem: "confirmacoes" },
    reason: motivo,
    reservation_id: reserva.id,
    tenant_id: escopo.tenantId,
    to_status: statusDestino
  });

  await inserirNotaReserva(supabase, escopo, reserva.id, motivo);
}

async function atualizarTarefaLimpeza(
  supabase: Awaited<ReturnType<typeof criarClienteSupabaseServer>>,
  escopo: EscopoConfirmacao,
  tarefa: CleaningTaskRow,
  status: CleaningTaskStatus,
  observacao: string | null
) {
  const agora = new Date().toISOString();
  const nota = observacao ?? "Limpeza concluida pela operacao diaria.";
  const { error } = await supabase
    .from("cleaning_tasks")
    .update({
      completed_at: agora,
      completed_by: escopo.userId,
      notes: tarefa.notes ? `${tarefa.notes}\n${nota}` : nota,
      status
    })
    .eq("id", tarefa.id)
    .eq("tenant_id", escopo.tenantId);

  if (error) throw new Error(error.message);

  if (tarefa.reservation_id) {
    await inserirNotaReserva(supabase, escopo, tarefa.reservation_id, nota);
  }
}

async function inserirNotaReserva(
  supabase: Awaited<ReturnType<typeof criarClienteSupabaseServer>>,
  escopo: EscopoConfirmacao,
  reservaId: string,
  conteudo: string
) {
  const { error } = await supabase.from("reservation_notes").insert({
    content: conteudo,
    created_by: escopo.userId,
    note_type: "system",
    reservation_id: reservaId,
    tenant_id: escopo.tenantId
  });

  if (error) throw new Error(error.message);
}

function textoObrigatorio(formData: FormData, chave: string, label: string): string {
  const valor = formData.get(chave)?.toString().trim();
  if (!valor) throw new ErroConfirmacao(`Informe ${label}.`);
  return valor;
}

function textoOpcional(formData: FormData, chave: string): string | null {
  const valor = formData.get(chave)?.toString().trim();
  return valor ? valor : null;
}

function redirecionarComErro(erro: unknown, mensagemLog: string): never {
  const mensagem =
    erro instanceof ErroConfirmacao ? erro.message : "Nao foi possivel concluir a operacao.";

  if (!(erro instanceof ErroConfirmacao)) {
    console.error(mensagemLog, erro);
  }

  redirect(`${CAMINHO_CONFIRMACOES}?erro=${encodeURIComponent(mensagem)}`);
}

function revalidarConfirmacoes() {
  revalidatePath(CAMINHO_CONFIRMACOES);
  revalidatePath("/reservas");
  revalidatePath("/calendario");
  revalidatePath("/limpeza");
}

