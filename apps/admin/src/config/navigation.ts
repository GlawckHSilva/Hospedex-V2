import type { PermissionCode, UserRole } from "@hospedex/types";

import type { ContextoAutenticacao } from "../lib/auth/types";

export type PerfilMenuAdmin = "proprietario" | "funcionario" | "super_admin";

export type IconeMenuAdmin =
  | "auditoria"
  | "avaliacoes"
  | "calendario"
  | "configuracoes"
  | "dashboard"
  | "email"
  | "featureFlags"
  | "financeiro"
  | "funcionarios"
  | "ajuda"
  | "guiaRegiao"
  | "hospedes"
  | "inventario"
  | "integracoes"
  | "licencas"
  | "limpeza"
  | "pendencias"
  | "planos"
  | "proprietarios"
  | "propriedades"
  | "relatorios"
  | "reservas"
  | "servicosExtras"
  | "templatesEmail";

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
    titulo: "Reservas",
    href: "/reservas",
    descricao: "Gestão completa de reservas e status.",
    icone: "reservas",
    featureFlag: "manual_approval",
    permissoes: ["reservations.read"]
  },
  {
    titulo: "Pendências",
    href: "/pendencias",
    descricao: "Central de ações que exigem atenção.",
    icone: "pendencias",
    featureFlag: "confirmations",
    permissoes: ["reservations.read", "cleaning.read"]
  },
  {
    titulo: "Calendário",
    href: "/calendario",
    descricao: "Disponibilidade, bloqueios e reservas.",
    icone: "calendario",
    featureFlag: "calendar",
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
    permissoes: ["cleaning.read", "cleaning.manage"]
  },
  {
    titulo: "Serviços extras",
    href: "/servicos-extras",
    descricao: "Catálogo de adicionais para reservas futuras.",
    icone: "servicosExtras",
    featureFlag: "extra_services",
    permissoes: ["reservations.read", "reservations.manage"]
  },
  {
    titulo: "Guia da região",
    href: "/guia-regiao",
    descricao: "Recomendações locais do tenant.",
    icone: "guiaRegiao",
    featureFlag: "regional_guide",
    permissoes: ["properties.read", "properties.manage", "settings.manage"]
  },
  {
    titulo: "Avaliações",
    href: "/avaliacoes",
    descricao: "Notas, comentários e respostas internas.",
    icone: "avaliacoes",
    featureFlag: "reviews",
    permissoes: ["reviews.read"]
  },
  {
    titulo: "Inventário",
    href: "/inventario",
    descricao: "Base para itens e manutenção.",
    icone: "inventario",
    featureFlag: "inventory",
    permissoes: ["inventory.read", "inventory.manage"]
  },
  {
    titulo: "Relatórios",
    href: "/relatorios",
    descricao: "Estrutura visual para indicadores.",
    icone: "relatorios",
    featureFlag: "reports",
    permissoes: ["reports.read", "finance.read", "reservations.read"]
  },
  {
    titulo: "Funcionários",
    href: "/funcionarios",
    descricao: "Equipe, convites, cargos e permissões.",
    icone: "funcionarios",
    featureFlag: "staff",
    permissoes: ["members.manage", "roles.manage"]
  },
  {
    titulo: "Integrações",
    href: "/integracoes",
    descricao: "Conexões externas e sincronizações do tenant.",
    icone: "integracoes",
    featureFlag: "integrations",
    permissoes: ["integrations.read", "integrations.manage"]
  },
  {
    titulo: "E-mail",
    href: "/email",
    descricao: "Central visual de notificações por e-mail.",
    icone: "email",
    featureFlag: "integrations",
    permissoes: ["integrations.read", "integrations.manage"]
  },
  {
    titulo: "Templates de e-mail",
    href: "/templates-email",
    descricao: "Modelos enviados aos hóspedes.",
    icone: "templatesEmail",
    featureFlag: "integrations",
    permissoes: ["integrations.read", "integrations.manage"]
  },
  {
    titulo: "Configurações",
    href: "/configuracoes",
    descricao: "Preferências do tenant e módulos liberados.",
    icone: "configuracoes",
    permissoes: ["settings.manage"]
  },
  {
    titulo: "Ajuda",
    href: "/ajuda",
    descricao: "Tutoriais e primeiros passos do Gerenciamento.",
    icone: "ajuda",
    permissoes: ["dashboard.read", "properties.read", "reservations.read"]
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
    titulo: "Empreendimentos",
    href: "/super-admin/empreendimentos",
    descricao: "Controle dos tenants e operacao liberada.",
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
    .filter((item) => !item.featureFlag || contexto.featureFlags[item.featureFlag])
    .map((item) => ({
      ...item,
      bloqueadoPorFeatureFlag: false
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

  // Funcionários só enxergam módulos ligados às permissões carregadas do tenant.
  return item.permissoes.some((permissao) => contexto.permissions.includes(permissao));
}
