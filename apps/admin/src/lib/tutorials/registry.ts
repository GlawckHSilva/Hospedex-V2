import type { PermissionCode } from "@hospedex/types";

import type { ContextoAutenticacao } from "../auth/types";
import type { TutorialTourKey } from "./tour-registry";
import type { TutorialEtapa } from "./types";

export const TUTORIAL_GERENCIAMENTO_KEY = "gerenciamento-primeiros-passos";
export const TUTORIAL_WELCOME_KEY = "boas-vindas-gerenciamento";
export const TUTORIAL_VERSION = 1;

type ChecklistBase = Omit<TutorialEtapa, "concluida" | "bloqueada"> & {
  featureFlag?: string;
  permissoes?: PermissionCode[];
};

const CHECKLIST_BASE: ChecklistBase[] = [
  {
    actionLabel: "Configurar negócio",
    dataTour: "configuracoes-gerais",
    descricao: "Complete dados públicos, contato e preferências básicas.",
    href: "/configuracoes",
    id: "configuracoes",
    permissoes: ["settings.manage"],
    titulo: "Completar os dados do negócio",
    tourKey: "dashboard:introduction:v1" as TutorialTourKey
  },
  {
    actionLabel: "Cadastrar casa",
    dataTour: "casas-lista",
    descricao: "Adicione localização, capacidade e informações principais.",
    href: "/propriedades",
    id: "primeira-casa",
    permissoes: ["properties.read"],
    titulo: "Cadastrar a primeira casa",
    tourKey: "properties:first-property:v1" as TutorialTourKey
  },
  {
    actionLabel: "Revisar casa",
    dataTour: "casas-galeria",
    descricao: "Inclua imagem principal, diária e dados mínimos da hospedagem.",
    href: "/propriedades",
    id: "basicos",
    permissoes: ["properties.read"],
    titulo: "Adicionar foto principal e valores",
    tourKey: "properties:first-property:v1" as TutorialTourKey
  },
  {
    actionLabel: "Abrir calendário",
    dataTour: "calendario",
    descricao: "Revise bloqueios e formas de cobrança antes de publicar.",
    featureFlag: "calendar",
    href: "/calendario",
    id: "disponibilidade-cobranca",
    permissoes: ["calendar.read", "settings.manage"],
    titulo: "Configurar disponibilidade e cobrança",
    tourKey: "dashboard:introduction:v1" as TutorialTourKey
  },
  {
    actionLabel: "Publicar casa",
    dataTour: "casas-publicacao",
    descricao: "Finalize a hospedagem somente quando estiver pronta.",
    href: "/propriedades",
    id: "publicacao",
    permissoes: ["properties.read"],
    titulo: "Publicar a casa no Marketplace",
    tourKey: "properties:first-property:v1" as TutorialTourKey
  }
];

export function obterChecklistPermitido(
  contexto: ContextoAutenticacao,
  concluidas: Record<string, boolean>
): TutorialEtapa[] {
  return CHECKLIST_BASE.filter((item) => itemPermitido(contexto, item)).map((item) => ({
    ...item,
    concluida: Boolean(concluidas[item.id])
  }));
}

function itemPermitido(contexto: ContextoAutenticacao, item: ChecklistBase) {
  if (contexto.role === "owner") {
    return !item.featureFlag || contexto.featureFlags[item.featureFlag];
  }

  const featureOk = !item.featureFlag || contexto.featureFlags[item.featureFlag];
  const permissoesOk =
    !item.permissoes?.length ||
    item.permissoes.some((permissao) => contexto.permissions.includes(permissao));
  return featureOk && permissoesOk;
}
