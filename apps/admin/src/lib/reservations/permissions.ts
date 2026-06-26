import type { PropertyRow, ReservationRow } from "@hospedex/types";
import { redirect } from "next/navigation";

import { exigirAutenticacao } from "../auth/context";
import type { ContextoAutenticacao } from "../auth/types";
import { criarClienteSupabaseServer } from "../supabase/server";
import { podeGerenciarReservas } from "./data";

/**
 * Autorizações compartilhadas do módulo de Reservas.
 *
 * O navegador nunca define tenant ou owner efetivos. Esses dados vêm do contexto
 * autenticado para proteger reservas entre clientes da plataforma.
 */

export class ErroRegraReserva extends Error {}

export type ClienteSupabaseServer = Awaited<ReturnType<typeof criarClienteSupabaseServer>>;

export type EscopoReserva = {
  contexto: ContextoAutenticacao;
  tenantId: string;
  ownerId: string;
  userId: string;
};

export async function carregarEscopoReservas(): Promise<EscopoReserva> {
  const contexto = await exigirAutenticacao();

  if (!contexto.tenant) {
    redirect("/sem-acesso?motivo=tenant-nao-encontrado");
  }

  if (!contexto.featureFlags.manual_approval) {
    redirect("/sem-acesso?motivo=feature-flag-desabilitada");
  }

  if (!podeGerenciarReservas(contexto)) {
    redirect("/sem-acesso?motivo=permissao-insuficiente");
  }

  return {
    contexto,
    tenantId: contexto.tenant.id,
    ownerId: contexto.tenant.owner_id,
    userId: contexto.userId
  };
}

export async function carregarReservaGerenciavel(
  supabase: ClienteSupabaseServer,
  escopo: EscopoReserva,
  reservaId: string
) {
  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .eq("id", reservaId)
    .eq("tenant_id", escopo.tenantId)
    .eq("owner_id", escopo.ownerId)
    .maybeSingle<ReservationRow>();

  if (error || !data) {
    throw new ErroRegraReserva("Reserva não encontrada para este tenant.");
  }

  return data;
}
export async function carregarPropriedadeDaReserva(
  supabase: ClienteSupabaseServer,
  escopo: EscopoReserva,
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
    throw new ErroRegraReserva("Propriedade não encontrada para este tenant.");
  }

  return data;
}
