"use server";

import type { TransactionStatus } from "@hospedex/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { criarClienteSupabaseServer } from "../supabase/server";
import {
  carregarCategoriaFinanceira,
  carregarContaFinanceira,
  carregarEscopoFinanceiro,
  carregarLancamentoManual,
  carregarPropriedadeFinanceira,
  ErroRegraFinanceiro,
  type ClienteSupabaseServer,
  type EscopoFinanceiro
} from "./permissions";
import {
  STATUS_LANCAMENTO_FINANCEIRO,
  TIPOS_LANCAMENTO_FINANCEIRO,
  type TipoLancamentoFinanceiro
} from "./types";

/**
 * Server actions do Financeiro.
 *
 * Lançamentos vinculados a reserva não são editados/excluídos aqui. Essa regra
 * preserva histórico financeiro futuro quando pagamentos e comissões existirem.
 */

const CAMINHO_FINANCEIRO = "/financeiro";

type EntradaLancamento = {
  categoriaId: string;
  contaId: string;
  dataReferencia: string;
  descricao: string;
  propriedadeId: string | null;
  status: TransactionStatus;
  tipo: TipoLancamentoFinanceiro;
  valor: number;
};

export async function criarLancamentoFinanceiroAction(formData: FormData) {
  const escopo = await carregarEscopoFinanceiro();
  const retorno = montarRetornoFinanceiro(formData);

  try {
    const supabase = await criarClienteSupabaseServer();
    const entrada = await obterEntradaLancamento(supabase, escopo, formData);

    const { error } = await supabase.from("transactions").insert({
      tenant_id: escopo.tenantId,
      financial_account_id: entrada.contaId,
      property_id: entrada.propriedadeId,
      reservation_id: null,
      expense_category_id: entrada.categoriaId,
      transaction_type: entrada.tipo,
      status: entrada.status,
      amount: entrada.valor,
      currency: "BRL",
      due_date: entrada.dataReferencia,
      paid_at: montarDataPagamento(entrada),
      description: entrada.descricao
    });

    if (error) throw new Error(error.message);
    revalidarFinanceiro();
  } catch (erro) {
    redirecionarComErro(retorno, erro, "Erro ao criar lançamento financeiro.");
  }

  redirect(`${retorno}&sucesso=lancamento-criado`);
}

export async function atualizarLancamentoFinanceiroAction(formData: FormData) {
  const escopo = await carregarEscopoFinanceiro();
  const retorno = montarRetornoFinanceiro(formData);

  try {
    const supabase = await criarClienteSupabaseServer();
    const lancamentoId = textoObrigatorio(formData, "lancamentoId", "lançamento");
    await carregarLancamentoManual(supabase, escopo, lancamentoId);
    const entrada = await obterEntradaLancamento(supabase, escopo, formData);

    const { error } = await supabase
      .from("transactions")
      .update({
        financial_account_id: entrada.contaId,
        property_id: entrada.propriedadeId,
        expense_category_id: entrada.categoriaId,
        transaction_type: entrada.tipo,
        status: entrada.status,
        amount: entrada.valor,
        due_date: entrada.dataReferencia,
        paid_at: montarDataPagamento(entrada),
        description: entrada.descricao
      })
      .eq("id", lancamentoId)
      .eq("tenant_id", escopo.tenantId)
      .is("reservation_id", null);

    if (error) throw new Error(error.message);
    revalidarFinanceiro();
  } catch (erro) {
    redirecionarComErro(retorno, erro, "Erro ao atualizar lançamento financeiro.");
  }

  redirect(`${retorno}&sucesso=lancamento-atualizado`);
}

export async function excluirLancamentoFinanceiroAction(formData: FormData) {
  const escopo = await carregarEscopoFinanceiro();
  const retorno = montarRetornoFinanceiro(formData);

  try {
    const supabase = await criarClienteSupabaseServer();
    const lancamentoId = textoObrigatorio(formData, "lancamentoId", "lançamento");
    await carregarLancamentoManual(supabase, escopo, lancamentoId);

    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", lancamentoId)
      .eq("tenant_id", escopo.tenantId)
      .is("reservation_id", null);

    if (error) throw new Error(error.message);
    revalidarFinanceiro();
  } catch (erro) {
    redirecionarComErro(retorno, erro, "Erro ao excluir lançamento financeiro.");
  }

  redirect(`${retorno}&sucesso=lancamento-excluido`);
}

