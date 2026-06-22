import type { PermissionCode } from "@hospedex/types";

export type CargoInicial = {
  code: string;
  description: string;
  name: string;
  permissoes: PermissionCode[];
};

export const CARGOS_INICIAIS: CargoInicial[] = [
  {
    code: "administrador",
    description: "Acesso amplo aos modulos do tenant.",
    name: "Administrador",
    permissoes: [
      "dashboard.read",
      "tenants.manage",
      "members.manage",
      "roles.manage",
      "properties.read",
      "properties.manage",
      "reservations.read",
      "reservations.manage",
      "calendar.read",
      "calendar.manage",
      "finance.read",
      "finance.manage",
      "cleaning.read",
      "cleaning.manage",
      "inventory.read",
      "inventory.manage",
      "integrations.read",
      "integrations.manage",
      "reports.read",
      "settings.manage"
    ]
  },
  {
    code: "recepcao",
    description: "Atendimento, reservas e calendario.",
    name: "Recepcao",
    permissoes: [
      "dashboard.read",
      "properties.read",
      "reservations.read",
      "reservations.manage",
      "calendar.read",
      "calendar.manage"
    ]
  },
  {
    code: "limpeza",
    description: "Rotinas de limpeza e calendario.",
    name: "Limpeza",
    permissoes: ["dashboard.read", "calendar.read", "cleaning.read", "cleaning.manage"]
  },
  {
    code: "financeiro",
    description: "Financeiro e relatorios.",
    name: "Financeiro",
    permissoes: ["dashboard.read", "finance.read", "finance.manage", "reports.read"]
  },
  {
    code: "manutencao",
    description: "Propriedades, inventario e calendario.",
    name: "Manutencao",
    permissoes: [
      "dashboard.read",
      "properties.read",
      "properties.manage",
      "calendar.read",
      "inventory.read",
      "inventory.manage"
    ]
  }
];

export const PERMISSOES_MODULO: Array<{
  code: PermissionCode;
  label: string;
  modulo: string;
}> = [
  { code: "dashboard.read", label: "Dashboard", modulo: "Dashboard" },
  { code: "properties.read", label: "Ver propriedades", modulo: "Propriedades" },
  { code: "properties.manage", label: "Gerenciar propriedades", modulo: "Propriedades" },
  { code: "reservations.read", label: "Ver reservas", modulo: "Reservas" },
  { code: "reservations.manage", label: "Gerenciar reservas", modulo: "Reservas" },
  { code: "calendar.read", label: "Ver calendario", modulo: "Calendario" },
  { code: "calendar.manage", label: "Gerenciar calendario", modulo: "Calendario" },
  { code: "finance.read", label: "Ver financeiro", modulo: "Financeiro" },
  { code: "finance.manage", label: "Gerenciar financeiro", modulo: "Financeiro" },
  { code: "cleaning.read", label: "Ver limpeza", modulo: "Limpeza" },
  { code: "cleaning.manage", label: "Gerenciar limpeza", modulo: "Limpeza" },
  { code: "inventory.read", label: "Ver inventario", modulo: "Inventario" },
  { code: "inventory.manage", label: "Gerenciar inventario", modulo: "Inventario" },
  { code: "integrations.read", label: "Ver integracoes", modulo: "Integracoes" },
  {
    code: "integrations.manage",
    label: "Gerenciar integracoes",
    modulo: "Integracoes"
  },
  { code: "reports.read", label: "Relatorios", modulo: "Relatorios" },
  { code: "settings.manage", label: "Configuracoes", modulo: "Configuracoes" }
];
