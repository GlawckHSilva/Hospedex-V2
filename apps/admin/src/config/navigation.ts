import type { PermissionCode, UserRole } from "@hospedex/types";

import type { ContextoAutenticacao } from "../lib/auth/types";

export type PerfilMenuAdmin = "proprietario" | "funcionario" | "super_admin";

export type IconeMenuAdmin =
  | "auditoria"
  | "avaliacoes"
  | "calendario"
  | "confirmacoes"
  | "configuracoes"
  | "dashboard"
  | "featureFlags"
  | "financeiro"
  | "funcionarios"
  | "guiaRegiao"
  | "hospedes"
  | "inventario"
  | "licencas"
  | "limpeza"
  | "planos"
  | "proprietarios"
  | "propriedades"
  | "relatorios"
  | "reservas"
  | "servicosExtras"
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
    icone: "dashboard",
    permissoes: ["dashboard.read"]
  },
  {
    titulo: "Casas",
    href: "/propriedades",
    descricao: "Casas e propriedades do tenant.",
    icone: "propriedades",
    permissoes: ["properties.read"]
  },
  {
    titulo: "Confirmacoes",
    href: "/confirmacoes",
    descricao: "Check-ins, check-outs e pendencias do dia.",
    icone: "confirmacoes",
    permissoes: ["reservations.read", "cleaning.read"]
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
    descricao: "Gestao manual de reservas e status.",
    icone: "reservas",
    featureFlag: "manual_approval",
    permissoes: ["reservations.read"]
  },
  {
    titulo: "Servicos extras",
    href: "/servicos-extras",
    descricao: "Catalogo de adicionais para reservas futuras.",
    icone: "servicosExtras",
    featureFlag: "extra_services",
    permissoes: ["reservations.read", "reservations.manage"]
  },
  {
    titulo: "Avaliacoes",
    href: "/avaliacoes",
    descricao: "Notas, comentarios e respostas internas.",
    icone: "avaliacoes",
    featureFlag: "reviews",
    permissoes: ["reviews.read"]
  },
  {
    titulo: "Calendario",
    href: "/calendario",
    descricao: "Disponibilidade, bloqueios e reservas.",
    icone: "calendario",
    permissoes: ["calendar.read", "reservations.read"]
  },
  {
    titulo: "Financeiro",
    href: "/financeiro",
    descricao: "Receitas, despesas e lançamentos manuais.",
    icone: "financeiro",
    permissoes: ["finance.read"]
  },
  {
    titulo: "Hospedes",
    href: "/hospedes",
    descricao: "Estrutura para contatos e historico.",
    icone: "hospedes",
    featureFlag: "crm",
    permissoes: ["reservations.read"]
  },
  {
    titulo: "Guia da regiao",
    href: "/guia-regiao",
    descricao: "Recomendacoes locais do tenant.",
    icone: "guiaRegiao",
    featureFlag: "regional_guide",
    permissoes: ["properties.read", "properties.manage", "settings.manage"]
  },
  {
    titulo: "Limpeza",
    href: "/limpeza",
    descricao: "Preparado para tarefas operacionais.",
    icone: "limpeza",
    featureFlag: "cleaning",
    permissoes: ["cleaning.read", "cleaning.manage"]
  },
  {
    titulo: "Inventario",
    href: "/inventario",
    descricao: "Base para itens e manutencao.",
    icone: "inventario",
    featureFlag: "inventory",
    permissoes: ["inventory.read", "inventory.manage"]
  },
  {
    titulo: "Relatorios",
    href: "/relatorios",
    descricao: "Estrutura visual para indicadores.",
    icone: "relatorios",
    featureFlag: "reports",
    permissoes: ["reports.read", "finance.read", "reservations.read"]
  },
  {
    titulo: "Funcionarios",
    href: "/funcionarios",
    descricao: "Equipe, convites, cargos e permissoes.",
    icone: "funcionarios",
    featureFlag: "staff",
    permissoes: ["members.manage", "roles.manage"]
  },
  {
    titulo: "Configuracoes",
    href: "/configuracoes",
    descricao: "Tenant, membros, permissoes e preferencias.",
    icone: "configuracoes",
    permissoes: ["settings.manage", "tenants.manage", "members.manage", "roles.manage"]
  }
] as const satisfies readonly ItemMenuAdmin[];

const MENU_SUPER_ADMIN = [
  {
    titulo: "Dashboard global",
    href: "/super-admin",
    descricao: "Visao estrutural da plataforma.",
    icone: "dashboard"
  },
  {
    titulo: "Proprietarios",
    href: "/super-admin/proprietarios",
    descricao: "Base para gestao dos clientes.",
    icone: "proprietarios"
  },
  {
    titulo: "Hospedes",
    href: "/super-admin/hospedes",
    descricao: "Visao global futura de hospedes.",
    icone: "hospedes"
  },
  {
    titulo: "Planos",
    href: "/super-admin/planos",
    descricao: "Estrutura para catalogo comercial.",
    icone: "planos"
  },
  {
    titulo: "Licencas",
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
    titulo: "Auditoria",
    href: "/super-admin/auditoria",
    descricao: "Base para rastreabilidade administrativa.",
    icone: "auditoria"
  },
  {
    titulo: "Configuracoes",
    href: "/super-admin/configuracoes",
    descricao: "Preferencias globais da plataforma.",
    icone: "configuracoes"
  }
] as const satisfies readonly ItemMenuAdmin[];

/**
 * Define o perfil visual a partir do contexto autenticado.
 *
 * A separacao e proposital: o banco usa roles de autorizacao, enquanto o menu
 * precisa expressar a experiencia do Admin para proprietario, equipe e plataforma.
 */
export function obterPerfilMenuAdmin(role: UserRole): PerfilMenuAdmin {
  if (role === "super_admin") return "super_admin";
  if (role === "staff") return "funcionario";
  return "proprietario";
}

export function obterTituloPerfilAdmin(perfil: PerfilMenuAdmin): string {
  if (perfil === "super_admin") return "Super Admin";
  if (perfil === "funcionario") return "Funcionario";
  return "Proprietario";
}

export function obterMenuAdmin(
  contexto: ContextoAutenticacao
): ItemMenuAdminResolvido[] {
  const perfil = obterPerfilMenuAdmin(contexto.role);
  const itensBase: readonly ItemMenuAdmin[] =
    perfil === "super_admin" ? MENU_SUPER_ADMIN : MENU_PROPRIETARIO;

  return itensBase
    .filter((item) => item.href !== "/unidades" || contexto.featureFlags.multi_unit)
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
  if (!item.permissoes?.length) return false;

  // Funcionarios so enxergam modulos ligados as permissoes carregadas do tenant.
  return item.permissoes.some((permissao) => contexto.permissions.includes(permissao));
}
