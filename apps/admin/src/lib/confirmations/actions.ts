"use server";

import type {
  CleaningTaskRow,
  CleaningTaskStatus,
  ReservationPaymentMethod,
  ReservationPaymentStatus,
  ReservationRow,
  ReservationStatus
} from "@hospedex/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirAutenticacao } from "../auth/context";
import type { ContextoAutenticacao } from "../auth/types";
import { alterarStatusReservaOperacionalSeguro } from "../reservations/status-rpc";
import { criarClienteSupabaseServer } from "../supabase/server";
import {
  podeGerenciarLimpezaDiaria,
  podeGerenciarOperacaoDiaria
} from "./data";
import {
  ErroMensagemWhatsapp,
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
  await registrarPagamentoManualConfirmacao(formData);
}

export async function cancelarPagamentoConfirmacaoAction(formData: FormData) {
  await reverterPagamentoConfirmacao(formData, "cancelar");
}

export async function estornarPagamentoConfirmacaoAction(formData: FormData) {
  await reverterPagamentoConfirmacao(formData, "estornar");
}

export async function confirmarReservaConfirmacaoAction(formData: FormData) {
  const escopo = await carregarEscopoOperacao();

  try {
    const supabase = await criarClienteSupabaseServer();
    const reserva = await carregarReserva(supabase, escopo, textoObrigatorio(formData, "reservaId", "reserva"));
    const observacao = textoOpcional(formData, "observacao");

    if (STATUS_TERMINAIS.includes(reserva.status)) {
      throw new ErroConfirmacao("Reserva encerrada nao pode ser confirmada.");
    }

    if (reserva.status !== "pending") {
      throw new ErroConfirmacao("A reserva ja foi decidida.");
    }

    await aprovarReservaECriarCobrancaAtomica(
      supabase,
      escopo,
      reserva,
      observacao ?? "Reserva aprovada e cobranca criada pela central de confirmacoes."
    );

    revalidarConfirmacoes();
  } catch (erro) {
    redirecionarComErro(
      erro,
      "Erro ao aprovar reserva e gerar cobranca.",
      "Não foi possível confirmar a reserva."
    );
  }

  redirect(`${CAMINHO_CONFIRMACOES}?sucesso=cobranca-gerada`);
}

export async function marcarPagamentoPendenteConfirmacaoAction(formData: FormData) {
  await alterarPagamentoReservaOperacional(formData, {
    motivoPadrao: "Pagamento marcado como pendente pela operacao diaria.",
    statusDestino: "pending",
    sucesso: "pagamento-pendente"
  });
}

async function registrarPagamentoManualConfirmacao(formData: FormData) {
  const escopo = await carregarEscopoOperacao();

  try {
    const supabase = await criarClienteSupabaseServer();
    const reserva = await carregarReserva(supabase, escopo, textoObrigatorio(formData, "reservaId", "reserva"));
    const observacao = textoOpcional(formData, "observacao");
    const valorPagamento = numeroDecimalOpcional(formData, "valorPagamento");
    const cobrancaId = textoOpcional(formData, "cobrancaId");
    const comprovanteUrl = textoOpcional(formData, "comprovanteUrl");
    const formaPagamento = validarFormaPagamentoOpcional(formData, "formaPagamento");

    if (STATUS_TERMINAIS.includes(reserva.status)) {
      throw new ErroConfirmacao("Reserva encerrada nao permite registrar pagamento.");
    }

    if (!escopo.podeGerenciarFinanceiro) {
      throw new ErroConfirmacao(
        "VocÃª nÃ£o tem permissÃ£o para alterar o financeiro desta reserva."
      );
    }

    await registrarPagamentoManualAtomico(
      supabase,
      escopo,
      reserva,
      valorPagamento,
      formaPagamento ?? reserva.payment_method,
      cobrancaId,
      comprovanteUrl,
      observacao ?? "Pagamento manual registrado pela operacao diaria."
    );

    revalidarConfirmacoes();
  } catch (erro) {
    redirecionarComErro(
      erro,
      "Erro ao registrar pagamento manual.",
      "NÃ£o foi possÃ­vel registrar o pagamento da reserva."
    );
  }

  redirect(`${CAMINHO_CONFIRMACOES}?sucesso=pagamento-confirmado`);
}

