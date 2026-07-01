import type {
  ExpenseCategoryRow,
  FinancialAccountRow,
  PropertyRow,
  ReservationRow,
  TransactionRow
} from "@hospedex/types";

import type { ContextoAutenticacao } from "../auth/types";
import { criarClienteSupabaseServer } from "../supabase/server";
import type {
  DadosModuloFinanceiro,
  FiltrosFinanceiro,
  LancamentoFinanceiro,
  TipoLancamentoFinanceiro
} from "./types";

/**
 * Camada de leitura do Financeiro.
 *
 * Todas as consultas usam o tenant autenticado. O proprietário enxerga o próprio
 * tenant e funcionários dependem das permissões financeiras carregadas.
 */

export function podeLerFinanceiro(contexto: ContextoAutenticacao): boolean {
  if (contexto.role === "owner") return true;
  return contexto.permissions.includes("finance.read");
}

export function podeGerenciarFinanceiro(contexto: ContextoAutenticacao): boolean {
  if (contexto.role === "owner") return true;
  return contexto.permissions.includes("finance.manage");
}

export async function carregarDadosModuloFinanceiro(
  contexto: ContextoAutenticacao,
  filtros: FiltrosFinanceiro
): Promise<DadosModuloFinanceiro> {
  const tenantId = contexto.tenant?.id;
  const ownerId = contexto.tenant?.owner_id;

  if (!tenantId || !ownerId) return criarDadosVazios(filtros);

  const supabase = await criarClienteSupabaseServer();
  const [
    contasResultado,
    categoriasResultado,
    propriedadesResultado,
    transacoesResultado,
    reservasPendentesResultado
  ] = await Promise.all([
    supabase
      .from("financial_accounts")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("owner_id", ownerId)
      .order("name", { ascending: true })
      .returns<FinancialAccountRow[]>(),
    supabase
      .from("expense_categories")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("kind", { ascending: false })
      .order("name", { ascending: true })
      .returns<ExpenseCategoryRow[]>(),
    supabase
      .from("properties")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("owner_id", ownerId)
      .is("deleted_at", null)
      .order("name", { ascending: true })
      .returns<PropertyRow[]>(),
    supabase
      .from("transactions")
      .select("*")
      .eq("tenant_id", tenantId)
      .in("transaction_type", ["income", "expense"])
      .order("created_at", { ascending: false })
      .limit(200)
      .returns<TransactionRow[]>(),
    carregarReservasPendentesMes(tenantId, ownerId, filtros.mes)
  ]);

  registrarErroLeitura("contas financeiras", contasResultado.error);
  registrarErroLeitura("categorias financeiras", categoriasResultado.error);
  registrarErroLeitura("propriedades do financeiro", propriedadesResultado.error);
  registrarErroLeitura("lançamentos financeiros", transacoesResultado.error);
  registrarErroLeitura("reservas pendentes", reservasPendentesResultado.error);

  const contas = contasResultado.data ?? [];
  const categorias = categoriasResultado.data ?? [];
  const propriedades = propriedadesResultado.data ?? [];
  const transacoes = transacoesResultado.data ?? [];
  const lancamentos = montarLancamentos(transacoes, contas, categorias, propriedades).filter(
    (lancamento) => correspondeFiltros(lancamento, filtros)
  );

  return {
    categorias,
    contas,
    filtros,
    lancamentos,
    pagamentosOnlineAtivo: Boolean(contexto.featureFlags.payments),
    podeGerenciar: podeGerenciarFinanceiro(contexto),
    propriedades,
    resumo: montarResumo(transacoes, reservasPendentesResultado.data ?? [], filtros.mes)
  };
}

function montarLancamentos(
  transacoes: TransactionRow[],
  contas: FinancialAccountRow[],
  categorias: ExpenseCategoryRow[],
  propriedades: PropertyRow[]
): LancamentoFinanceiro[] {
  return transacoes
    .filter(ehLancamentoReceitaOuDespesa)
    .map((transacao) => ({
    ...transacao,
    categoria:
      categorias.find((categoria) => categoria.id === transacao.expense_category_id) ?? null,
    conta: contas.find((conta) => conta.id === transacao.financial_account_id) ?? null,
    propriedade:
      propriedades.find((propriedade) => propriedade.id === transacao.property_id) ?? null
  }));
}

function ehLancamentoReceitaOuDespesa(
  transacao: TransactionRow
): transacao is TransactionRow & { transaction_type: TipoLancamentoFinanceiro } {
  return transacao.transaction_type === "income" || transacao.transaction_type === "expense";
}

