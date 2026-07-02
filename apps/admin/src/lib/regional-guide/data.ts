import type {
  RegionalGuideLocationRow
} from "@hospedex/types";

import type { ContextoAutenticacao } from "../auth/types";
import { criarClienteSupabaseServer } from "../supabase/server";
import {
  CATEGORIAS_GUIA_REGIAO,
  STATUS_GUIA_REGIAO,
  type DadosModuloGuiaRegiao,
  type FiltroCategoriaGuiaRegiao,
  type FiltroStatusGuiaRegiao,
  type FiltrosGuiaRegiao
} from "./types";

/**
 * Leitura do Guia da Regiao.
 *
 * O tenant vem do contexto autenticado para evitar mistura de recomendacoes
 * entre proprietarios. A RLS no banco replica a mesma protecao.
 */

export function podeLerGuiaRegiao(contexto: ContextoAutenticacao): boolean {
  if (contexto.role === "owner") return true;
  if (contexto.role === "super_admin") return false;

  return contexto.permissions.some((permissao) =>
    ["properties.read", "properties.manage", "settings.manage"].includes(permissao)
  );
}

export function podeGerenciarGuiaRegiao(contexto: ContextoAutenticacao): boolean {
  if (contexto.role === "owner") return true;

  return contexto.permissions.some((permissao) =>
    ["properties.manage", "settings.manage"].includes(permissao)
  );
}

export async function carregarDadosGuiaRegiao(
  contexto: ContextoAutenticacao,
  filtros: FiltrosGuiaRegiao
): Promise<DadosModuloGuiaRegiao> {
  const tenant = contexto.tenant;
  if (!tenant) return criarDadosVazios(filtros, "Tenant nao encontrado");

  const supabase = await criarClienteSupabaseServer();
  const { data, error } = await supabase
    .from("regional_guide_locations")
    .select("*")
    .eq("tenant_id", tenant.id)
    .is("deleted_at", null)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false })
    .returns<RegionalGuideLocationRow[]>();

  if (error) console.error("Erro ao carregar guia da regiao.", error.message);

  const locais = (data ?? []).filter((local) => correspondeFiltros(local, filtros));

  return {
    filtros,
    locais,
    podeGerenciar: podeGerenciarGuiaRegiao(contexto),
    resumo: montarResumo(data ?? []),
    tenantNome: tenant.name
  };
}

export function normalizarCategoriaGuiaRegiao(
  valor: string | undefined
): FiltroCategoriaGuiaRegiao {
  const categorias = CATEGORIAS_GUIA_REGIAO.map((categoria) => categoria.value);
  if (categorias.includes(valor as FiltroCategoriaGuiaRegiao)) {
    return valor as FiltroCategoriaGuiaRegiao;
  }
  return "todas";
}

export function normalizarStatusGuiaRegiao(
  valor: string | undefined
): FiltroStatusGuiaRegiao {
  const status = STATUS_GUIA_REGIAO.map((item) => item.value);
  if (status.includes(valor as FiltroStatusGuiaRegiao)) {
    return valor as FiltroStatusGuiaRegiao;
  }
  return "todos";
}

function correspondeFiltros(
  local: RegionalGuideLocationRow,
  filtros: FiltrosGuiaRegiao
): boolean {
  if (filtros.status !== "todos" && local.status !== filtros.status) return false;
  if (filtros.categoria !== "todas" && local.category !== filtros.categoria) return false;
  if (filtros.busca && !correspondeBusca(local, filtros.busca)) return false;
  return true;
}

function montarResumo(locais: RegionalGuideLocationRow[]) {
  return {
    ativos: locais.filter((local) => local.status === "active").length,
    categorias: new Set(locais.map((local) => local.category)).size,
    inativos: locais.filter((local) => local.status === "inactive").length,
    total: locais.length
  };
}

function correspondeBusca(local: RegionalGuideLocationRow, busca: string) {
  // A busca textual e aplicada apos o isolamento por tenant. Isso evita expor
  // dados de outros proprietarios e permite localizar por categoria traduzida.
  const termo = normalizarTexto(busca);
  const conteudo = [
    local.name,
    local.address,
    local.description,
    local.opening_hours,
    local.phone,
    local.whatsapp,
    CATEGORIAS_GUIA_REGIAO.find((categoria) => categoria.value === local.category)?.label
  ]
    .filter(Boolean)
    .join(" ");

  return normalizarTexto(conteudo).includes(termo);
}

function normalizarTexto(valor: string) {
  return valor
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function criarDadosVazios(
  filtros: FiltrosGuiaRegiao,
  tenantNome: string
): DadosModuloGuiaRegiao {
  return {
    filtros,
    locais: [],
    podeGerenciar: false,
    resumo: {
      ativos: 0,
      categorias: 0,
      inativos: 0,
      total: 0
    },
    tenantNome
  };
}
