"use server";

import type {
  ReservationChargeRow,
  ReservationPaymentRow,
  ReservationPaymentStatus,
  ReservationRow,
  TransactionRow,
  TransactionStatus
} from "@hospedex/types";

import { ErroRegraReserva, type ClienteSupabaseServer, type EscopoReserva } from "./permissions";

/**
 * Sincroniza os efeitos financeiros quando uma reserva ja existente e editada.
 *
 * A regra preserva pagamentos e historico financeiro: editar valor, casa ou
 * periodo nao apaga recebimentos; apenas recalcula cobranca principal, status
 * financeiro da reserva e lancamento agregado quando ele ja existe.
 */

type EntradaFinanceiraReserva = {
  propriedadeId: string;
  hospedeNome: string;
  checkIn: string;
  valorBase: number;
};

export async function sincronizarFinanceiroReservaEditada(
  supabase: ClienteSupabaseServer,
  escopo: EscopoReserva,
  reservaAtual: ReservationRow,
  entrada: EntradaFinanceiraReserva
) {
  const { data: cobrancas, error: erroCobrancas } = await supabase
    .from("reservation_charges")
    .select("*")
    .eq("tenant_id", escopo.tenantId)
    .eq("reservation_id", reservaAtual.id)
    .returns<ReservationChargeRow[]>();

  if (erroCobrancas) {
    throw new Error(erroCobrancas.message);
  }

  if (!cobrancas?.length) return;

  const cobrancaPrincipal = obterCobrancaPrincipal(cobrancas);
  if (!cobrancaPrincipal) return;

  const alteracaoFinanceira =
    reservaAtual.property_id !== entrada.propriedadeId ||
    reservaAtual.check_in !== entrada.checkIn ||
    Number(reservaAtual.total_amount) !== entrada.valorBase;
  const possuiValorRecebido = cobrancas.some((cobranca) => Number(cobranca.amount_paid) > 0);
  const podeGerenciarFinanceiro = podeGerenciarFinanceiroReserva(escopo);

  if (possuiValorRecebido && alteracaoFinanceira && !podeGerenciarFinanceiro) {
    // Pagamentos recebidos sao historico financeiro. Funcionarios sem permissao
    // financeira nao podem alterar dados que mudam saldo, casa ou periodo.
    throw new ErroRegraReserva(
      "Esta reserva possui pagamento vinculado. Voce precisa de permissao financeira para alterar valor, casa ou periodo."
    );
  }

  const pagamentos = podeGerenciarFinanceiro
    ? await carregarPagamentosReserva(supabase, escopo, reservaAtual.id)
    : [];
  const valorPagoReserva = podeGerenciarFinanceiro
    ? calcularValorLiquidoPago(pagamentos)
    : Number(cobrancaPrincipal.amount_paid);
  const valorPagoCobranca = podeGerenciarFinanceiro
    ? calcularValorLiquidoPago(
        pagamentos.filter((pagamento) => pagamento.charge_id === cobrancaPrincipal.id)
      )
    : Number(cobrancaPrincipal.amount_paid);

  await atualizarCobrancaPrincipalReserva(
    supabase,
    escopo,
    cobrancaPrincipal,
    entrada,
    valorPagoCobranca
  );

  if (reservaAtual.property_id !== entrada.propriedadeId) {
    await sincronizarPropriedadeCobrancasSecundarias(
      supabase,
      escopo,
      cobrancas,
      cobrancaPrincipal.id,
      entrada.propriedadeId
    );

    if (pagamentos.length > 0) {
      await atualizarPropriedadePagamentosReserva(
        supabase,
        escopo,
        reservaAtual.id,
        entrada.propriedadeId
      );
    }
  }

  await atualizarStatusPagamentoReservaEditada(
    supabase,
    escopo,
    reservaAtual.id,
    entrada.valorBase,
    valorPagoReserva
  );

  if (podeGerenciarFinanceiro) {
    await atualizarLancamentoFinanceiroReservaEditada(
      supabase,
      escopo,
      reservaAtual,
      entrada,
      cobrancaPrincipal.id,
      pagamentos,
      valorPagoReserva
    );
  }
}