function montarResumo(
  transacoes: TransactionRow[],
  reservasPendentes: ReservationRow[],
  mes: string
): DadosModuloFinanceiro["resumo"] {
  const transacoesDoMes = transacoes.filter((transacao) => transacaoPertenceAoMes(transacao, mes));
  const receitasPagas = transacoesDoMes.filter(
    (transacao) => transacao.transaction_type === "income" && transacao.status === "paid"
  );
  const despesasPagas = transacoesDoMes.filter(
    (transacao) => transacao.transaction_type === "expense" && transacao.status === "paid"
  );
  const receitasReservasPagas = receitasPagas.filter((transacao) => transacao.reservation_id);
  const reservasPagas = new Set(
    receitasReservasPagas.map((transacao) => transacao.reservation_id)
  ).size;
  const receitaReservas = somarTransacoes(receitasReservasPagas);

  return {
    despesasMes: somarTransacoes(despesasPagas),
    lucroMes: somarTransacoes(receitasPagas) - somarTransacoes(despesasPagas),
    receitaMes: somarTransacoes(receitasPagas),
    reservasPagas,
    reservasPendentes: reservasPendentes.length,
    ticketMedio: reservasPagas > 0 ? receitaReservas / reservasPagas : 0
  };
}

async function carregarReservasPendentesMes(tenantId: string, ownerId: string, mes: string) {
  const periodo = obterPeriodoMes(mes);
  const supabase = await criarClienteSupabaseServer();

  return supabase
    .from("reservations")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("owner_id", ownerId)
    .in("status", ["pending", "awaiting_payment"])
    .lt("check_in", periodo.fimExclusivo)
    .gte("check_out", periodo.inicio)
    .returns<ReservationRow[]>();
}

function correspondeFiltros(lancamento: LancamentoFinanceiro, filtros: FiltrosFinanceiro) {
  if (filtros.tipo !== "todos" && lancamento.transaction_type !== filtros.tipo) return false;
  if (filtros.status !== "todos" && lancamento.status !== filtros.status) return false;
  if (filtros.categoriaId !== "todas" && lancamento.expense_category_id !== filtros.categoriaId) {
    return false;
  }
  if (filtros.busca && !lancamentoCorrespondeBusca(lancamento, filtros.busca)) return false;
  return transacaoPertenceAoMes(lancamento, filtros.mes);
}

function lancamentoCorrespondeBusca(lancamento: LancamentoFinanceiro, busca: string) {
  const termo = normalizarBusca(busca);
  const campos = [
    lancamento.description,
    lancamento.categoria?.name,
    lancamento.conta?.name,
    lancamento.guest_name,
    lancamento.propriedade?.name,
    lancamento.reservation_id
  ];

  return campos.some((campo) => normalizarBusca(campo ?? "").includes(termo));
}

function normalizarBusca(valor: string) {
  return valor
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function transacaoPertenceAoMes(transacao: TransactionRow, mes: string) {
  const data = (transacao.paid_at ?? transacao.due_date ?? transacao.created_at).slice(0, 10);
  return data.slice(0, 7) === mes;
}

function somarTransacoes(transacoes: TransactionRow[]) {
  return transacoes.reduce((total, transacao) => total + Number(transacao.amount), 0);
}

export function normalizarMesFinanceiro(valor: string | undefined) {
  if (valor && /^\d{4}-\d{2}$/.test(valor)) return valor;
  return new Date().toISOString().slice(0, 7);
}

function obterPeriodoMes(mes: string) {
  const [ano = "2026", numeroMes = "01"] = mes.split("-");
  const inicio = new Date(Date.UTC(Number(ano), Number(numeroMes) - 1, 1));
  const fim = new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth() + 1, 1));

  return {
    fimExclusivo: fim.toISOString().slice(0, 10),
    inicio: inicio.toISOString().slice(0, 10)
  };
}

function criarDadosVazios(filtros: FiltrosFinanceiro): DadosModuloFinanceiro {
  return {
    categorias: [],
    contas: [],
    filtros,
    lancamentos: [],
    pagamentosOnlineAtivo: false,
    podeGerenciar: false,
    propriedades: [],
    resumo: {
      despesasMes: 0,
      lucroMes: 0,
      receitaMes: 0,
      reservasPagas: 0,
      reservasPendentes: 0,
      ticketMedio: 0
    }
  };
}

function registrarErroLeitura(modulo: string, erro: { message: string } | null) {
  if (!erro) return;
  console.error(`Erro ao carregar ${modulo} do tenant.`, erro.message);
}
