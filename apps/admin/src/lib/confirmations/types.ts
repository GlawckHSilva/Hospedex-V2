import type {
  CleaningTaskRow,
  ProfileRow,
  PropertyRow,
  ReservationGuestRow,
  ReservationRow
} from "@hospedex/types";

export type TipoConfirmacao =
  | "checkin"
  | "checkout"
  | "limpeza"
  | "pagamento"
  | "pendente";

export type ReservaConfirmacao = ReservationRow & {
  hospedePrincipal: ReservationGuestRow | null;
  propriedade: PropertyRow | null;
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
  podeGerenciarLimpeza: boolean;
  podeGerenciarOperacao: boolean;
  podeLer: boolean;
  pendentes: ReservaConfirmacao[];
  resumo: {
    aguardandoPagamento: number;
    checkInsHoje: number;
    checkOutsHoje: number;
    limpezasPendentes: number;
    pendentes: number;
  };
  tenantNome: string;
  timeline: EventoTimelineConfirmacao[];
};

export type SearchParamsConfirmacoes = {
  erro?: string | undefined;
  sucesso?: string | undefined;
};
