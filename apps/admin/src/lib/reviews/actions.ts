"use server";

import type { PropertyReviewRow, ReviewStatus } from "@hospedex/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirAutenticacao } from "../auth/context";
import type { ContextoAutenticacao } from "../auth/types";
import { criarClienteSupabaseServer } from "../supabase/server";
import { podeGerenciarAvaliacoes } from "./data";

/**
 * Server actions de Avaliacoes internas.
 *
 * Respostas e moderacao ficam no servidor porque alteram reputacao da casa e
 * serao base para publicacao futura no Marketplace.
 */

const CAMINHO_AVALIACOES = "/avaliacoes";
const STATUS_VALIDOS: ReviewStatus[] = ["pending", "approved", "hidden"];

class ErroRegraAvaliacao extends Error {}

type EscopoAvaliacao = {
  contexto: ContextoAutenticacao;
  ownerId: string;
  tenantId: string;
  userId: string;
};

export async function responderAvaliacaoAction(formData: FormData) {
  const escopo = await carregarEscopoAvaliacao();

  try {
    const supabase = await criarClienteSupabaseServer();
    const avaliacaoId = textoObrigatorio(formData, "avaliacaoId", "avaliacao");
    const resposta = textoObrigatorio(formData, "resposta", "resposta");
    const avaliacao = await carregarAvaliacaoGerenciavel(supabase, escopo, avaliacaoId);

    const { error } = await supabase
      .from("property_reviews")
      .update({
        owner_response: resposta,
        owner_responded_at: avaliacao.owner_responded_at ?? new Date().toISOString(),
        response_author_id: escopo.userId
      })
      .eq("id", avaliacaoId)
      .eq("tenant_id", escopo.tenantId)
      .eq("owner_id", escopo.ownerId);

    if (error) throw new Error(error.message);
    revalidarAvaliacoes();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao salvar resposta da avaliacao.");
  }

  redirect(`${CAMINHO_AVALIACOES}?sucesso=resposta-salva`);
}

export async function alterarStatusAvaliacaoAction(formData: FormData) {
  const escopo = await carregarEscopoAvaliacao();

  try {
    const supabase = await criarClienteSupabaseServer();
    const avaliacaoId = textoObrigatorio(formData, "avaliacaoId", "avaliacao");
    const status = validarStatus(textoObrigatorio(formData, "status", "status"));
    await carregarAvaliacaoGerenciavel(supabase, escopo, avaliacaoId);

    const { error } = await supabase
      .from("property_reviews")
      .update({
        hidden_at: status === "hidden" ? new Date().toISOString() : null,
        hidden_by: status === "hidden" ? escopo.userId : null,
        status
      })
      .eq("id", avaliacaoId)
      .eq("tenant_id", escopo.tenantId)
      .eq("owner_id", escopo.ownerId);

    if (error) throw new Error(error.message);
    revalidarAvaliacoes();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao alterar status da avaliacao.");
  }

  redirect(`${CAMINHO_AVALIACOES}?sucesso=status-atualizado`);
}

async function carregarEscopoAvaliacao(): Promise<EscopoAvaliacao> {
  const contexto = await exigirAutenticacao();

  if (!contexto.tenant || !podeGerenciarAvaliacoes(contexto)) {
    redirect("/sem-acesso?motivo=permissao-insuficiente");
  }

  if (!contexto.featureFlags.reviews) {
    redirect("/sem-acesso?motivo=feature-flag-desabilitada");
  }

  return {
    contexto,
    ownerId: contexto.tenant.owner_id,
    tenantId: contexto.tenant.id,
    userId: contexto.userId
  };
}

async function carregarAvaliacaoGerenciavel(
  supabase: Awaited<ReturnType<typeof criarClienteSupabaseServer>>,
  escopo: EscopoAvaliacao,
  avaliacaoId: string
) {
  const { data, error } = await supabase
    .from("property_reviews")
    .select("*")
    .eq("id", avaliacaoId)
    .eq("tenant_id", escopo.tenantId)
    .eq("owner_id", escopo.ownerId)
    .maybeSingle<PropertyReviewRow>();

  if (error || !data) {
    throw new ErroRegraAvaliacao("Avaliacao nao encontrada para este tenant.");
  }

  return data;
}

function validarStatus(valor: string): ReviewStatus {
  if (STATUS_VALIDOS.includes(valor as ReviewStatus)) return valor as ReviewStatus;
  throw new ErroRegraAvaliacao("Status de avaliacao invalido.");
}

function textoObrigatorio(formData: FormData, chave: string, label: string): string {
  const valor = formData.get(chave)?.toString().trim();
  if (!valor) throw new ErroRegraAvaliacao(`Informe ${label}.`);
  return valor;
}

function revalidarAvaliacoes() {
  revalidatePath(CAMINHO_AVALIACOES);
}

function redirecionarComErro(erro: unknown, mensagemPadrao: string): never {
  if (!(erro instanceof ErroRegraAvaliacao)) {
    console.error(mensagemPadrao, erro);
  }

  const mensagem = erro instanceof ErroRegraAvaliacao ? erro.message : mensagemPadrao;
  redirect(`${CAMINHO_AVALIACOES}?erro=${encodeURIComponent(mensagem)}`);
}
