import type {
  InventoryItemRow,
  MaintenanceTaskRow,
  ProfileRow,
  PropertyRow,
  TenantMemberRow
} from "@hospedex/types";

import type { ContextoAutenticacao } from "../auth/types";
import { criarClienteSupabaseServer } from "../supabase/server";
import { podeGerenciarInventario, podeLerInventario } from "./permissions";
import type {
  DadosModuloInventario,
  FiltrosInventario,
  ItemInventarioCompleto,
  TarefaManutencaoCompleta
} from "./types";

/**
 * Leitura do Inventario.
 *
 * As consultas sempre partem do tenant autenticado. Filtros de propriedade e
 * propriedade refinam a visao, mas nunca alteram o escopo de seguranca.
 */

export async function carregarDadosModuloInventario(
  contexto: ContextoAutenticacao,
  filtros: FiltrosInventario
): Promise<DadosModuloInventario> {
  const tenantId = contexto.tenant?.id;
  const ownerId = contexto.tenant?.owner_id;

  if (!tenantId || !ownerId || !podeLerInventario(contexto)) {
    return criarDadosVazios(contexto, filtros);
  }

  const supabase = await criarClienteSupabaseServer();
  const [propriedadesResultado, itensResultado, tarefasResultado] =
    await Promise.all([
      supabase
        .from("properties")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("owner_id", ownerId)
        .is("deleted_at", null)
        .order("name", { ascending: true })
        .returns<PropertyRow[]>(),
      criarConsultaItens(tenantId, filtros),
      criarConsultaTarefas(tenantId, filtros)
    ]);

  registrarErro("propriedades", propriedadesResultado.error);
  registrarErro("itens de inventario", itensResultado.error);
  registrarErro("tarefas de manutencao", tarefasResultado.error);

  const propriedades = propriedadesResultado.data ?? [];
  const itens = montarItens(itensResultado.data ?? [], propriedades);
  const responsaveis = await carregarResponsaveis(tenantId, ownerId);
  const tarefas = montarTarefas(
    tarefasResultado.data ?? [],
    propriedades,
    itensResultado.data ?? [],
    responsaveis
  );

  return {
    filtros,
    itens,
    podeGerenciar: podeGerenciarInventario(contexto),
    propriedades,
    responsaveis,
    resumo: {
      danificados: itens.filter((item) => item.conservation_state === "damaged").length,
      faltando: itens.filter((item) => item.conservation_state === "missing").length,
      itens: itens.length,
      manutencoesPendentes: tarefas.filter((tarefa) => tarefa.status === "pending").length
    },
    tarefas,
    tenantNome: contexto.tenant?.name ?? "Tenant"
  };
}

async function criarConsultaItens(tenantId: string, filtros: FiltrosInventario) {
  const supabase = await criarClienteSupabaseServer();
  let consulta = supabase
    .from("inventory_items")
    .select("*")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (filtros.propriedadeId) consulta = consulta.eq("property_id", filtros.propriedadeId);
  return consulta.returns<InventoryItemRow[]>();
}

async function criarConsultaTarefas(tenantId: string, filtros: FiltrosInventario) {
  const supabase = await criarClienteSupabaseServer();
  let consulta = supabase
    .from("maintenance_tasks")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (filtros.propriedadeId) consulta = consulta.eq("property_id", filtros.propriedadeId);
  return consulta.returns<MaintenanceTaskRow[]>();
}

async function carregarResponsaveis(tenantId: string, ownerId: string) {
  const supabase = await criarClienteSupabaseServer();
  const { data: membros } = await supabase
    .from("tenant_members")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .returns<TenantMemberRow[]>();

  const ids = Array.from(new Set([ownerId, ...(membros ?? []).map((membro) => membro.user_id)]));
  if (ids.length === 0) return [];

  const { data } = await supabase.from("profiles").select("*").in("id", ids).returns<ProfileRow[]>();
  return data ?? [];
}

function montarItens(
  itens: InventoryItemRow[],
  propriedades: PropertyRow[]
): ItemInventarioCompleto[] {
  return itens.map((item) => ({
    ...item,
    propriedade:
      propriedades.find((propriedade) => propriedade.id === item.property_id) ?? null
  }));
}

function montarTarefas(
  tarefas: MaintenanceTaskRow[],
  propriedades: PropertyRow[],
  itens: InventoryItemRow[],
  responsaveis: ProfileRow[]
): TarefaManutencaoCompleta[] {
  return tarefas.map((tarefa) => ({
    ...tarefa,
    item: itens.find((item) => item.id === tarefa.inventory_item_id) ?? null,
    propriedade:
      propriedades.find((propriedade) => propriedade.id === tarefa.property_id) ?? null,
    responsavel: responsaveis.find((responsavel) => responsavel.id === tarefa.assigned_to) ?? null
  }));
}

function criarDadosVazios(
  contexto: ContextoAutenticacao,
  filtros: FiltrosInventario
): DadosModuloInventario {
  return {
    filtros,
    itens: [],
    podeGerenciar: false,
    propriedades: [],
    responsaveis: [],
    resumo: {
      danificados: 0,
      faltando: 0,
      itens: 0,
      manutencoesPendentes: 0
    },
    tarefas: [],
    tenantNome: contexto.tenant?.name ?? "Tenant"
  };
}

function registrarErro(modulo: string, erro: { message: string } | null) {
  if (!erro) return;
  throw new Error(`Erro ao carregar ${modulo}: ${erro.message}`);
}
