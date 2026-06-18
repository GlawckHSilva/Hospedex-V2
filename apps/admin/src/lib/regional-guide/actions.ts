"use server";

import type {
  RegionalGuideCategory,
  RegionalGuideLocationRow,
  RegionalGuideStatus
} from "@hospedex/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirAutenticacao } from "../auth/context";
import type { ContextoAutenticacao } from "../auth/types";
import { criarClienteSupabaseServer } from "../supabase/server";
import { podeGerenciarGuiaRegiao } from "./data";
import { CATEGORIAS_GUIA_REGIAO } from "./types";

/**
 * Server actions do Guia da Regiao.
 *
 * O tenant e owner sao sempre derivados da sessao, nunca de campos enviados
 * pelo navegador. Isso preserva isolamento multi-tenant.
 */

const CAMINHO_GUIA_REGIAO = "/guia-regiao";
const STATUS_VALIDOS: RegionalGuideStatus[] = ["active", "inactive"];

class ErroRegraGuiaRegiao extends Error {}

type EscopoGuiaRegiao = {
  contexto: ContextoAutenticacao;
  ownerId: string;
  tenantId: string;
  userId: string;
};

export async function criarLocalGuiaRegiaoAction(formData: FormData) {
  const escopo = await carregarEscopoGuiaRegiao();

  try {
    const supabase = await criarClienteSupabaseServer();
    const entrada = obterEntradaLocal(formData);
    const { error } = await supabase.from("regional_guide_locations").insert({
      tenant_id: escopo.tenantId,
      owner_id: escopo.ownerId,
      category: entrada.category,
      name: entrada.name,
      description: entrada.description,
      address: entrada.address,
      phone: entrada.phone,
      whatsapp: entrada.whatsapp,
      website_url: entrada.websiteUrl,
      opening_hours: entrada.openingHours,
      cover_image_url: entrada.coverImageUrl,
      display_order: entrada.displayOrder,
      status: entrada.status,
      created_by: escopo.userId
    });

    if (error) throw new Error(error.message);
    revalidarGuiaRegiao();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao criar local do guia da regiao.");
  }

  redirect(`${CAMINHO_GUIA_REGIAO}?sucesso=local-criado`);
}

export async function atualizarLocalGuiaRegiaoAction(formData: FormData) {
  const escopo = await carregarEscopoGuiaRegiao();

  try {
    const supabase = await criarClienteSupabaseServer();
    const localId = textoObrigatorio(formData, "localId", "local");
    await carregarLocalGerenciavel(supabase, escopo, localId);
    const entrada = obterEntradaLocal(formData);
    const { error } = await supabase
      .from("regional_guide_locations")
      .update({
        category: entrada.category,
        name: entrada.name,
        description: entrada.description,
        address: entrada.address,
        phone: entrada.phone,
        whatsapp: entrada.whatsapp,
        website_url: entrada.websiteUrl,
        opening_hours: entrada.openingHours,
        cover_image_url: entrada.coverImageUrl,
        display_order: entrada.displayOrder,
        status: entrada.status
      })
      .eq("id", localId)
      .eq("tenant_id", escopo.tenantId);

    if (error) throw new Error(error.message);
    revalidarGuiaRegiao();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao atualizar local do guia da regiao.");
  }

  redirect(`${CAMINHO_GUIA_REGIAO}?sucesso=local-atualizado`);
}

export async function alternarStatusLocalGuiaRegiaoAction(formData: FormData) {
  const escopo = await carregarEscopoGuiaRegiao();

  try {
    const supabase = await criarClienteSupabaseServer();
    const localId = textoObrigatorio(formData, "localId", "local");
    const status = validarStatus(textoObrigatorio(formData, "status", "status"));
    await carregarLocalGerenciavel(supabase, escopo, localId);
    const { error } = await supabase
      .from("regional_guide_locations")
      .update({ status })
      .eq("id", localId)
      .eq("tenant_id", escopo.tenantId);

    if (error) throw new Error(error.message);
    revalidarGuiaRegiao();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao alterar status do local.");
  }

  redirect(`${CAMINHO_GUIA_REGIAO}?sucesso=status-atualizado`);
}

export async function excluirLocalGuiaRegiaoAction(formData: FormData) {
  const escopo = await carregarEscopoGuiaRegiao();

  try {
    const supabase = await criarClienteSupabaseServer();
    const localId = textoObrigatorio(formData, "localId", "local");
    await carregarLocalGerenciavel(supabase, escopo, localId);

    // Exclusao logica preserva historico para auditoria e exibicao publica futura.
    const { error } = await supabase
      .from("regional_guide_locations")
      .update({
        deleted_at: new Date().toISOString(),
        status: "inactive"
      })
      .eq("id", localId)
      .eq("tenant_id", escopo.tenantId);

    if (error) throw new Error(error.message);
    revalidarGuiaRegiao();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao excluir local do guia da regiao.");
  }

  redirect(`${CAMINHO_GUIA_REGIAO}?sucesso=local-excluido`);
}

