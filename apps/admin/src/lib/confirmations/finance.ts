import type {
  ExpenseCategoryRow,
  FinancialAccountRow,
  ReservationRow,
  TransactionRow,
  TransactionStatus,
} from "@hospedex/types";

import type { ClienteSupabaseServer } from "../finance/permissions";

/**
 * Integração financeira manual das confirmações.
 *
 * Mantém o vínculo entre reserva e caixa usando `transactions.reservation_id`.
 * O gateway real não é acionado aqui: o proprietário apenas registra o estado
 * financeiro manualmente, preservando rastreabilidade por tenant e propriedade.
 */

export class ErroIntegracaoFinanceira extends Error {}

type EscopoFinanceiroReserva = {
  ownerId: string;
  podeGerenciarFinanceiro: boolean;
  tenantId: string;
};

type BaseLancamentoReserva = {
  categoria: ExpenseCategoryRow;
  conta: FinancialAccountRow;
  hospedeNome: string | null;
  propriedadeNome: string;
};

export async function registrarRecebimentoReserva(
  supabase: ClienteSupabaseServer,
  escopo: EscopoFinanceiroReserva,
  reserva: ReservationRow
) {
  await salvarLancamentoReserva(supabase, escopo, reserva, "paid");
}

export async function marcarRecebimentoReservaPendente(
  supabase: ClienteSupabaseServer,
  escopo: EscopoFinanceiroReserva,
  reserva: ReservationRow
) {
  await salvarLancamentoReserva(supabase, escopo, reserva, "pending");
}

export async function cancelarRecebimentoReserva(
  supabase: ClienteSupabaseServer,
  escopo: EscopoFinanceiroReserva,
  reserva: ReservationRow,
  status: Extract<TransactionStatus, "cancelled" | "refunded">
) {
  await salvarLancamentoReserva(supabase, escopo, reserva, status, status === "refunded");
}

async function salvarLancamentoReserva(
  supabase: ClienteSupabaseServer,
  escopo: EscopoFinanceiroReserva,
  reserva: ReservationRow,
  status: Extract<TransactionStatus, "cancelled" | "paid" | "pending" | "refunded">,
  criarSeAusente = true
) {
  if (!escopo.podeGerenciarFinanceiro) {
    throw new ErroIntegracaoFinanceira(
      "Você não tem permissão para alterar o financeiro desta reserva."
    );
  }

  const valor = Number(reserva.total_amount);
  if (!Number.isFinite(valor) || valor <= 0) {
    throw new ErroIntegracaoFinanceira(
      "Não foi possível registrar o pagamento: a reserva não possui valor válido."
    );
  }

  const lancamento = await carregarLancamentoReserva(supabase, escopo, reserva.id);
  if (!lancamento && !criarSeAusente) return;

  const base = await carregarBaseLancamentoReserva(supabase, escopo, reserva);
  const agora = new Date().toISOString();
  const dados = {
    amount: valor,
    currency: reserva.currency,
    description: montarDescricao(reserva, base, status),
    due_date: reserva.check_in,
    expense_category_id: base.categoria.id,
    financial_account_id: base.conta.id,
    guest_name: base.hospedeNome,
    paid_at: status === "paid" ? agora : null,
    property_id: reserva.property_id,
    reservation_id: reserva.id,
    status,
    tenant_id: escopo.tenantId,
    transaction_type: "income" as const,
  } satisfies Partial<TransactionRow>;

  if (lancamento) {
    const { error } = await supabase
      .from("transactions")
      .update(dados)
      .eq("id", lancamento.id)
      .eq("tenant_id", escopo.tenantId)
      .eq("reservation_id", reserva.id);

    if (error) {
      throw new ErroIntegracaoFinanceira(
        traduzirErroBanco(error.message, "Não foi possível atualizar o lançamento financeiro da reserva.")
      );
    }

    return;
  }

  const { error } = await supabase.from("transactions").insert(dados);
  if (error) {
    throw new ErroIntegracaoFinanceira(
      traduzirErroBanco(error.message, "Não foi possível registrar o pagamento no financeiro.")
    );
  }
}

async function carregarBaseLancamentoReserva(
  supabase: ClienteSupabaseServer,
  escopo: EscopoFinanceiroReserva,
  reserva: ReservationRow
): Promise<BaseLancamentoReserva> {
  const [conta, categoria, hospedeNome, propriedadeNome] = await Promise.all([
    obterContaCaixa(supabase, escopo),
    obterCategoriaReserva(supabase, escopo),
    carregarHospedePrincipal(supabase, escopo.tenantId, reserva.id),
    carregarNomePropriedade(supabase, escopo, reserva.property_id),
  ]);

  return {
    categoria,
    conta,
    hospedeNome,
    propriedadeNome,
  };
}

