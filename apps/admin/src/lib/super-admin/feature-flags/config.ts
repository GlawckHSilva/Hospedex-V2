export type FeatureFlagControladaConfig = {
  descricao: string;
  key: string;
  label: string;
  module: string;
  ownerConfigurable: boolean;
};

export const FEATURE_FLAGS_CONTROLADAS: FeatureFlagControladaConfig[] = [
  {
    descricao: "Modulo financeiro operacional.",
    key: "payments",
    label: "Financeiro",
    module: "finance",
    ownerConfigurable: true
  },
  {
    descricao: "Controle de inventario por propriedade.",
    key: "inventory",
    label: "Inventario",
    module: "inventory",
    ownerConfigurable: true
  },
  {
    descricao: "Operacao de limpeza e tarefas.",
    key: "cleaning",
    label: "Limpeza",
    module: "cleaning",
    ownerConfigurable: true
  },
  {
    descricao: "Relatorios gerenciais do proprietario.",
    key: "reports",
    label: "Relatorios",
    module: "reports",
    ownerConfigurable: true
  },
  {
    descricao: "Usuarios internos e permissoes de equipe.",
    key: "staff",
    label: "Funcionarios",
    module: "staff",
    ownerConfigurable: true
  },
  {
    descricao: "Notificacoes internas do gerenciamento.",
    key: "notifications",
    label: "Notificacoes",
    module: "notifications",
    ownerConfigurable: true
  },
  {
    descricao: "Central de confirmacoes operacionais.",
    key: "confirmations",
    label: "Confirmacoes",
    module: "confirmations",
    ownerConfigurable: true
  },
  {
    descricao: "Calendario e disponibilidade por unidade.",
    key: "calendar",
    label: "Calendario",
    module: "calendar",
    ownerConfigurable: true
  },
  {
    descricao: "Catalogo de servicos extras do gerenciamento.",
    key: "extra_services",
    label: "Servicos extras",
    module: "reservations",
    ownerConfigurable: true
  },
  {
    descricao: "Guia da regiao administrado pelo proprietario.",
    key: "regional_guide",
    label: "Guia da regiao",
    module: "marketplace",
    ownerConfigurable: true
  },
  {
    descricao: "Preparacao para API publica futura.",
    key: "api_future",
    label: "API futura",
    module: "api",
    ownerConfigurable: false
  }
];