function obterCobrancaPrincipal(cobrancas: ReservationChargeRow[]) {
  const ativas = cobrancas.filter(
    (cobranca) => !["cancelled", "refunded"].includes(cobranca.status)
  );

  return (
    ativas.find((cobranca) => cobranca.charge_type === "full") ??
    ativas.find((cobranca) => cobranca.charge_type === "remaining") ??
    ativas[0] ??
    null
  );
}

async function carregarPagamentosReserva(
  supabase: ClienteSupabaseServer,
  escopo: EscopoReserva,
  reservaId: string
) {
  const { data, error } = await supabase
    .from("reservation_payments")
    .select("*")
    .eq("tenant_id", escopo.tenantId)
    .eq("reservation_id", reservaId)
    .returns<ReservationPaymentRow[]>();

  if (error) throw new Error(error.message);
  return data ?? [];
}

async function atualizarCobrancaPrincipalReserva(
  supabase: ClienteSupabaseServer,
  escopo: EscopoReserva,
  cobranca: ReservationChargeRow,
  entrada: EntradaFinanceiraReserva,
  valorPagoCobranca: number
) {
  const valorPago = arredondarMoeda(Math.min(valorPagoCobranca, entrada.valorBase));
  const { error } = await supabase
    .from("reservation_charges")
    .update({
      amount: arredondarMoeda(entrada.valorBase),
      amount_paid: valorPago,
      property_id: entrada.propriedadeId,
      status: calcularStatusCobranca(valorPago, entrada.valorBase)
    })
    .eq("id", cobranca.id)
    .eq("tenant_id", escopo.tenantId)
    .eq("reservation_id", cobranca.reservation_id);

  if (error) {
    throw new Error(error.message);
  }
}

async function sincronizarPropriedadeCobrancasSecundarias(
  supabase: ClienteSupabaseServer,
  escopo: EscopoReserva,
  cobrancas: ReservationChargeRow[],
  cobrancaPrincipalId: string,
  propriedadeId: string
) {
  const cobrancasSecundarias = cobrancas.filter(
    (cobranca) =>
      cobranca.id !== cobrancaPrincipalId &&
      !["cancelled", "refunded"].includes(cobranca.status)
  );

  for (const cobranca of cobrancasSecundarias) {
    const { error } = await supabase
      .from("reservation_charges")
      .update({ property_id: propriedadeId })
      .eq("id", cobranca.id)
      .eq("tenant_id", escopo.tenantId)
      .eq("reservation_id", cobranca.reservation_id);

    if (error) throw new Error(error.message);
  }
}

async function atualizarPropriedadePagamentosReserva(
  supabase: ClienteSupabaseServer,
  escopo: EscopoReserva,
  reservaId: string,
  propriedadeId: string
) {
  const { error } = await supabase
    .from("reservation_payments")
    .update({ property_id: propriedadeId })
    .eq("tenant_id", escopo.tenantId)
    .eq("reservation_id", reservaId);

  if (error) {
    throw new Error(error.message);
  }
}

async function atualizarStatusPagamentoReservaEditada(
  supabase: ClienteSupabaseServer,
  escopo: EscopoReserva,
  reservaId: string,
  valorTotal: number,
  valorPago: number
) {
  const { error } = await supabase
    .from("reservations")
    .update({
      payment_status: calcularStatusPagamentoReserva(valorPago, valorTotal),
      payment_status_updated_at: new Date().toISOString(),
      payment_status_updated_by: escopo.userId
    })
    .eq("id", reservaId)
    .eq("tenant_id", escopo.tenantId)
    .eq("owner_id", escopo.ownerId);

  if (error) {
    throw new Error(error.message);
  }
}

