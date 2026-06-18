import type { CalendarAvailabilityBlockRow, PropertyRow, UnitRow } from "@hospedex/types";
import { redirect } from "next/navigation";

import { exigirAutenticacao } from "../auth/context";
import type { ContextoAutenticacao } from "../auth/types";
import { criarClienteSupabaseServer } from "../supabase/server";
import { podeGerenciarCalendario } from "./data";

/**
 * Permissoes compartilhadas do calendario.
 *
 * Tenant e owner nunca vem do formulario. O servidor sempre usa o contexto
 * autenticado para evitar bloqueios em propriedades de outro cliente.
 */

export class ErroRegraCalendario extends Error {}

export type ClienteSupabaseServer = Awaited<ReturnType<typeof criarClienteSupabaseServer>>;

export type EscopoCalendario = {
  contexto: ContextoAutenticacao;
  tenantId: string;
  ownerId: string;
  userId: string;
};

export async function carregarEscopoCalendario(): Promise<EscopoCalendario> {
  const contexto = await exigirAutenticacao();

  if (!contexto.tenant) {
    redirect("/sem-acesso?motivo=tenant-nao-encontrado");
  }

  if (!contexto.featureFlags.calendar) {
    redirect("/sem-acesso?motivo=feature-flag-desabilitada");
  }

  if (!podeGerenciarCalendario(contexto)) {
    redirect("/sem-acesso?motivo=permissao-insuficiente");
  }

  return {
    contexto,
    tenantId: contexto.tenant.id,
    ownerId: contexto.tenant.owner_id,
    userId: contexto.userId
  };
}

export async function carregarPropriedadeDoCalendario(
  supabase: ClienteSupabaseServer,
  escopo: EscopoCalendario,
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

  if (error || !data) {
    throw new ErroRegraCalendario("Propriedade nao encontrada para este tenant.");
  }

  return data;
}

export async function carregarUnidadeDoCalendario(
  supabase: ClienteSupabaseServer,
  escopo: EscopoCalendario,
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

  if (error || !data) {
    throw new ErroRegraCalendario("Unidade nao encontrada para a propriedade selecionada.");
  }

  return data;
}

export async function carregarBloqueioGerenciavel(
  supabase: ClienteSupabaseServer,
  escopo: EscopoCalendario,
  bloqueioId: string
) {
  const { data, error } = await supabase
    .from("calendar_availability_blocks")
    .select("*")
    .eq("id", bloqueioId)
    .eq("tenant_id", escopo.tenantId)
    .eq("owner_id", escopo.ownerId)
    .neq("source", "reservation")
    .maybeSingle<CalendarAvailabilityBlockRow>();

  if (error || !data) {
    throw new ErroRegraCalendario("Bloqueio nao encontrado para este tenant.");
  }

  return data;
}
