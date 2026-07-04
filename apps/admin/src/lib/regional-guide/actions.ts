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
import {
  enviarImagemGuiaRegiaoParaStorage,
  obterArquivoImagem
} from "../properties/media-storage";
import { criarClienteSupabaseServer } from "../supabase/server";
import { podeGerenciarGuiaRegiao } from "./data";
import { CATEGORIAS_GUIA_REGIAO } from "./types";

/**
 * Server actions do Guia da região.
 *
 * O tenant e owner são sempre derivados da sessão, nunca de campos enviados
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
    const coverImageUrl = await resolverImagemGuiaRegiao(
      supabase,
      escopo,
      formData,
      entrada.coverImageUrl
    );
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
      cover_image_url: coverImageUrl,
      display_order: entrada.displayOrder,
      status: entrada.status,
      created_by: escopo.userId
    });

    if (error) throw new Error(error.message);
    revalidarGuiaRegiao();
  } catch (erro) {
    redirecionarComErro(erro, "Não foi possível salvar o local. Tente novamente.");
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
    const coverImageUrl = await resolverImagemGuiaRegiao(
      supabase,
      escopo,
      formData,
      entrada.coverImageUrl,
      localId
    );
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
        cover_image_url: coverImageUrl,
        display_order: entrada.displayOrder,
        status: entrada.status
      })
      .eq("id", localId)
      .eq("tenant_id", escopo.tenantId);

    if (error) throw new Error(error.message);
    revalidarGuiaRegiao();
  } catch (erro) {
    redirecionarComErro(erro, "Não foi possível salvar o local. Tente novamente.");
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
    redirecionarComErro(erro, "Não foi possível alterar o status do local.");
  }

  redirect(`${CAMINHO_GUIA_REGIAO}?sucesso=status-atualizado`);
}

export async function excluirLocalGuiaRegiaoAction(formData: FormData) {
  const escopo = await carregarEscopoGuiaRegiao();

  try {
    const supabase = await criarClienteSupabaseServer();
    const localId = textoObrigatorio(formData, "localId", "local");
    await carregarLocalGerenciavel(supabase, escopo, localId);

    // Exclusão lógica preserva histórico para auditoria e remove a recomendação
    // da exibição pública sem apagar rastreabilidade do tenant.
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
    redirecionarComErro(erro, "Não foi possível apagar o local. Tente novamente.");
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
    throw new ErroRegraGuiaRegiao("Local não encontrado para este tenant.");
  }

  return data;
}

async function resolverImagemGuiaRegiao(
  supabase: Awaited<ReturnType<typeof criarClienteSupabaseServer>>,
  escopo: EscopoGuiaRegiao,
  formData: FormData,
  coverImageUrl: string | null,
  localId?: string
) {
  const arquivo = obterArquivoImagem(formData, "coverImageFile");
  if (!arquivo) return coverImageUrl;

  // O upload passa pelo servidor autenticado e usa tenant_id da sessão.
  // Assim o navegador nunca envia service role e o Storage mantém isolamento multi-tenant.
  const imagem = await enviarImagemGuiaRegiaoParaStorage(
    supabase,
    localId
      ? {
          localId,
          tenantId: escopo.tenantId
        }
      : {
          tenantId: escopo.tenantId
        },
    arquivo
  );

  return imagem.url;
}

function obterEntradaLocal(formData: FormData) {
  return {
    address: textoOpcional(formData, "address"),
    category: validarCategoria(textoObrigatorio(formData, "category", "categoria")),
    coverImageUrl: validarUrlOpcional(formData, "coverImageUrl", "foto principal"),
    description: textoOpcional(formData, "description"),
    displayOrder: numeroInteiro(formData, "displayOrder", "prioridade", 1),
    name: textoObrigatorio(formData, "name", "o nome do local"),
    openingHours: textoOpcional(formData, "openingHours"),
    phone: validarTelefoneOpcional(formData, "phone", "telefone"),
    status: validarStatus(textoObrigatorio(formData, "status", "status")),
    websiteUrl: validarUrlOpcional(formData, "websiteUrl", "site"),
    whatsapp: validarTelefoneOpcional(formData, "whatsapp", "WhatsApp")
  };
}

function validarCategoria(valor: string): RegionalGuideCategory {
  const categorias = CATEGORIAS_GUIA_REGIAO
    .map((categoria) => categoria.value)
    .filter((categoria) => categoria !== "todas");

  if (categorias.includes(valor as RegionalGuideCategory)) {
    return valor as RegionalGuideCategory;
  }

  throw new ErroRegraGuiaRegiao("Selecione uma categoria.");
}

function validarStatus(valor: string): RegionalGuideStatus {
  if (STATUS_VALIDOS.includes(valor as RegionalGuideStatus)) {
    return valor as RegionalGuideStatus;
  }

  throw new ErroRegraGuiaRegiao("Selecione um status.");
}

function validarUrlOpcional(formData: FormData, chave: string, label: string): string | null {
  const valor = textoOpcional(formData, chave);
  if (!valor) return null;

  try {
    const url = new URL(valor);
    return url.toString();
  } catch {
    throw new ErroRegraGuiaRegiao(`Informe uma URL válida para ${label}.`);
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
    throw new ErroRegraGuiaRegiao(
      label === "prioridade"
        ? "A prioridade deve ser maior que zero."
        : `Informe ${label} válido.`
    );
  }
  return valor;
}

function validarTelefoneOpcional(
  formData: FormData,
  chave: string,
  label: string
): string | null {
  const valor = textoOpcional(formData, chave);
  if (!valor) return null;

  const digitos = valor.replace(/\D/g, "");
  if (digitos.length < 10 || digitos.length > 11) {
    throw new ErroRegraGuiaRegiao(`Informe um número de ${label} válido.`);
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

  const mensagem =
    erro instanceof ErroRegraGuiaRegiao
      ? erro.message
      : erro instanceof Error && mensagemPodeAparecerParaUsuario(erro.message)
        ? erro.message
        : mensagemPadrao;
  redirect(`${CAMINHO_GUIA_REGIAO}?erro=${encodeURIComponent(mensagem)}`);
}

function mensagemPodeAparecerParaUsuario(mensagem: string) {
  return (
    mensagem.startsWith("Formato de imagem") ||
    mensagem.startsWith("Imagem acima")
  );
}