async function obterEntradaLancamento(
  supabase: ClienteSupabaseServer,
  escopo: EscopoFinanceiro,
  formData: FormData
): Promise<EntradaLancamento> {
  const tipo = validarTipoLancamento(textoObrigatorio(formData, "tipo", "tipo"));
  const status = validarStatusLancamento(textoObrigatorio(formData, "status", "status"));
  const contaId = textoObrigatorio(formData, "contaId", "conta");
  const categoriaId = textoObrigatorio(formData, "categoriaId", "categoria");
  const propriedadeId = textoOpcional(formData, "propriedadeId");

  await carregarContaFinanceira(supabase, escopo, contaId);
  await carregarCategoriaFinanceira(supabase, escopo, categoriaId, tipo);
  if (propriedadeId) await carregarPropriedadeFinanceira(supabase, escopo, propriedadeId);

  return {
    categoriaId,
    contaId,
    dataReferencia: dataObrigatoria(formData, "dataReferencia", "data"),
    descricao: textoObrigatorio(formData, "descricao", "descrição"),
    propriedadeId,
    status,
    tipo,
    valor: numeroMoeda(formData, "valor", "valor")
  };
}

function montarDataPagamento(entrada: EntradaLancamento) {
  if (entrada.status !== "paid") return null;
  return `${entrada.dataReferencia}T12:00:00.000Z`;
}

function validarTipoLancamento(valor: string): TipoLancamentoFinanceiro {
  if (TIPOS_LANCAMENTO_FINANCEIRO.includes(valor as TipoLancamentoFinanceiro)) {
    return valor as TipoLancamentoFinanceiro;
  }

  throw new ErroRegraFinanceiro("Tipo de lançamento inválido.");
}

function validarStatusLancamento(valor: string): TransactionStatus {
  if (STATUS_LANCAMENTO_FINANCEIRO.includes(valor as TransactionStatus)) {
    return valor as TransactionStatus;
  }

  throw new ErroRegraFinanceiro("Status financeiro inválido.");
}

function dataObrigatoria(formData: FormData, chave: string, label: string) {
  const valor = textoObrigatorio(formData, chave, label);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    throw new ErroRegraFinanceiro(`Informe ${label} válida.`);
  }
  return valor;
}

function numeroMoeda(formData: FormData, chave: string, label: string): number {
  const valor = Number.parseFloat(textoObrigatorio(formData, chave, label).replace(",", "."));
  if (Number.isNaN(valor) || valor <= 0) {
    throw new ErroRegraFinanceiro(`Informe ${label} válido.`);
  }
  return valor;
}

function textoObrigatorio(formData: FormData, chave: string, label: string): string {
  const valor = formData.get(chave)?.toString().trim();
  if (!valor) throw new ErroRegraFinanceiro(`Informe ${label}.`);
  return valor;
}

function textoOpcional(formData: FormData, chave: string): string | null {
  const valor = formData.get(chave)?.toString().trim();
  return valor ? valor : null;
}

function montarRetornoFinanceiro(formData: FormData) {
  const params = new URLSearchParams();
  const mes = textoOpcional(formData, "mes");
  const tipo = textoOpcional(formData, "filtroTipo");
  const status = textoOpcional(formData, "filtroStatus");
  const categoriaId = textoOpcional(formData, "filtroCategoriaId");
  const busca = textoOpcional(formData, "filtroBusca");

  if (mes) params.set("mes", mes);
  if (tipo) params.set("tipo", tipo);
  if (status) params.set("status", status);
  if (categoriaId) params.set("categoriaId", categoriaId);
  if (busca) params.set("busca", busca);

  const query = params.toString();
  return query ? `${CAMINHO_FINANCEIRO}?${query}` : `${CAMINHO_FINANCEIRO}?`;
}

function redirecionarComErro(retorno: string, erro: unknown, mensagemLog: string): never {
  const mensagem =
    erro instanceof ErroRegraFinanceiro
      ? erro.message
      : "Não foi possível concluir a operação financeira.";

  if (!(erro instanceof ErroRegraFinanceiro)) {
    console.error(mensagemLog, erro);
  }

  redirect(`${retorno}&erro=${encodeURIComponent(mensagem)}`);
}

function revalidarFinanceiro() {
  revalidatePath(CAMINHO_FINANCEIRO);
  revalidatePath("/");
}
