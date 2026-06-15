import type { PermissionCode, UserRole } from "@hospedex/types";

import type { ContextoAutenticacao } from "../lib/auth/types";

export type PerfilMenuAdmin = "proprietario" | "funcionario" | "super_admin";

export type IconeMenuAdmin =
  | "auditoria"
  | "calendario"
  | "configuracoes"
  | "dashboard"
  | "featureFlags"
  | "financeiro"
  | "hospedes"
  | "inventario"
  | "licencas"
  | "limpeza"
  | "planos"
  | "proprietarios"
  | "propriedades"
  | "relatorios"
  | "reservas"
  | "unidades";

export type ItemMenuAdmin = {
  titulo: string;
  href: string;
  descricao: string;
  icone: IconeMenuAdmin;
  featureFlag?: string;
  permissoes?: PermissionCode[];
};

export type ItemMenuAdminResolvido = ItemMenuAdmin & {
  bloqueadoPorFeatureFlag: boolean;
};

const MENU_PROPRIETARIO = [
  {
    titulo: "Dashboard",
    href: "/",
    descricao: "Resumo operacional do tenant.",
    icone: "dashboard"
  },
  {
    titulo: "Propriedades",
    href: "/propriedades",
    descricao: "Estrutura para imóveis e publicação.",
    icone: "propriedades",
    permissoes: ["properties.read"]
  },
  {
    titulo: "Unidades",
    href: "/unidades",
    descricao: "Base para quartos, casas e categorias.",
    icone: "unidades",
    featureFlag: "multi_unit",
    permissoes: ["properties.read"]
  },
  {
    titulo: "Reservas",
    href: "/reservas",
    descricao: "Gestão manual de reservas e status.",
    icone: "reservas",
    featureFlag: "manual_approval",
    permissoes: ["reservations.read"]
  },
  {
    titulo: "Calendário",
    href: "/calendario",
    descricao: "Visão futura de disponibilidade.",
    icone: "calendario",
    featureFlag: "ics_sync",
    permissoes: ["reservations.read"]
  },
  {
    titulo: "Financeiro",
    href: "/financeiro",
    descricao: "Base para receitas, despesas e repasses.",
    icone: "financeiro",
    featureFlag: "payments",
    permissoes: ["finance.read"]
  },
  {
    titulo: "Hóspedes",
    href: "/hospedes",
    descricao: "Estrutura para contatos e histórico.",
    icone: "hospedes",
    featureFlag: "crm",
    permissoes: ["reservations.read"]
  },
  {
    titulo: "Limpeza",
    href: "/limpeza",
    descricao: "Preparado para tarefas operacionais.",
    icone: "limpeza",
    featureFlag: "cleaning",
    permissoes: ["properties.manage"]
  },
  {
    titulo: "Inventário",
    href: "/inventario",
    descricao: "Base para itens e manutenção.",
    icone: "inventario",
    featureFlag: "inventory",
    permissoes: ["properties.manage"]
  },
  {
    titulo: "Relatórios",
    href: "/relatorios",
    descricao: "Estrutura visual para indicadores.",
    icone: "relatorios",
    featureFlag: "reports",
    permissoes: ["finance.read", "reservations.read"]
  },
  {
    titulo: "Configurações",
    href: "/configuracoes",
    descricao: "Tenant, membros, permissões e preferências.",
    icone: "configuracoes",
    permissoes: ["tenants.manage", "members.manage", "roles.manage"]
  }
] as const satisfies readonly ItemMenuAdmin[];

const MENU_SUPER_ADMIN = [
  {
    titulo: "Dashboard global",
    href: "/super-admin",
    descricao: "Visão estrutural da plataforma.",
    icone: "dashboard"
  },
  {
    titulo: "Proprietários",
    href: "/super-admin/proprietarios",
    descricao: "Base para gestão dos clientes.",
    icone: "proprietarios"
  },
  {
    titulo: "Hóspedes",
    href: "/super-admin/hospedes",
    descricao: "Visão global futura de hóspedes.",
    icone: "hospedes"
  },
  {
    titulo: "Planos",
    href: "/super-admin/planos",
    descricao: "Estrutura para catálogo comercial.",
    icone: "planos"
  },
  {
    titulo: "Licenças",
    href: "/super-admin/licencas",
    descricao: "Base para validade e limites.",
    icone: "licencas"
  },
  {
    titulo: "Feature Flags",
    href: "/super-admin/feature-flags",
    descricao: "Controle futuro de recursos por tenant.",
    icone: "featureFlags"
  },
  {
    titulo: "Financeiro global",
    href: "/super-admin/financeiro-global",
    descricao: "Placeholder para visão financeira da plataforma.",
    icone: "financeiro"
  },
  {
    titulo: "Auditoria",
    href: "/super-admin/auditoria",
    descricao: "Base para rastreabilidade administrativa.",
    icone: "auditoria"
  },
  {
    titulo: "Configurações",
    href: "/super-admin/configuracoes",
    descricao: "Preferências globais da plataforma.",
    icone: "configuracoes"
  }
] as const satisfies readonly ItemMenuAdmin[];

/**
 * Define o perfil visual a partir do contexto autenticado.
 *
 * A separação é proposital: o banco usa roles de autorização, enquanto o menu
 * precisa expressar a experiência do Admin para proprietário, equipe e plataforma.
 */
export function obterPerfilMenuAdmin(role: UserRole): PerfilMenuAdmin {
  if (role === "super_admin") return "super_admin";
  if (role === "staff") return "funcionario";
  return "proprietario";
}

export function obterTituloPerfilAdmin(perfil: PerfilMenuAdmin): string {
  if (perfil === "super_admin") return "Super Admin";
  if (perfil === "funcionario") return "Funcionário";
  return "Proprietário";
}

export function obterMenuAdmin(
  contexto: ContextoAutenticacao
): ItemMenuAdminResolvido[] {
  const perfil = obterPerfilMenuAdmin(contexto.role);
  const itensBase: readonly ItemMenuAdmin[] =
    perfil === "super_admin" ? MENU_SUPER_ADMIN : MENU_PROPRIETARIO;

  return itensBase
    .filter((item) => perfil !== "funcionario" || funcionarioPodeVerItem(item, contexto))
    .map((item) => ({
      ...item,
      bloqueadoPorFeatureFlag: Boolean(
        item.featureFlag && !contexto.featureFlags[item.featureFlag]
      )
    }));
}

export function obterItemMenuPorHref(
  contexto: ContextoAutenticacao,
  href: string
): ItemMenuAdminResolvido | null {
  return obterMenuAdmin(contexto).find((item) => item.href === href) ?? null;
}

function funcionarioPodeVerItem(
  item: ItemMenuAdmin,
  contexto: ContextoAutenticacao
): boolean {
  if (item.href === "/") return true;
  if (!item.permissoes?.length) return false;

  // Funcionários só enxergam módulos ligados às permissões carregadas do tenant.
  return item.permissoes.some((permissao) => contexto.permissions.includes(permissao));
}
