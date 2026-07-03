import type {
  ExpenseCategoryRow,
  PropertyRow,
  ReservationStatus
} from "@hospedex/types";

/**
 * Contratos do modulo de Relatorios.
 *
 * Os relatorios sao derivados de dados reais do tenant autenticado. Esta camada
 * evita que componentes misturem regra multi-tenant, filtros financeiros e
 * calculos operacionais.
 */

export type FiltrosRelatorios = {
  dataInicio: string;
  dataFim: string;
  propriedadeId?: string;
  statusReserva: ReservationStatus | "todos";
  categoriaFinanceiraId?: string;
};

export type ResumoRelatorios = {
  despesasPeriodo: number;
  hospedesRecorrentes: number;
  lucroPeriodo: number;
  propriedadesRentaveis: number;
  receitaPeriodo: number;
  reservasPeriodo: number;
  servicosExtras: number;
  taxaOcupacao: number;
  ticketMedio: number;
};

export type PontoSerieRelatorio = {
  data: string;
  despesas: number;
  lucro: number;
  receita: number;
  reservas: number;
  rotulo: string;
};

export type StatusReservaRelatorio = {
  cor: string;
  label: string;
  status: ReservationStatus;
  total: number;
};

export type PropriedadeRentavelRelatorio = {
  propriedadeId: string;
  propriedadeNome: string;
  receitaReservas: number;
  reservas: number;
  ticketMedio: number;
};

export type HospedeRecorrenteRelatorio = {
  identidade: string;
  nome: string;
  reservas: number;
  ultimaHospedagem: string;
  valorTotal: number;
};

export type ServicoExtraRelatorio = {
  nome: string;
  quantidade: number;
  valorTotal: number;
};

export type ReservaDetalhadaRelatorio = {
  codigo: string;
  hospede: string;
  pagamento: string;
  propriedade: string;
  status: string;
  total: number;
};

export type LancamentoDetalhadoRelatorio = {
  categoria: string;
  data: string;
  descricao: string;
  tipo: "Receita" | "Despesa";
  valor: number;
};

export type DadosModuloRelatorios = {
  categoriasFinanceiras: ExpenseCategoryRow[];
  filtros: FiltrosRelatorios;
  hospedesRecorrentes: HospedeRecorrenteRelatorio[];
  lancamentosDetalhados: LancamentoDetalhadoRelatorio[];
  linhasCsv: string[][];
  propriedades: PropertyRow[];
  propriedadesRentaveis: PropriedadeRentavelRelatorio[];
  reservasDetalhadas: ReservaDetalhadaRelatorio[];
  reservasPorStatus: StatusReservaRelatorio[];
  resumo: ResumoRelatorios;
  serieFinanceira: PontoSerieRelatorio[];
  servicosExtras: ServicoExtraRelatorio[];
  tenantNome: string;
};

export type SearchParamsRelatorios = {
  erro?: string | undefined;
  sucesso?: string | undefined;
};

export const STATUS_RESERVA_RELATORIOS: ReservationStatus[] = [
  "pending",
  "awaiting_payment",
  "confirmed",
  "checked_in",
  "checked_out",
  "completed",
  "cancelled"
];

export const LABEL_STATUS_RESERVA_RELATORIOS: Record<ReservationStatus, string> = {
  awaiting_payment: "Aguardando pagamento",
  cancelled: "Cancelada",
  checked_in: "Hospedado",
  checked_out: "Check-out realizado",
  completed: "Concluida",
  confirmed: "Confirmada",
  pending: "Pendente"
};

export const CORES_STATUS_RESERVA_RELATORIOS: Record<ReservationStatus, string> = {
  awaiting_payment: "#2563eb",
  cancelled: "#dc2626",
  checked_in: "#0891b2",
  checked_out: "#7c3aed",
  completed: "#64748b",
  confirmed: "#16a34a",
  pending: "#f59e0b"
};