async function obterContaCaixa(
  supabase: ClienteSupabaseServer,
  escopo: EscopoFinanceiroReserva
) {
  const { data, error } = await supabase
    .from("financial_accounts")
    .select("*")
    .eq("tenant_id", escopo.tenantId)
    .eq("owner_id", escopo.ownerId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<FinancialAccountRow>();

  if (error) {
    throw new ErroIntegracaoFinanceira(
      traduzirErroBanco(error.message, "Não foi possível localizar a conta caixa do tenant.")
    );
  }

  if (data) return data;

  const { data: criada, error: erroCriacao } = await supabase
    .from("financial_accounts")
    .insert({
      account_type: "cash",
      currency: "BRL",
      name: "Caixa principal",
      owner_id: escopo.ownerId,
      status: "active",
      tenant_id: escopo.tenantId,
    })
    .select("*")
    .single<FinancialAccountRow>();

  if (erroCriacao || !criada) {
    throw new ErroIntegracaoFinanceira(
      traduzirErroBanco(
        erroCriacao?.message,
        "Não foi possível criar a conta caixa para registrar o pagamento."
      )
    );
  }

  return criada;
}

async function obterCategoriaReserva(
  supabase: ClienteSupabaseServer,
  escopo: EscopoFinanceiroReserva
) {
  const { data, error } = await supabase
    .from("expense_categories")
    .select("*")
    .eq("tenant_id", escopo.tenantId)
    .eq("kind", "income")
    .eq("name", "Reserva")
    .maybeSingle<ExpenseCategoryRow>();

  if (error) {
    throw new ErroIntegracaoFinanceira(
      traduzirErroBanco(error.message, "Não foi possível localizar a categoria Reserva.")
    );
  }

  if (data?.status === "active") return data;

  if (data) {
    const { data: reativada, error: erroReativar } = await supabase
      .from("expense_categories")
      .update({ status: "active" })
      .eq("id", data.id)
      .eq("tenant_id", escopo.tenantId)
      .select("*")
      .single<ExpenseCategoryRow>();

    if (erroReativar || !reativada) {
      throw new ErroIntegracaoFinanceira(
        traduzirErroBanco(
          erroReativar?.message,
          "Não foi possível reativar a categoria Reserva."
        )
      );
    }

    return reativada;
  }

  const { data: criada, error: erroCriacao } = await supabase
    .from("expense_categories")
    .insert({
      kind: "income",
      name: "Reserva",
      status: "active",
      tenant_id: escopo.tenantId,
    })
    .select("*")
    .single<ExpenseCategoryRow>();

  if (erroCriacao || !criada) {
    throw new ErroIntegracaoFinanceira(
      traduzirErroBanco(
        erroCriacao?.message,
        "Não foi possível criar a categoria Reserva."
      )
    );
  }

  return criada;
}

async function carregarLancamentoReserva(
  supabase: ClienteSupabaseServer,
  escopo: EscopoFinanceiroReserva,
  reservaId: string
) {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("tenant_id", escopo.tenantId)
    .eq("reservation_id", reservaId)
    .eq("transaction_type", "income")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<TransactionRow>();

  if (error) {
    throw new ErroIntegracaoFinanceira(
      traduzirErroBanco(error.message, "Não foi possível carregar o lançamento financeiro da reserva.")
    );
  }

  return data;
}

async function carregarHospedePrincipal(
  supabase: ClienteSupabaseServer,
  tenantId: string,
  reservaId: string
) {
  const { data, error } = await supabase
    .from("reservation_guests")
    .select("full_name")
    .eq("tenant_id", tenantId)
    .eq("reservation_id", reservaId)
    .eq("is_primary", true)
    .limit(1)
    .maybeSingle<{ full_name: string }>();

  if (error) return null;
  return data?.full_name ?? null;
}

async function carregarNomePropriedade(
  supabase: ClienteSupabaseServer,
  escopo: EscopoFinanceiroReserva,
  propriedadeId: string
) {
  const { data, error } = await supabase
    .from("properties")
    .select("name")
    .eq("id", propriedadeId)
    .eq("tenant_id", escopo.tenantId)
    .eq("owner_id", escopo.ownerId)
    .maybeSingle<{ name: string }>();

  if (error) return "Casa";
  return data?.name ?? "Casa";
}

function montarDescricao(
  reserva: ReservationRow,
  base: BaseLancamentoReserva,
  status: TransactionStatus
) {
  const casa = base.propriedadeNome;
  const hospede = base.hospedeNome ? ` - ${base.hospedeNome}` : "";

  if (status === "pending") {
    return `Recebimento pendente da reserva ${reserva.code} - ${casa}${hospede}`;
  }

  if (status === "refunded") {
    return `Estorno/Ajuste do recebimento da reserva ${reserva.code} - ${casa}${hospede}`;
  }

  if (status === "cancelled") {
    return `Recebimento cancelado da reserva ${reserva.code} - ${casa}${hospede}`;
  }

  return `Recebimento da reserva ${reserva.code} - ${casa}${hospede}`;
}

function traduzirErroBanco(mensagemBanco: string | undefined, fallback: string) {
  const mensagem = mensagemBanco?.toLocaleLowerCase("pt-BR") ?? "";

  if (mensagem.includes("row-level security") || mensagem.includes("permission")) {
    return "Erro de RLS ao atualizar dados financeiros da reserva.";
  }

  if (mensagem.includes("violates")) {
    return `${fallback} Verifique os dados obrigatórios e vínculos da reserva.`;
  }

  return fallback;
}