async function atualizarLancamentoFinanceiroReservaEditada(
  supabase: ClienteSupabaseServer,
  escopo: EscopoReserva,
  reservaAtual: ReservationRow,
  entrada: EntradaFinanceiraReserva,
  cobrancaId: string,
  pagamentos: ReservationPaymentRow[],
  valorPago: number
) {
  const { data: transacao, error: erroTransacao } = await supabase
    .from("transactions")
    .select("*")
    .eq("tenant_id", escopo.tenantId)
    .eq("reservation_id", reservaAtual.id)
    .eq("transaction_type", "income")
    .maybeSingle<TransactionRow>();

  if (erroTransacao) {
    throw new Error(erroTransacao.message);
  }

  if (!transacao) return;

  const pagamentoPrincipalId =
    pagamentos
      .filter((pagamento) => pagamento.reversal_type === null)
      .sort(
        (a, b) =>
          new Date(b.confirmed_at ?? b.created_at).getTime() -
          new Date(a.confirmed_at ?? a.created_at).getTime()
      )[0]?.id ?? transacao.reservation_payment_id;
  const status = calcularStatusLancamentoFinanceiro(pagamentos, valorPago);
  const { error } = await supabase
    .from("transactions")
    .update({
      amount: arredondarMoeda(valorPago),
      due_date: entrada.checkIn,
      guest_name: entrada.hospedeNome,
      paid_at: status === "paid" ? transacao.paid_at ?? new Date().toISOString() : null,
      property_id: entrada.propriedadeId,
      reservation_charge_id: cobrancaId,
      reservation_payment_id: pagamentoPrincipalId,
      status,
      description: `Recebimentos liquidos da reserva ${reservaAtual.code}`
    })
    .eq("id", transacao.id)
    .eq("tenant_id", escopo.tenantId)
    .eq("reservation_id", reservaAtual.id)
    .eq("transaction_type", "income");

  if (error) {
    throw new Error(error.message);
  }
}

function calcularValorLiquidoPago(pagamentos: ReservationPaymentRow[]) {
  const recebido = pagamentos
    .filter(
      (pagamento) =>
        pagamento.reversal_type === null &&
        (pagamento.status === "confirmed" || pagamento.status === "refunded")
    )
    .reduce((total, pagamento) => total + Number(pagamento.amount), 0);
  const estornado = pagamentos
    .filter((pagamento) => pagamento.reversal_type === "refund" && pagamento.status === "refunded")
    .reduce((total, pagamento) => total + Number(pagamento.amount), 0);

  return arredondarMoeda(Math.max(recebido - estornado, 0));
}

function calcularStatusCobranca(valorPago: number, valorTotal: number): ReservationChargeRow["status"] {
  if (valorPago <= 0) return "pending";
  if (valorPago < valorTotal) return "partial";
  return "paid";
}

function calcularStatusPagamentoReserva(
  valorPago: number,
  valorTotal: number
): ReservationPaymentStatus {
  if (valorPago <= 0) return "pending";
  if (valorPago < valorTotal) return "partial";
  return "paid";
}

function calcularStatusLancamentoFinanceiro(
  pagamentos: ReservationPaymentRow[],
  valorPago: number
): TransactionStatus {
  const valorEstornado = pagamentos
    .filter((pagamento) => pagamento.reversal_type === "refund" && pagamento.status === "refunded")
    .reduce((total, pagamento) => total + Number(pagamento.amount), 0);

  if (valorPago > 0) return "paid";
  if (valorEstornado > 0) return "refunded";
  return "pending";
}

function podeGerenciarFinanceiroReserva(escopo: EscopoReserva) {
  return escopo.contexto.role === "owner" || escopo.contexto.permissions.includes("finance.manage");
}

function arredondarMoeda(valor: number) {
  return Number(valor.toFixed(2));
}
