import type { CleaningTaskRow, PropertyRow, ReservationRow, UnitRow } from "@hospedex/types";
import { redirect } from "next/navigation";

import { exigirAutenticacao } from "../auth/context";
import type { ContextoAutenticacao } from "../auth/types";
import { criarClienteSupabaseServer } from "../supabase/server";

/**
 * Permissoes do modulo operacional.
 *
 * O tenant nunca vem do formulario. Todas as actions usam o contexto
 * autenticado para impedir acesso cruzado entre clientes da plataforma.
 */

export class ErroRegraLimpeza extends Error {}

export type ClienteSupabaseServer = Awaited<ReturnType<typeof criarClienteSupabaseServer>>;

export type EscopoLimpeza = {
  contexto: ContextoAutenticacao;
  tenantId: string;
  ownerId: string;
  userId: string;
};

export function moduloLimpezaAtivo(contexto: ContextoAutenticacao): boolean {
  return Boolean(contexto.featureFlags.cleaning);
}

export function podeLerLimpeza(contexto: ContextoAutenticacao): boolean {
  if (!moduloLimpezaAtivo(contexto)) return false;
  if (contexto.role === "owner") return true;
  return contexto.permissions.includes("cleaning.read");
}

export function podeGerenciarLimpeza(contexto: ContextoAutenticacao): boolean {
  if (!moduloLimpezaAtivo(contexto)) return false;
  if (contexto.role === "owner") return true;
  return contexto.permissions.includes("cleaning.manage");
}

export function podeGerenciarOperacao(contexto: ContextoAutenticacao): boolean {
  if (contexto.role === "owner") return true;
  return contexto.permissions.includes("reservations.manage");
}

export async function carregarEscopoLimpeza(): Promise<EscopoLimpeza> {
  const contexto = await exigirAutenticacao();

  if (!contexto.tenant || !podeGerenciarLimpeza(contexto)) {
    redirect("/sem-acesso");
  }

  return criarEscopo(contexto);
}

export async function carregarEscopoOperacao(): Promise<EscopoLimpeza> {
  const contexto = await exigirAutenticacao();

  if (!contexto.tenant || !podeGerenciarOperacao(contexto)) {
    redirect("/sem-acesso");
  }

  return criarEscopo(contexto);
}

export async function carregarPropriedadeLimpeza(
  supabase: ClienteSupabaseServer,
  escopo: EscopoLimpeza,
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

  if (error || !data) throw new ErroRegraLimpeza("Propriedade nao encontrada.");
  return data;
}

export async function carregarUnidadeLimpeza(
  supabase: ClienteSupabaseServer,
  escopo: EscopoLimpeza,
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

  if (error || !data) throw new ErroRegraLimpeza("Unidade nao encontrada.");
  return data;
}

export async function carregarReservaOperacional(
  supabase: ClienteSupabaseServer,
  escopo: EscopoLimpeza,
  reservaId: string
) {
  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .eq("id", reservaId)
    .eq("tenant_id", escopo.tenantId)
    .eq("owner_id", escopo.ownerId)
    .maybeSingle<ReservationRow>();

  if (error || !data) throw new ErroRegraLimpeza("Reserva nao encontrada.");
  return data;
}

export async function carregarTarefaLimpeza(
  supabase: ClienteSupabaseServer,
  escopo: EscopoLimpeza,
  tarefaId: string
) {
  const { data, error } = await supabase
    .from("cleaning_tasks")
    .select("*")
    .eq("id", tarefaId)
    .eq("tenant_id", escopo.tenantId)
    .eq("owner_id", escopo.ownerId)
    .maybeSingle<CleaningTaskRow>();

  if (error || !data) throw new ErroRegraLimpeza("Tarefa de limpeza nao encontrada.");
  return data;
}

function criarEscopo(contexto: ContextoAutenticacao): EscopoLimpeza {
  return {
    contexto,
    tenantId: contexto.tenant!.id,
    ownerId: contexto.tenant!.owner_id,
    userId: contexto.userId
  };
}
