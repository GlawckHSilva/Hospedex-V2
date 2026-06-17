import type { InventoryItemRow, MaintenanceTaskRow, PropertyRow, UnitRow } from "@hospedex/types";
import { redirect } from "next/navigation";

import { exigirAutenticacao } from "../auth/context";
import type { ContextoAutenticacao } from "../auth/types";
import { criarClienteSupabaseServer } from "../supabase/server";

/**
 * Permissoes do Inventario.
 *
 * O tenant e owner nunca vem do formulario. Toda action resolve o escopo pelo
 * contexto autenticado para preservar isolamento multi-tenant.
 */

export class ErroRegraInventario extends Error {}

export type ClienteSupabaseServer = Awaited<ReturnType<typeof criarClienteSupabaseServer>>;

export type EscopoInventario = {
  contexto: ContextoAutenticacao;
  tenantId: string;
  ownerId: string;
  userId: string;
};

export function inventarioAtivo(contexto: ContextoAutenticacao): boolean {
  return Boolean(contexto.featureFlags.inventory);
}

export function podeLerInventario(contexto: ContextoAutenticacao): boolean {
  if (!inventarioAtivo(contexto)) return false;
  if (contexto.role === "owner") return true;
  return contexto.permissions.includes("inventory.read");
}

export function podeGerenciarInventario(contexto: ContextoAutenticacao): boolean {
  if (!inventarioAtivo(contexto)) return false;
  if (contexto.role === "owner") return true;
  return contexto.permissions.includes("inventory.manage");
}

export async function carregarEscopoInventario(): Promise<EscopoInventario> {
  const contexto = await exigirAutenticacao();

  if (!contexto.tenant || !podeGerenciarInventario(contexto)) {
    redirect("/sem-acesso");
  }

  return {
    contexto,
    tenantId: contexto.tenant.id,
    ownerId: contexto.tenant.owner_id,
    userId: contexto.userId
  };
}

export async function carregarPropriedadeInventario(
  supabase: ClienteSupabaseServer,
  escopo: EscopoInventario,
  propriedadeId: string
) {
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", propriedadeId)
    .eq("tenant_id", escopo.tenantId)
    .eq("owner_id", escopo.ownerId)
    .is("deleted_at", null)
    .maybeSingle<PropertyRow>();

  if (error || !data) throw new ErroRegraInventario("Propriedade nao encontrada.");
  return data;
}

export async function carregarUnidadeInventario(
  supabase: ClienteSupabaseServer,
  escopo: EscopoInventario,
  unidadeId: string,
  propriedadeId: string
) {
  const { data, error } = await supabase
    .from("units")
    .select("*")
    .eq("id", unidadeId)
    .eq("tenant_id", escopo.tenantId)
    .eq("property_id", propriedadeId)
    .maybeSingle<UnitRow>();

  if (error || !data) throw new ErroRegraInventario("Unidade nao encontrada.");
  return data;
}

export async function carregarItemInventario(
  supabase: ClienteSupabaseServer,
  escopo: EscopoInventario,
  itemId: string
) {
  const { data, error } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("id", itemId)
    .eq("tenant_id", escopo.tenantId)
    .eq("owner_id", escopo.ownerId)
    .is("deleted_at", null)
    .maybeSingle<InventoryItemRow>();

  if (error || !data) throw new ErroRegraInventario("Item de inventario nao encontrado.");
  return data;
}

export async function carregarTarefaManutencao(
  supabase: ClienteSupabaseServer,
  escopo: EscopoInventario,
  tarefaId: string
) {
  const { data, error } = await supabase
    .from("maintenance_tasks")
    .select("*")
    .eq("id", tarefaId)
    .eq("tenant_id", escopo.tenantId)
    .eq("owner_id", escopo.ownerId)
    .maybeSingle<MaintenanceTaskRow>();

  if (error || !data) throw new ErroRegraInventario("Tarefa de manutencao nao encontrada.");
  return data;
}