async function carregarEscopoGuiaRegiao(): Promise<EscopoGuiaRegiao> {
  const contexto = await exigirAutenticacao();

  if (!contexto.tenant || !podeGerenciarGuiaRegiao(contexto)) {
    redirect("/sem-acesso?motivo=permissao-insuficiente");
  }

  if (!contexto.featureFlags.regional_guide) {
    redirect("/sem-acesso?motivo=feature-flag-desabilitada");
  }

  return {
    contexto,
    ownerId: contexto.tenant.owner_id,
    tenantId: contexto.tenant.id,
    userId: contexto.userId
  };
}

async function carregarLocalGerenciavel(
  supabase: Awaited<ReturnType<typeof criarClienteSupabaseServer>>,
  escopo: EscopoGuiaRegiao,
  localId: string
) {
  const { data, error } = await supabase
    .from("regional_guide_locations")
    .select("*")
    .eq("id", localId)
    .eq("tenant_id", escopo.tenantId)
    .is("deleted_at", null)
    .maybeSingle<RegionalGuideLocationRow>();

  if (error || !data) {
    throw new ErroRegraGuiaRegiao("Local nao encontrado para este tenant.");
  }

  return data;
}

function obterEntradaLocal(formData: FormData) {
  return {
    address: textoOpcional(formData, "address"),
    category: validarCategoria(textoObrigatorio(formData, "category", "categoria")),
    coverImageUrl: validarUrlOpcional(formData, "coverImageUrl", "foto principal"),
    description: textoOpcional(formData, "description"),
    displayOrder: numeroInteiro(formData, "displayOrder", "ordem", 0),
    name: textoObrigatorio(formData, "name", "nome"),
    openingHours: textoOpcional(formData, "openingHours"),
    phone: textoOpcional(formData, "phone"),
    status: validarStatus(textoObrigatorio(formData, "status", "status")),
    websiteUrl: validarUrlOpcional(formData, "websiteUrl", "site"),
    whatsapp: textoOpcional(formData, "whatsapp")
  };
}

function validarCategoria(valor: string): RegionalGuideCategory {
  const categorias = CATEGORIAS_GUIA_REGIAO
    .map((categoria) => categoria.value)
    .filter((categoria) => categoria !== "todas");

  if (categorias.includes(valor as RegionalGuideCategory)) {
    return valor as RegionalGuideCategory;
  }

  throw new ErroRegraGuiaRegiao("Categoria invalida.");
}

function validarStatus(valor: string): RegionalGuideStatus {
  if (STATUS_VALIDOS.includes(valor as RegionalGuideStatus)) {
    return valor as RegionalGuideStatus;
  }

  throw new ErroRegraGuiaRegiao("Status invalido.");
}

function validarUrlOpcional(formData: FormData, chave: string, label: string): string | null {
  const valor = textoOpcional(formData, chave);
  if (!valor) return null;

  try {
    const url = new URL(valor);
    return url.toString();
  } catch {
    throw new ErroRegraGuiaRegiao(`Informe ${label} como URL valida.`);
  }
}

function textoObrigatorio(formData: FormData, chave: string, label: string): string {
  const valor = formData.get(chave)?.toString().trim();
  if (!valor) throw new ErroRegraGuiaRegiao(`Informe ${label}.`);
  return valor;
}

function textoOpcional(formData: FormData, chave: string): string | null {
  const valor = formData.get(chave)?.toString().trim();
  return valor ? valor : null;
}

function numeroInteiro(formData: FormData, chave: string, label: string, minimo: number): number {
  const valor = Number.parseInt(textoObrigatorio(formData, chave, label), 10);
  if (Number.isNaN(valor) || valor < minimo) {
    throw new ErroRegraGuiaRegiao(`Informe ${label} valido.`);
  }
  return valor;
}

function revalidarGuiaRegiao() {
  revalidatePath(CAMINHO_GUIA_REGIAO);
}

function redirecionarComErro(erro: unknown, mensagemPadrao: string): never {
  if (!(erro instanceof ErroRegraGuiaRegiao)) {
    console.error(mensagemPadrao, erro);
  }

  const mensagem = erro instanceof ErroRegraGuiaRegiao ? erro.message : mensagemPadrao;
  redirect(`${CAMINHO_GUIA_REGIAO}?erro=${encodeURIComponent(mensagem)}`);
}
