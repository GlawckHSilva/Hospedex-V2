import type {
  ManagementNotificationStateRow,
  ManagementNotificationType,
  PermissionCode
} from "@hospedex/types";

export type EstadoNotificacaoGerenciamento = Pick<
  ManagementNotificationStateRow,
  "deleted_at" | "notification_key" | "read_at"
>;

export type FiltroStatusNotificacao = "lidas" | "nao_lidas" | "todas";
export type FiltroTipoNotificacao = ManagementNotificationType | "todos";

export type FiltrosNotificacoes = {
  status: FiltroStatusNotificacao;
  tipo: FiltroTipoNotificacao;
};

export type NotificacaoGerenciamento = {
  data: string;
  descricao: string;
  href: string;
  key: string;
  lida: boolean;
  permissoes: PermissionCode[];
  state: EstadoNotificacaoGerenciamento | null;
  tipo: ManagementNotificationType;
  titulo: string;
  tom: "azul" | "laranja" | "roxo" | "verde" | "vermelho";
};

export type ResumoNotificacoesGerenciamento = {
  itens: NotificacaoGerenciamento[];
  totalNaoLidas: number;
};

export type DadosNotificacoesGerenciamento = ResumoNotificacoesGerenciamento & {
  filtros: FiltrosNotificacoes;
  tiposDisponiveis: Array<{ label: string; tipo: FiltroTipoNotificacao }>;
  total: number;
};
