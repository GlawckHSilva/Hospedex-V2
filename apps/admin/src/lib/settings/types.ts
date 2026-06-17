import type {
  FeatureFlagKey,
  TenantCleaningPolicy,
  TenantSettingRow
} from "@hospedex/types";

/**
 * Contratos do modulo de Configuracoes do Gerenciamento.
 *
 * Centralizar estes tipos evita espalhar nomes de campos do banco pela UI e
 * deixa claro quais preferencias pertencem ao tenant autenticado.
 */

export const POLITICAS_LIMPEZA: Array<{
  descricao: string;
  label: string;
  value: TenantCleaningPolicy;
}> = [
  {
    descricao: "Cria limpeza como rotina apos cada check-out.",
    label: "Apos check-out",
    value: "after_checkout"
  },
  {
    descricao: "Operacao com limpeza recorrente diaria.",
    label: "Diaria",
    value: "daily"
  },
  {
    descricao: "Limpeza criada manualmente quando houver necessidade.",
    label: "Sob demanda",
    value: "on_request"
  },
  {
    descricao: "Sem politica automatica no momento.",
    label: "Sem padrao",
    value: "none"
  }
];

export type ChaveModuloGerenciamento =
  | "payments"
  | "cleaning"
  | "inventory"
  | "reports"
  | "staff"
  | "notifications"
  | "confirmations";

export const MODULOS_GERENCIAMENTO_CONFIGURAVEIS: Array<{
  descricao: string;
  key: ChaveModuloGerenciamento;
  label: string;
}> = [
  {
    descricao: "Lancamentos, resumo financeiro e conciliacao futura.",
    key: "payments",
    label: "Financeiro"
  },
  {
    descricao: "Tarefas de limpeza, pos-check-out e status operacional.",
    key: "cleaning",
    label: "Limpeza"
  },
  {
    descricao: "Itens, conservacao e manutencao vinculados ao tenant.",
    key: "inventory",
    label: "Inventario"
  },
  {
    descricao: "Indicadores gerenciais baseados em dados reais.",
    key: "reports",
    label: "Relatorios"
  },
  {
    descricao: "Equipe interna, convites e permissoes.",
    key: "staff",
    label: "Funcionarios"
  },
  {
    descricao: "Avisos internos do painel de gerenciamento.",
    key: "notifications",
    label: "Notificacoes"
  },
  {
    descricao: "Central de check-in, check-out e operacao diaria.",
    key: "confirmations",
    label: "Confirmacoes"
  }
];

export type ConfiguracoesTenantGerenciamento = Pick<
  TenantSettingRow,
  | "allow_manual_reservations"
  | "city"
  | "cleaning_policy"
  | "default_check_in_time"
  | "default_check_out_time"
  | "email"
  | "logo_url"
  | "phone"
  | "primary_color"
  | "require_checkin_confirmation"
  | "require_checkout_confirmation"
  | "require_payment_confirmation"
  | "short_description"
  | "state"
  | "whatsapp"
> & {
  tenantName: string;
};

export type ModuloGerenciamentoConfiguravel = {
  ativo: boolean;
  configuravelPeloProprietario: boolean;
  descricao: string;
  key: FeatureFlagKey;
  label: string;
  liberado: boolean;
  motivoBloqueio: string | null;
};

export type DadosConfiguracoesGerenciamento = {
  configuracoes: ConfiguracoesTenantGerenciamento;
  modulos: ModuloGerenciamentoConfiguravel[];
  podeGerenciarConfiguracoes: boolean;
  podeGerenciarModulos: boolean;
  sessoesFuturasDisponiveis: boolean;
  tenantNome: string;
};

export type SearchParamsConfiguracoes = {
  erro?: string;
  sucesso?: string;
};
