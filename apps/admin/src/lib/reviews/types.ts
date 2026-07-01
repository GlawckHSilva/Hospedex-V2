import type {
  PropertyReviewRow,
  PropertyRow,
  ReservationGuestRow,
  ReservationRow,
  ReviewStatus
} from "@hospedex/types";

/**
 * Contratos das Avaliacoes internas.
 *
 * A tela recebe relacionamentos ja filtrados por tenant para manter componentes
 * livres de regras de autorizacao e preparar publicacao futura sem acoplamento.
 */

export type NotaAvaliacao = 1 | 2 | 3 | 4 | 5;
export type FiltroNotaAvaliacao = NotaAvaliacao | "todos";
export type FiltroStatusAvaliacao = ReviewStatus | "todos";

export type FiltrosAvaliacoes = {
  dataFim?: string;
  dataInicio?: string;
  nota: FiltroNotaAvaliacao;
  propriedadeId?: string;
  status: FiltroStatusAvaliacao;
};

export type CasaAvaliacao = Pick<PropertyRow, "id" | "name" | "status" | "deleted_at">;
export type ReservaAvaliacao = Pick<
  ReservationRow,
  "id" | "code" | "check_in" | "check_out" | "status"
>;
export type HospedeAvaliacao = Pick<
  ReservationGuestRow,
  "full_name" | "email" | "phone" | "is_primary"
>;

export type AvaliacaoComRelacionamentos = PropertyReviewRow & {
  hospedePrincipal: HospedeAvaliacao | null;
  propriedade: CasaAvaliacao | null;
  reserva: ReservaAvaliacao | null;
};

export type DistribuicaoEstrelas = Array<{
  nota: NotaAvaliacao;
  quantidade: number;
}>;

export type ResumoAvaliacoes = {
  aprovadas: number;
  distribuicao: DistribuicaoEstrelas;
  notaMedia: number;
  ocultas: number;
  pendentes: number;
  total: number;
  ultimas: AvaliacaoComRelacionamentos[];
};

export type DadosModuloAvaliacoes = {
  avaliacoes: AvaliacaoComRelacionamentos[];
  filtros: FiltrosAvaliacoes;
  podeGerenciar: boolean;
  propriedades: CasaAvaliacao[];
  resumo: ResumoAvaliacoes;
  tenantNome: string;
};

export type SearchParamsAvaliacoes = {
  erro?: string;
  sucesso?: string;
};

export const NOTAS_AVALIACAO: NotaAvaliacao[] = [5, 4, 3, 2, 1];

export const STATUS_AVALIACAO: Array<{
  label: string;
  value: FiltroStatusAvaliacao;
}> = [
  { label: "Todos", value: "todos" },
  { label: "Pendentes", value: "pending" },
  { label: "Aprovadas", value: "approved" },
  { label: "Ocultas", value: "hidden" }
];

export const LABEL_STATUS_AVALIACAO: Record<ReviewStatus, string> = {
  approved: "Aprovada",
  hidden: "Oculta",
  pending: "Pendente"
};

export function obterVariantStatusAvaliacao(status: ReviewStatus) {
  if (status === "approved") return "success";
  if (status === "hidden") return "warning";
  return "secondary";
}
