import type {
  ExpenseCategoryRow,
  FinancialAccountRow,
  PropertyRow,
  TransactionRow,
  TransactionStatus,
  TransactionType
} from "@hospedex/types";

/**
 * Contratos do módulo Financeiro.
 *
 * Centraliza os tipos usados pela tela para manter lançamentos, categorias e
 * contas isolados por tenant sem espalhar regra financeira pelos componentes.
 */

export type TipoLancamentoFinanceiro = Extract<TransactionType, "income" | "expense">;

export type FiltrosFinanceiro = {
  busca: string;
  categoriaId: string;
  mes: string;
  status: TransactionStatus | "todos";
  tipo: TipoLancamentoFinanceiro | "todos";
};

export type LancamentoFinanceiro = Omit<TransactionRow, "transaction_type"> & {
  categoria: ExpenseCategoryRow | null;
  conta: FinancialAccountRow | null;
  propriedade: PropertyRow | null;
  transaction_type: TipoLancamentoFinanceiro;
};

export type DadosModuloFinanceiro = {
  categorias: ExpenseCategoryRow[];
  contas: FinancialAccountRow[];
  filtros: FiltrosFinanceiro;
  lancamentos: LancamentoFinanceiro[];
  pagamentosOnlineAtivo: boolean;
  podeGerenciar: boolean;
  propriedades: PropertyRow[];
  resumo: {
    despesasMes: number;
    lucroMes: number;
    receitaMes: number;
    reservasPagas: number;
    reservasPendentes: number;
    ticketMedio: number;
  };
};

export type SearchParamsFinanceiro = {
  erro?: string | undefined;
  sucesso?: string | undefined;
};

export const TIPOS_LANCAMENTO_FINANCEIRO: TipoLancamentoFinanceiro[] = [
  "income",
  "expense"
];

export const STATUS_LANCAMENTO_FINANCEIRO: TransactionStatus[] = [
  "pending",
  "paid",
  "cancelled",
  "refunded"
];

export const LABEL_TIPO_LANCAMENTO: Record<TipoLancamentoFinanceiro, string> = {
  expense: "Despesa",
  income: "Receita"
};

export const LABEL_STATUS_LANCAMENTO: Record<TransactionStatus, string> = {
  cancelled: "Cancelado",
  paid: "Pago",
  pending: "Pendente",
  refunded: "Estornado"
};

export function obterVariantStatusFinanceiro(status: TransactionStatus) {
  if (status === "paid") return "success";
  if (status === "pending") return "warning";
  if (status === "refunded") return "danger";
  return "secondary";
}
