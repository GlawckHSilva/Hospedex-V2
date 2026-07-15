import type { PropertyRow } from "@hospedex/types";
import { redirect } from "next/navigation";

import { exigirAutenticacao } from "../auth/context";
import type { ContextoAutenticacao } from "../auth/types";
import { criarClienteSupabaseServer } from "../supabase/server";
import { podeGerenciarPropriedades } from "./data";

/**
 * Autorizações compartilhadas do módulo de Propriedades.
 *
 * Mantemos tenant e owner validados no servidor para que uploads, comodidades e
 * alterações operacionais nunca dependam de ids enviados pelo navegador.
 */

export class ErroRegraNegocio extends Error {
  /**
   * Guarda a causa real do erro para os logs de suporte.
   *
   * A mensagem principal continua amigavel para o usuario, mas a causa tecnica
   * evita que erros de Storage/RLS sejam mascarados como falha de formato.
   */
  constructor(
    message: string,
    public readonly causaTecnica?: string,
  ) {
    super(message);
  }
}

export type ClienteSupabaseServer = Awaited<ReturnType<typeof criarClienteSupabaseServer>>;

export type EscopoGerenciamento = {
  contexto: ContextoAutenticacao;
  tenantId: string;
  ownerId: string;
};

export async function carregarEscopoGerenciamento(): Promise<EscopoGerenciamento> {
  const contexto = await exigirAutenticacao();

  if (!contexto.tenant) {
    redirect(
      contexto.role === "super_admin"
        ? "/super-admin"
        : "/sem-acesso?motivo=tenant-nao-encontrado"
    );
  }

  if (!podeGerenciarPropriedades(contexto)) {
    redirect("/sem-acesso?motivo=permissao-insuficiente");
  }

  return {
    contexto,
    tenantId: contexto.tenant.id,
    ownerId: contexto.tenant.owner_id
  };
}

export async function carregarPropriedadeGerenciavel(
  supabase: ClienteSupabaseServer,
  escopo: EscopoGerenciamento,
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
    throw new ErroRegraNegocio("Propriedade não encontrada para este tenant.");
  }

  return data;
}
