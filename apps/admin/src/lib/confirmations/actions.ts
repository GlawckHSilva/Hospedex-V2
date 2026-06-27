"use server";

import type {
  CleaningTaskRow,
  CleaningTaskStatus,
  ReservationPaymentStatus,
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
import {
  cancelarRecebimentoReserva,
  ErroIntegracaoFinanceira,
  marcarRecebimentoReservaPendente,
  registrarRecebimentoReserva
} from "./finance";
import {
  ErroMensagemWhatsapp,
  prepararMensagemWhatsappReserva,
  registrarMensagemWhatsappAberta,
  registrarMensagemWhatsappCopiada
} from "./whatsapp";

const CAMINHO_CONFIRMACOES = "/confirmacoes";

class ErroConfirmacao extends Error {}

const STATUS_TERMINAIS: ReservationStatus[] = ["cancelled", "completed"];

type EscopoConfirmacao = {
  contexto: ContextoAutenticacao;
  ownerId: string;
  podeGerenciarFinanceiro: boolean;
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
  await alterarPagamentoReservaOperacional(formData, {
    motivoPadrao: "Pagamento marcado como recebido pela operacao diaria.",
    statusDestino: "received",
    sucesso: "pagamento-confirmado"
  });
}

export async function confirmarReservaConfirmacaoAction(formData: FormData) {
  const escopo = await carregarEscopoOperacao();
  let sucesso = "reserva-confirmada";

  try {
    const supabase = await criarClienteSupabaseServer();
    const reserva = await carregarReserva(supabase, escopo, textoObrigatorio(formData, "reservaId", "reserva"));
    const observacao = textoOpcional(formData, "observacao");

    if (STATUS_TERMINAIS.includes(reserva.status)) {
      throw new ErroConfirmacao("Reserva encerrada nao pode ser confirmada.");
    }

    if (!["pending", "awaiting_payment"].includes(reserva.status)) {
      throw new ErroConfirmacao("A reserva ja foi decidida.");
    }

    await confirmarReservaAtomica(
      supabase,
      escopo,
      reserva,
      observacao ?? "Reserva confirmada pela central de confirmacoes."
    );

    try {
      const mensagem = await prepararMensagemWhatsappReserva(
        supabase,
        escopo,
        { ...reserva, status: "confirmed" }
      );
      sucesso = mensagem.requires_manual_review
        ? "reserva-confirmada-whatsapp-revisao"
        : "reserva-confirmada-whatsapp";
    } catch (erroMensagem) {
      /*
        WhatsApp e uma etapa operacional posterior. A reserva ja foi confirmada
        de forma atomica; falha nessa preparacao nao pode desfazer nem mascarar
        o status confirmado e o bloqueio do calendario.
      */
      sucesso = "reserva-confirmada-whatsapp-pendente";
      console.error("Reserva confirmada, mas a mensagem de WhatsApp nao foi preparada.", erroMensagem);
    }

    revalidarConfirmacoes();
  } catch (erro) {
    redirecionarComErro(
      erro,
      "Erro ao confirmar reserva.",
      "Não foi possível confirmar a reserva."
    );
  }

  redirect(`${CAMINHO_CONFIRMACOES}?sucesso=${sucesso}`);
}

export async function marcarPagamentoPendenteConfirmacaoAction(formData: FormData) {
  await alterarPagamentoReservaOperacional(formData, {
    motivoPadrao: "Pagamento marcado como pendente pela operacao diaria.",
    statusDestino: "pending",
    sucesso: "pagamento-pendente"
  });
}

export async function adicionarObservacaoConfirmacaoAction(formData: FormData) {
  const escopo = await carregarEscopoOperacao();

  try {
    const supabase = await criarClienteSupabaseServer();
    const reservaId = textoObrigatorio(formData, "reservaId", "reserva");
    const observacao = textoObrigatorio(formData, "observacao", "observacao");

    await carregarReserva(supabase, escopo, reservaId);
    await inserirNotaReserva(supabase, escopo, reservaId, observacao, "internal");
    revalidarConfirmacoes();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao adicionar observacao.");
  }

  redirect(`${CAMINHO_CONFIRMACOES}?sucesso=observacao-adicionada`);
}

export async function registrarMensagemWhatsappCopiadaAction(mensagemId: string) {
  const escopo = await carregarEscopoOperacao();

  try {
    const supabase = await criarClienteSupabaseServer();
    await registrarMensagemWhatsappCopiada(supabase, escopo, mensagemId);
    revalidarConfirmacoes();
  } catch (erro) {
    if (!(erro instanceof ErroMensagemWhatsapp)) {
      console.error("Erro ao registrar copia da mensagem de WhatsApp.", erro);
    }
  }
}

export async function registrarMensagemWhatsappAbertaAction(mensagemId: string) {
  const escopo = await carregarEscopoOperacao();

  try {
    const supabase = await criarClienteSupabaseServer();
    await registrarMensagemWhatsappAberta(supabase, escopo, mensagemId);
    revalidarConfirmacoes();
  } catch (erro) {
    if (!(erro instanceof ErroMensagemWhatsapp)) {
      console.error("Erro ao registrar abertura do WhatsApp.", erro);
    }
  }
}

export async function cancelarReservaConfirmacaoAction(formData: FormData) {
  const escopo = await carregarEscopoOperacao();

  try {
    const supabase = await criarClienteSupabaseServer();
    const reserva = await carregarReserva(supabase, escopo, textoObrigatorio(formData, "reservaId", "reserva"));
    const observacao = textoOpcional(formData, "observacao");

    if (STATUS_TERMINAIS.includes(reserva.status)) {
      throw new ErroConfirmacao("Reserva ja encerrada.");
    }

    if (reserva.payment_status === "received" && !escopo.podeGerenciarFinanceiro) {
      throw new ErroConfirmacao(
        "Você não tem permissão para cancelar uma reserva com pagamento recebido."
      );
    }

    if (reserva.payment_status === "received") {
      await cancelarRecebimentoReserva(supabase, escopo, reserva, "refunded");
    } else if (escopo.podeGerenciarFinanceiro) {
      await cancelarRecebimentoReserva(supabase, escopo, reserva, "cancelled");
    }

    await atualizarPagamentoReserva(
      supabase,
      escopo,
      reserva,
      "cancelled",
      "Pagamento cancelado junto com a reserva."
    );
    await atualizarReserva(
      supabase,
      escopo,
      reserva,
      "cancelled",
      observacao ?? "Reserva cancelada pela operacao diaria."
    );
    revalidarConfirmacoes();
  } catch (erro) {
    redirecionarComErro(
      erro,
      "Erro ao cancelar reserva.",
      "Não foi possível cancelar a reserva."
    );
  }

  redirect(`${CAMINHO_CONFIRMACOES}?sucesso=reserva-cancelada`);
}

async function alterarPagamentoReservaOperacional(
  formData: FormData,
  regra: {
    motivoPadrao: string;
    statusDestino: ReservationPaymentStatus;
    sucesso: string;
  }
) {
  const escopo = await carregarEscopoOperacao();

  try {
    const supabase = await criarClienteSupabaseServer();
    const reserva = await carregarReserva(supabase, escopo, textoObrigatorio(formData, "reservaId", "reserva"));
    const observacao = textoOpcional(formData, "observacao");

    if (STATUS_TERMINAIS.includes(reserva.status)) {
      throw new ErroConfirmacao("Reserva encerrada nao permite alterar pagamento.");
    }

    if (!escopo.podeGerenciarFinanceiro) {
      throw new ErroConfirmacao(
        "Você não tem permissão para alterar o financeiro desta reserva."
      );
    }

    if (regra.statusDestino === "received") {
      await registrarRecebimentoReserva(supabase, escopo, reserva);
    }

    if (regra.statusDestino === "pending") {
      await marcarRecebimentoReservaPendente(supabase, escopo, reserva);
    }

    await atualizarPagamentoReserva(
      supabase,
      escopo,
      reserva,
      regra.statusDestino,
      observacao ?? regra.motivoPadrao
    );

    if (reserva.status === "awaiting_payment" && regra.statusDestino === "received") {
      await atualizarReserva(
        supabase,
        escopo,
        reserva,
        "confirmed",
        "Reserva confirmada apos pagamento recebido."
      );
    }

    revalidarConfirmacoes();
  } catch (erro) {
    redirecionarComErro(
      erro,
      "Erro ao alterar pagamento da reserva.",
      "Não foi possível alterar o pagamento da reserva."
    );
  }

  redirect(`${CAMINHO_CONFIRMACOES}?sucesso=${regra.sucesso}`);
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
    podeGerenciarFinanceiro: podeGerenciarFinanceiroConfirmacoes(contexto),
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

async function confirmarReservaAtomica(
  supabase: Awaited<ReturnType<typeof criarClienteSupabaseServer>>,
  escopo: EscopoConfirmacao,
  reserva: ReservationRow,
  motivo: string
) {
  /*
    A confirmacao usa RPC para status, timeline e calendario ficarem na mesma
    transacao. Isso evita bloqueio de casa sem status confirmado ou sucesso
    parcial escondido por erro em etapa posterior.
  */
  const { error } = await supabase.rpc("confirm_reservation_operational", {
    p_owner_id: escopo.ownerId,
    p_reason: motivo,
    p_reservation_id: reserva.id,
    p_tenant_id: escopo.tenantId,
    p_user_id: escopo.userId
  });

  if (error) {
    throw new ErroConfirmacao(
      traduzirErroConfirmacaoAtomica(error.message)
    );
  }
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

  if (error) {
    throw new ErroConfirmacao(
      traduzirErroBanco(error.message, "Não foi possível atualizar o status da reserva.")
    );
  }

  const { error: erroHistorico } = await supabase.from("reservation_status_history").insert({
    changed_by: escopo.userId,
    from_status: reserva.status,
    metadata: { origem: "confirmacoes" },
    reason: motivo,
    reservation_id: reserva.id,
    tenant_id: escopo.tenantId,
    to_status: statusDestino
  });

  if (erroHistorico) {
    throw new ErroConfirmacao(
      traduzirErroBanco(erroHistorico.message, "Não foi possível registrar a timeline da reserva.")
    );
  }

  await inserirNotaReserva(supabase, escopo, reserva.id, motivo);
}

async function atualizarPagamentoReserva(
  supabase: Awaited<ReturnType<typeof criarClienteSupabaseServer>>,
  escopo: EscopoConfirmacao,
  reserva: ReservationRow,
  statusDestino: ReservationPaymentStatus,
  motivo: string
) {
  const agora = new Date().toISOString();

  const { error } = await supabase
    .from("reservations")
    .update({
      payment_status: statusDestino,
      payment_status_updated_at: agora,
      payment_status_updated_by: escopo.userId
    } satisfies Partial<ReservationRow>)
    .eq("id", reserva.id)
    .eq("tenant_id", escopo.tenantId)
    .eq("owner_id", escopo.ownerId);

  if (error) {
    throw new ErroConfirmacao(
      traduzirErroBanco(error.message, "Não foi possível atualizar o status de pagamento da reserva.")
    );
  }

  await inserirNotaReserva(
    supabase,
    escopo,
    reserva.id,
    motivo,
    "system"
  );
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

  if (error) {
    throw new ErroConfirmacao(
      traduzirErroBanco(error.message, "Não foi possível atualizar a tarefa de limpeza.")
    );
  }

  if (tarefa.reservation_id) {
    await inserirNotaReserva(supabase, escopo, tarefa.reservation_id, nota);
  }
}

async function inserirNotaReserva(
  supabase: Awaited<ReturnType<typeof criarClienteSupabaseServer>>,
  escopo: EscopoConfirmacao,
  reservaId: string,
  conteudo: string,
  tipo: "internal" | "system" = "system"
) {
  const { error } = await supabase.from("reservation_notes").insert({
    content: conteudo,
    created_by: escopo.userId,
    note_type: tipo,
    reservation_id: reservaId,
    tenant_id: escopo.tenantId
  });

  if (error) {
    throw new ErroConfirmacao(
      traduzirErroBanco(error.message, "Não foi possível registrar a observação da reserva.")
    );
  }
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

function podeGerenciarFinanceiroConfirmacoes(contexto: ContextoAutenticacao) {
  if (contexto.role === "owner") return true;
  return contexto.permissions.includes("finance.manage");
}

function redirecionarComErro(
  erro: unknown,
  mensagemLog: string,
  mensagemPadrao = "Não foi possível concluir a operação."
): never {
  const mensagem =
    erro instanceof ErroConfirmacao || erro instanceof ErroIntegracaoFinanceira
      || erro instanceof ErroMensagemWhatsapp
      ? erro.message
      : mensagemPadrao;

  if (
    !(erro instanceof ErroConfirmacao) &&
    !(erro instanceof ErroIntegracaoFinanceira) &&
    !(erro instanceof ErroMensagemWhatsapp)
  ) {
    console.error(mensagemLog, erro);
  }

  redirect(`${CAMINHO_CONFIRMACOES}?erro=${encodeURIComponent(mensagem)}`);
}

function traduzirErroBanco(mensagemBanco: string, fallback: string) {
  const mensagem = mensagemBanco.toLocaleLowerCase("pt-BR");

  if (mensagem.includes("row-level security") || mensagem.includes("permission")) {
    return "Erro de RLS ao atualizar a reserva.";
  }

  if (mensagem.includes("reservations_status_check")) {
    return "Status inválido para esta reserva.";
  }

  if (mensagem.includes("reservation_status_history")) {
    return "Não foi possível registrar a timeline da reserva.";
  }

  return fallback;
}

function traduzirErroConfirmacaoAtomica(mensagemBanco: string) {
  const mensagem = mensagemBanco.toLocaleLowerCase("pt-BR");

  if (mensagem.includes("permissao") || mensagem.includes("permission")) {
    return "Voce nao tem permissao para confirmar esta reserva.";
  }

  if (mensagem.includes("nao encontrada")) {
    return "Reserva nao encontrada para este tenant.";
  }

  if (mensagem.includes("cancelada")) {
    return "Esta reserva ja foi cancelada.";
  }

  if (mensagem.includes("ja esta confirmada") || mensagem.includes("ja foi confirmada")) {
    return "A reserva ja esta confirmada.";
  }

  if (mensagem.includes("conflito") || mensagem.includes("indisponibilidade")) {
    return "Conflito de datas encontrado para esta casa.";
  }

  if (mensagem.includes("calendario")) {
    return "Nao foi possivel bloquear o periodo no calendario.";
  }

  if (mensagem.includes("status atual")) {
    return "Status atual da reserva nao permite confirmacao.";
  }

  return "Nao foi possivel confirmar a reserva.";
}

function revalidarConfirmacoes() {
  revalidatePath(CAMINHO_CONFIRMACOES);
  revalidatePath("/reservas");
  revalidatePath("/calendario");
  revalidatePath("/limpeza");
}

