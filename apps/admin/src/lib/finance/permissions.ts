import type {
  ExpenseCategoryKind,
  ExpenseCategoryRow,
  FinancialAccountRow,
  PropertyRow,
  TransactionRow
} from "@hospedex/types";
import { redirect } from "next/navigation";

import { exigirAutenticacao } from "../auth/context";
import type { ContextoAutenticacao } from "../auth/types";
import { criarClienteSupabaseServer } from "../supabase/server";
import { podeGerenciarFinanceiro } from "./data";

/**
 * Permissões compartilhadas do Financeiro.
 *
 * O tenant e owner vêm sempre do contexto autenticado. IDs enviados pelo
 * navegador são conferidos no servidor para proteger dados entre clientes.
 */

export class ErroRegraFinanceiro extends Error {}

export type ClienteSupabaseServer = Awaited<ReturnType<typeof criarClienteSupabaseServer>>;

export type EscopoFinanceiro = {
  contexto: ContextoAutenticacao;
  ownerId: string;
  tenantId: string;
};

export async function carregarEscopoFinanceiro(): Promise<EscopoFinanceiro> {
  const contexto = await exigirAutenticacao();

  if (!contexto.tenant || !podeGerenciarFinanceiro(contexto)) {
    redirect("/sem-acesso");
  }

  return {
    contexto,
    ownerId: contexto.tenant.owner_id,
    tenantId: contexto.tenant.id
  };
}

export async function carregarContaFinanceira(
  supabase: ClienteSupabaseServer,
  escopo: EscopoFinanceiro,
  contaId: string
) {
  const { data, error } = await supabase
    .from("financial_accounts")
    .select("*")
    .eq("id", contaId)
    .eq("tenant_id", escopo.tenantId)
    .eq("owner_id", escopo.ownerId)
    .eq("status", "active")
    .maybeSingle<FinancialAccountRow>();

  if (error || !data) {
    throw new ErroRegraFinanceiro("Conta financeira não encontrada para este tenant.");
  }

  return data;
}

export async function carregarCategoriaFinanceira(
  supabase: ClienteSupabaseServer,
  escopo: EscopoFinanceiro,
  categoriaId: string,
  tipo: ExpenseCategoryKind
) {
  const { data, error } = await supabase
    .from("expense_categories")
    .select("*")
    .eq("id", categoriaId)
    .eq("tenant_id", escopo.tenantId)
    .eq("kind", tipo)
    .eq("status", "active")
    .maybeSingle<ExpenseCategoryRow>();

  if (error || !data) {
    throw new ErroRegraFinanceiro("Categoria financeira inválida para o tipo do lançamento.");
  }

  return data;
}

export async function carregarPropriedadeFinanceira(
  supabase: ClienteSupabaseServer,
  escopo: EscopoFinanceiro,
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
    throw new ErroRegraFinanceiro("Propriedade não encontrada para este tenant.");
  }

  return data;
}

export async function carregarLancamentoManual(
  supabase: ClienteSupabaseServer,
  escopo: EscopoFinanceiro,
  lancamentoId: string
) {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", lancamentoId)
    .eq("tenant_id", escopo.tenantId)
    .is("reservation_id", null)
    .maybeSingle<TransactionRow>();

  if (error || !data) {
    throw new ErroRegraFinanceiro("Lançamento manual não encontrado para este tenant.");
  }

  return data;
}