async function reverterPagamentoConfirmacao(
  formData: FormData,
  tipo: "cancelar" | "estornar"
) {
  const escopo = await carregarEscopoOperacao();

  try {
    const supabase = await criarClienteSupabaseServer();
    await carregarReserva(
      supabase,
      escopo,
      textoObrigatorio(formData, "reservaId", "reserva")
    );
    const pagamentoId = textoObrigatorio(formData, "pagamentoId", "pagamento");
    const motivo = textoObrigatorio(formData, "motivo", "motivo");

    if (!escopo.podeGerenciarFinanceiro) {
      throw new ErroConfirmacao(
        "Voce nao tem permissao para alterar o financeiro desta reserva."
      );
    }

    if (tipo === "cancelar") {
      await cancelarPagamentoAtomico(supabase, escopo, pagamentoId, motivo);
    } else {
      await estornarPagamentoAtomico(
        supabase,
        escopo,
        pagamentoId,
        numeroDecimalObrigatorio(formData, "valorEstorno", "valor do estorno"),
        motivo,
        textoOpcional(formData, "observacao")
      );
    }

    revalidarConfirmacoes();
  } catch (erro) {
    redirecionarComErro(
      erro,
      "Erro ao reverter pagamento da reserva.",
      tipo === "cancelar"
        ? "Nao foi possivel cancelar o pagamento da reserva."
        : "Nao foi possivel estornar o pagamento da reserva."
    );
  }

  redirect(
    `${CAMINHO_CONFIRMACOES}?sucesso=${
      tipo === "cancelar" ? "pagamento-cancelado" : "pagamento-estornado"
    }`
  );
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

    if (["partial", "paid", "received"].includes(reserva.payment_status) && !escopo.podeGerenciarFinanceiro) {
      throw new ErroConfirmacao(
        "Você não tem permissão para cancelar uma reserva com pagamento recebido."
      );
    }

    await cancelarReservaAtomica(
      supabase,
      escopo,
      reserva,
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

    await atualizarPagamentoReservaAtomica(
      supabase,
      escopo,
      reserva,
      regra.statusDestino,
      observacao ?? regra.motivoPadrao
    );

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

    if (
      regra.statusDestino !== "checked_in" &&
      regra.statusDestino !== "checked_out" &&
      regra.statusDestino !== "completed"
    ) {
      throw new ErroConfirmacao("Transicao de status invalida para esta reserva.");
    }

    await alterarStatusReservaOperacionalSeguro({
      escopo,
      motivo: observacao ?? regra.motivoPadrao,
      reserva,
      statusDestino: regra.statusDestino,
      supabase
    });
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

async function aprovarReservaECriarCobrancaAtomica(
  supabase: Awaited<ReturnType<typeof criarClienteSupabaseServer>>,
  escopo: EscopoConfirmacao,
  reserva: ReservationRow,
  motivo: string
) {
  /*
    Aprovar reserva cria uma cobranca e um bloqueio temporario. A confirmacao
    definitiva do calendario acontece quando um pagamento manual e registrado.
  */
  const { error } = await supabase.rpc("approve_reservation_charge_operational", {
    p_charge_amount: null,
    p_charge_type: "full",
    p_due_at: null,
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

async function atualizarPagamentoReservaAtomica(
  supabase: Awaited<ReturnType<typeof criarClienteSupabaseServer>>,
  escopo: EscopoConfirmacao,
  reserva: ReservationRow,
  statusDestino: ReservationPaymentStatus,
  motivo: string
) {
  /*
    Pagamento e financeiro precisam ser atomicos. A RPC atualiza a reserva,
    cria/atualiza o lancamento financeiro e registra timeline sem confirmar a
    reserva automaticamente.
  */
  const { error } = await supabase.rpc("set_reservation_payment_operational", {
    p_owner_id: escopo.ownerId,
    p_reason: motivo,
    p_reservation_id: reserva.id,
    p_target_status: statusDestino,
    p_tenant_id: escopo.tenantId,
    p_user_id: escopo.userId
  });

  if (error) {
    throw new ErroConfirmacao(
      traduzirErroPagamentoAtomico(error.message)
    );
  }
}

async function registrarPagamentoManualAtomico(
  supabase: Awaited<ReturnType<typeof criarClienteSupabaseServer>>,
  escopo: EscopoConfirmacao,
  reserva: ReservationRow,
  valorPagamento: number | null,
  formaPagamento: ReservationPaymentMethod | null,
  cobrancaId: string | null,
  comprovanteUrl: string | null,
  motivo: string
) {
  /*
    Pagamento manual registra entrada parcial/total, atualiza Financeiro e
    transforma o bloqueio temporario em reserva definitiva quando ha pagamento.
  */
  const { error } = await supabase.rpc("confirm_manual_reservation_payment", {
    p_amount: valorPagamento,
    p_charge_id: cobrancaId,
    p_owner_id: escopo.ownerId,
    p_payment_method: formaPagamento,
    p_proof_url: comprovanteUrl,
    p_reason: motivo,
    p_reservation_id: reserva.id,
    p_tenant_id: escopo.tenantId,
    p_user_id: escopo.userId
  });

  if (error) {
    throw new ErroConfirmacao(
      traduzirErroPagamentoAtomico(error.message)
    );
  }
}

async function cancelarPagamentoAtomico(
  supabase: Awaited<ReturnType<typeof criarClienteSupabaseServer>>,
  escopo: EscopoConfirmacao,
  pagamentoId: string,
  motivo: string
) {
  /*
    Cancelamento corrige pagamento lancado por engano. A RPC preserva registro,
    recalcula saldo e registra timeline em uma unica transacao.
  */
  const { error } = await supabase.rpc("cancel_reservation_payment", {
    p_owner_id: escopo.ownerId,
    p_payment_id: pagamentoId,
    p_reason: motivo,
    p_tenant_id: escopo.tenantId,
    p_user_id: escopo.userId
  });

  if (error) {
    throw new ErroConfirmacao(
      traduzirErroPagamentoAtomico(error.message)
    );
  }
}

async function estornarPagamentoAtomico(
  supabase: Awaited<ReturnType<typeof criarClienteSupabaseServer>>,
  escopo: EscopoConfirmacao,
  pagamentoId: string,
  valorEstorno: number,
  motivo: string,
  observacao: string | null
) {
  /*
    Estorno registra devolucao real e cria saida financeira. Nao altera status
    operacional nem libera calendario se a reserva continuar ativa.
  */
  const { error } = await supabase.rpc("refund_reservation_payment", {
    p_note: observacao,
    p_owner_id: escopo.ownerId,
    p_payment_id: pagamentoId,
    p_reason: motivo,
    p_refund_amount: valorEstorno,
    p_tenant_id: escopo.tenantId,
    p_user_id: escopo.userId
  });

  if (error) {
    throw new ErroConfirmacao(
      traduzirErroPagamentoAtomico(error.message)
    );
  }
}

async function cancelarReservaAtomica(
  supabase: Awaited<ReturnType<typeof criarClienteSupabaseServer>>,
  escopo: EscopoConfirmacao,
  reserva: ReservationRow,
  motivo: string
) {
  /*
    Cancelamento libera calendario e trata financeiro no banco. Reserva paga
    vira estorno/cancelamento rastreavel em vez de apagar lancamento.
  */
  const { error } = await supabase.rpc("cancel_reservation_operational", {
    p_owner_id: escopo.ownerId,
    p_reason: motivo,
    p_reservation_id: reserva.id,
    p_tenant_id: escopo.tenantId,
    p_user_id: escopo.userId
  });

  if (error) {
    throw new ErroConfirmacao(
      traduzirErroCancelamentoAtomico(error.message)
    );
  }
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

function numeroDecimalOpcional(formData: FormData, chave: string): number | null {
  const valor = formData.get(chave)?.toString().trim().replace(",", ".");
  if (!valor) return null;

  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero <= 0) {
    throw new ErroConfirmacao("Informe um valor valido.");
  }

  return numero;
}

function numeroDecimalObrigatorio(
  formData: FormData,
  chave: string,
  label: string
): number {
  const numero = numeroDecimalOpcional(formData, chave);
  if (numero === null) throw new ErroConfirmacao(`Informe ${label}.`);
  return numero;
}

function validarFormaPagamentoOpcional(
  formData: FormData,
  chave: string
): ReservationPaymentMethod | null {
  const valor = textoOpcional(formData, chave);
  if (!valor) return null;

  const formas: ReservationPaymentMethod[] = [
    "pix",
    "cash",
    "debit_card",
    "credit_card",
    "bank_transfer"
  ];

  if (formas.includes(valor as ReservationPaymentMethod)) {
    return valor as ReservationPaymentMethod;
  }

  throw new ErroConfirmacao("Forma de pagamento invalida.");
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
    erro instanceof ErroConfirmacao || erro instanceof ErroMensagemWhatsapp
      ? erro.message
      : mensagemPadrao;

  if (
    !(erro instanceof ErroConfirmacao) &&
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

function traduzirErroPagamentoAtomico(mensagemBanco: string) {
  const mensagem = mensagemBanco.toLocaleLowerCase("pt-BR");

  if (mensagem.includes("financeiro")) {
    return "Voce nao tem permissao para alterar o financeiro desta reserva.";
  }

  if (mensagem.includes("permissao") || mensagem.includes("permission")) {
    return "Voce nao tem permissao para alterar esta reserva.";
  }

  if (mensagem.includes("nao encontrada")) {
    return "Reserva nao encontrada.";
  }

  if (mensagem.includes("encerrada")) {
    return "Reserva encerrada nao permite alterar pagamento.";
  }

  if (mensagem.includes("valor")) {
    return "Nao foi possivel registrar o pagamento no financeiro.";
  }

  return "Nao foi possivel alterar o pagamento da reserva.";
}

function traduzirErroCancelamentoAtomico(mensagemBanco: string) {
  const mensagem = mensagemBanco.toLocaleLowerCase("pt-BR");

  if (mensagem.includes("calendario")) {
    return "Nao foi possivel liberar o periodo no calendario.";
  }

  if (mensagem.includes("financeiro")) {
    return "Voce nao tem permissao para cancelar reserva com pagamento recebido.";
  }

  if (mensagem.includes("permissao") || mensagem.includes("permission")) {
    return "Voce nao tem permissao para cancelar esta reserva.";
  }

  if (mensagem.includes("nao encontrada")) {
    return "Reserva nao encontrada.";
  }

  if (mensagem.includes("ja foi cancelada")) {
    return "Esta reserva ja foi cancelada.";
  }

  if (mensagem.includes("concluida")) {
    return "Reserva concluida nao pode ser cancelada.";
  }

  return "Nao foi possivel cancelar a reserva.";
}

function revalidarConfirmacoes() {
  revalidatePath(CAMINHO_CONFIRMACOES);
  revalidatePath("/reservas");
  revalidatePath("/calendario");
  revalidatePath("/financeiro");
  revalidatePath("/limpeza");
}

