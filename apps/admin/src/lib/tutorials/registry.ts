import type { PermissionCode } from "@hospedex/types";

import type { ContextoAutenticacao } from "../auth/types";
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
    id: "configuracoes",
    titulo: "Configurar dados do empreendimento",
    descricao: "Logo, contato, cidade, horários e preferências.",
    href: "/configuracoes",
    dataTour: "configuracoes-gerais",
    permissoes: ["settings.manage"]
  },
  {
    id: "primeira-casa",
    titulo: "Cadastrar a primeira casa",
    descricao: "Base para fotos, valores, regras e disponibilidade.",
    href: "/propriedades",
    dataTour: "casas-lista",
    permissoes: ["properties.read"]
  },
  {
    id: "fotos",
    titulo: "Adicionar fotos da casa",
    descricao: "Defina capa e galeria para a página pública.",
    href: "/propriedades",
    dataTour: "casas-galeria",
    permissoes: ["properties.read"]
  },
  {
    id: "publicacao",
    titulo: "Publicar uma casa",
    descricao: "Deixe a hospedagem pronta para aparecer no Marketplace.",
    href: "/propriedades",
    dataTour: "casas-publicacao",
    permissoes: ["properties.read"]
  },
  {
    id: "calendario",
    titulo: "Revisar disponibilidade",
    descricao: "Bloqueios e reservas usam o calendário da casa.",
    href: "/calendario",
    dataTour: "calendario",
    featureFlag: "calendar",
    permissoes: ["calendar.read", "reservations.read"]
  },
  {
    id: "reserva",
    titulo: "Criar ou acompanhar uma reserva",
    descricao: "Solicitações e reservas manuais aparecem no mesmo fluxo.",
    href: "/reservas",
    dataTour: "reservas",
    featureFlag: "manual_approval",
    permissoes: ["reservations.read"]
  },
  {
    id: "pagamento",
    titulo: "Registrar um pagamento",
    descricao: "Pagamentos recebidos alimentam o Financeiro.",
    href: "/financeiro",
    dataTour: "financeiro",
    permissoes: ["finance.read"]
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
  const permissoesOk = !item.permissoes?.length || item.permissoes.some((p) => contexto.permissions.includes(p));
  return featureOk && permissoesOk;
}
