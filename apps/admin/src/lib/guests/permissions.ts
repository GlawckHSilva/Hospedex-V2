import type { CrmGuestRow } from "@hospedex/types";
import { redirect } from "next/navigation";

import { exigirAutenticacao } from "../auth/context";
import type { ContextoAutenticacao } from "../auth/types";
import { criarClienteSupabaseServer } from "../supabase/server";

/**
 * Permissoes do CRM de hospedes.
 *
 * A feature flag controla exposicao do modulo. A autorizacao usa permissoes de
 * reservas porque o CRM inicial nasce do relacionamento operacional com hospedes.
 */

export class ErroRegraHospede extends Error {}

export type ClienteSupabaseServer = Awaited<ReturnType<typeof criarClienteSupabaseServer>>;

export type EscopoHospede = {
  contexto: ContextoAutenticacao;
  tenantId: string;
  ownerId: string;
  userId: string;
};

export function crmAtivo(contexto: ContextoAutenticacao): boolean {
  return Boolean(contexto.featureFlags.crm);
}

export function podeLerHospedes(contexto: ContextoAutenticacao): boolean {
  if (!crmAtivo(contexto)) return false;
  if (contexto.role === "owner") return true;
  return contexto.permissions.includes("reservations.read");
}

export function podeGerenciarHospedes(contexto: ContextoAutenticacao): boolean {
  if (!crmAtivo(contexto)) return false;
  if (contexto.role === "owner") return true;
  return contexto.permissions.includes("reservations.manage");
}

export async function carregarEscopoHospede(): Promise<EscopoHospede> {
  const contexto = await exigirAutenticacao();

  if (!contexto.tenant || !podeGerenciarHospedes(contexto)) {
    redirect("/sem-acesso");
  }

  return {
    contexto,
    tenantId: contexto.tenant.id,
    ownerId: contexto.tenant.owner_id,
    userId: contexto.userId
  };
}

export async function carregarHospedeGerenciavel(
  supabase: ClienteSupabaseServer,
  escopo: EscopoHospede,
  hospedeId: string
) {
  const { data, error } = await supabase
    .from("crm_guests")
    .select("*")
    .eq("id", hospedeId)
    .eq("tenant_id", escopo.tenantId)
    .eq("owner_id", escopo.ownerId)
    .is("deleted_at", null)
    .maybeSingle<CrmGuestRow>();

  if (error || !data) {
    throw new ErroRegraHospede("Hospede nao encontrado para este tenant.");
  }

  return data;
}
