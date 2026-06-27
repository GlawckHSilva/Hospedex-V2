import type {
  CleaningTaskRow,
  ProfileRow,
  PropertyRow,
  ReservationGuestRow,
  ReservationRow,
  TransactionRow
} from "@hospedex/types";

export type TipoConfirmacao =
  | "checkin"
  | "checkout"
  | "limpeza"
  | "pagamento"
  | "pendente";

export type ReservaConfirmacao = ReservationRow & {
  hospedePrincipal: ReservationGuestRow | null;
  lancamentoFinanceiro: TransactionRow | null;
  propriedade: PropertyRow | null;
  timeline: EventoTimelineConfirmacao[];
};

export type LimpezaConfirmacao = CleaningTaskRow & {
  propriedade: PropertyRow | null;
  reserva: ReservationRow | null;
};

export type EventoTimelineConfirmacao = {
  autor: ProfileRow | null;
  data: string;
  descricao: string;
  id: string;
  tipo: "limpeza" | "nota" | "status";
};

export type NotificacaoOperacao = {
  descricao: string;
  id: string;
  tipo:
    | "checkin_hoje"
    | "checkout_hoje"
    | "limpeza_pendente"
    | "nova_reserva"
    | "pagamento_pendente"
    | "pagamento_recebido"
    | "reserva_cancelada";
};

export type DadosConfirmacoes = {
  aguardandoPagamento: ReservaConfirmacao[];
  checkInsHoje: ReservaConfirmacao[];
  checkOutsHoje: ReservaConfirmacao[];
  hoje: string;
  limpezasPendentes: LimpezaConfirmacao[];
  notificacoes: NotificacaoOperacao[];
  pagamentosRecebidos: ReservaConfirmacao[];
  podeGerenciarLimpeza: boolean;
  podeGerenciarOperacao: boolean;
  podeGerenciarPagamento: boolean;
  podeLer: boolean;
  pendentes: ReservaConfirmacao[];
  resumo: {
    aguardandoPagamento: number;
    checkInsHoje: number;
    checkOutsHoje: number;
    limpezasPendentes: number;
    pagamentosRecebidos: number;
    pendentes: number;
  };
  tenantNome: string;
  timeline: EventoTimelineConfirmacao[];
};

export type SearchParamsConfirmacoes = {
  erro?: string | undefined;
  sucesso?: string | undefined;
};
