"use server";

import type { MediaAssetRow } from "@hospedex/types";
import { redirect } from "next/navigation";

import { criarClienteSupabaseServer } from "../supabase/server";
import {
  obterCaminhoRetorno,
  redirecionarComErro,
  revalidarModuloPropriedades,
  textoObrigatorio
} from "./feedback";
import {
  enviarImagemParaStorage,
  obterArquivosImagem,
  removerImagemDoStorage
} from "./media-storage";
import {
  carregarEscopoGerenciamento,
  carregarPropriedadeGerenciavel,
  ErroRegraNegocio
} from "./permissions";

/**
 * Actions de galeria e Storage.
 *
 * O banco guarda metadados e ordem; o arquivo real fica no Supabase Storage. A
 * exclusão remove o objeto e marca o registro como deleted para preservar auditoria futura.
 */

export async function enviarGaleriaPropriedadeAction(formData: FormData) {
  const escopo = await carregarEscopoGerenciamento();
  const caminhoRetorno = obterCaminhoRetorno(formData);

  try {
    const propriedadeId = textoObrigatorio(formData, "propriedadeId", "propriedade");
    const arquivos = obterArquivosImagem(formData, "imagens");
    if (!arquivos.length) throw new ErroRegraNegocio("Selecione ao menos uma imagem.");

    const supabase = await criarClienteSupabaseServer();
    await carregarPropriedadeGerenciavel(supabase, escopo, propriedadeId);
    const proximaOrdem = await obterProximaOrdem(supabase, escopo.tenantId, propriedadeId);

    await Promise.all(
      arquivos.map(async (arquivo, indice) => {
        const midia = await enviarImagemParaStorage(
          supabase,
          { escopo: "galeria", propertyId: propriedadeId, tenantId: escopo.tenantId },
          arquivo
        );

        await inserirMidia(supabase, {
          alt: arquivo.name,
          isCover: false,
          propertyId: propriedadeId,
          sortOrder: proximaOrdem + indice,
          tenantId: escopo.tenantId,
          url: midia.url,
          storageBucket: midia.bucket,
          storagePath: midia.path
        });
      })
    );

    revalidarModuloPropriedades();
  } catch (erro) {
    redirecionarComErro(caminhoRetorno, erro, "Erro ao enviar galeria da propriedade.");
  }

  redirect(`${caminhoRetorno}?sucesso=galeria-atualizada`);
}

export async function definirImagemPrincipalAction(formData: FormData) {
  const escopo = await carregarEscopoGerenciamento();
  const caminhoRetorno = obterCaminhoRetorno(formData);

  try {
    const imagemId = textoObrigatorio(formData, "imagemId", "imagem");
    const supabase = await criarClienteSupabaseServer();
    const imagem = await carregarImagemGerenciavel(supabase, escopo.tenantId, imagemId);

    if (!imagem.property_id) throw new ErroRegraNegocio("Imagem sem casa vinculada.");
    await carregarPropriedadeGerenciavel(supabase, escopo, imagem.property_id);

    await marcarImagemPrincipal(supabase, imagem);
    revalidarModuloPropriedades();
  } catch (erro) {
    redirecionarComErro(caminhoRetorno, erro, "Erro ao definir imagem principal.");
  }

  redirect(`${caminhoRetorno}?sucesso=imagem-principal`);
}

export async function excluirImagemAction(formData: FormData) {
  const escopo = await carregarEscopoGerenciamento();
  const caminhoRetorno = obterCaminhoRetorno(formData);

  try {
    const imagemId = textoObrigatorio(formData, "imagemId", "imagem");
    const supabase = await criarClienteSupabaseServer();
    const imagem = await carregarImagemGerenciavel(supabase, escopo.tenantId, imagemId);

    if (!imagem.property_id) throw new ErroRegraNegocio("Imagem sem casa vinculada.");
    await carregarPropriedadeGerenciavel(supabase, escopo, imagem.property_id);

    await removerImagemDoStorage(supabase, imagem);
    const { error } = await supabase
      .from("media_assets")
      .update({ is_cover: false, status: "deleted" })
      .eq("id", imagem.id)
      .eq("tenant_id", escopo.tenantId);

    if (error) throw new Error(error.message);
    revalidarModuloPropriedades();
  } catch (erro) {
    redirecionarComErro(caminhoRetorno, erro, "Erro ao excluir imagem.");
  }

  redirect(`${caminhoRetorno}?sucesso=imagem-excluida`);
}

export async function alterarOrdemImagemAction(formData: FormData) {
  const escopo = await carregarEscopoGerenciamento();
  const caminhoRetorno = obterCaminhoRetorno(formData);

  try {
    const imagemId = textoObrigatorio(formData, "imagemId", "imagem");
    const direcao = textoObrigatorio(formData, "direcao", "direção");
    const supabase = await criarClienteSupabaseServer();
    const imagem = await carregarImagemGerenciavel(supabase, escopo.tenantId, imagemId);
    const imagemVizinha = await carregarImagemVizinha(
      supabase,
      imagem,
      direcao === "subir" ? "subir" : "descer",
    );

    if (imagemVizinha) {
      const { error: erroVizinha } = await supabase
        .from("media_assets")
        .update({ sort_order: imagem.sort_order })
        .eq("id", imagemVizinha.id)
        .eq("tenant_id", escopo.tenantId);

      if (erroVizinha) throw new Error(erroVizinha.message);

      const { error } = await supabase
        .from("media_assets")
        .update({ sort_order: imagemVizinha.sort_order })
        .eq("id", imagem.id)
        .eq("tenant_id", escopo.tenantId);

      if (error) throw new Error(error.message);
    }
    revalidarModuloPropriedades();
  } catch (erro) {
    redirecionarComErro(caminhoRetorno, erro, "Erro ao alterar ordem da imagem.");
  }

  redirect(`${caminhoRetorno}?sucesso=galeria-atualizada`);
}

async function carregarImagemVizinha(
  supabase: Awaited<ReturnType<typeof criarClienteSupabaseServer>>,
  imagem: MediaAssetRow,
  direcao: "subir" | "descer",
) {
  let consulta = supabase
    .from("media_assets")
    .select("*")
    .eq("tenant_id", imagem.tenant_id)
    .eq("property_id", imagem.property_id)
    .eq("status", "active")
    .order("sort_order", { ascending: direcao === "descer" })
    .limit(1);

  consulta =
    direcao === "subir"
      ? consulta.lt("sort_order", imagem.sort_order)
      : consulta.gt("sort_order", imagem.sort_order);

  const { data, error } = await consulta.maybeSingle<MediaAssetRow>();
  if (error) throw new Error(error.message);
  return data;
}

type NovaMidia = {
  alt: string;
  isCover: boolean;
  propertyId: string;
  sortOrder: number;
  storageBucket: string;
  storagePath: string;
  tenantId: string;
  url: string;
};

async function inserirMidia(supabase: Awaited<ReturnType<typeof criarClienteSupabaseServer>>, midia: NovaMidia) {
  const { error } = await supabase.from("media_assets").insert({
    alt: midia.alt,
    is_cover: midia.isCover,
    media_type: "image",
    property_id: midia.propertyId,
    sort_order: midia.sortOrder,
    status: "active",
    storage_bucket: midia.storageBucket,
    storage_path: midia.storagePath,
    tenant_id: midia.tenantId,
    url: midia.url
  });

  if (error) throw new Error(error.message);
}

async function carregarImagemGerenciavel(
  supabase: Awaited<ReturnType<typeof criarClienteSupabaseServer>>,
  tenantId: string,
  imagemId: string
) {
  const { data, error } = await supabase
    .from("media_assets")
    .select("*")
    .eq("id", imagemId)
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .maybeSingle<MediaAssetRow>();

  if (error || !data) throw new ErroRegraNegocio("Imagem não encontrada.");
  return data;
}

async function marcarImagemPrincipal(
  supabase: Awaited<ReturnType<typeof criarClienteSupabaseServer>>,
  imagem: MediaAssetRow
) {
  const { error: erroLimpeza } = await supabase
    .from("media_assets")
    .update({ is_cover: false })
    .eq("tenant_id", imagem.tenant_id)
    .eq("property_id", imagem.property_id)
    .eq("status", "active");

  if (erroLimpeza) throw new Error(erroLimpeza.message);

  const { error } = await supabase
    .from("media_assets")
    .update({ is_cover: true, sort_order: 0 })
    .eq("id", imagem.id)
    .eq("tenant_id", imagem.tenant_id);

  if (error) throw new Error(error.message);
}

async function obterProximaOrdem(
  supabase: Awaited<ReturnType<typeof criarClienteSupabaseServer>>,
  tenantId: string,
  propriedadeId: string
) {
  const consulta = supabase
    .from("media_assets")
    .select("sort_order")
    .eq("tenant_id", tenantId)
    .eq("property_id", propriedadeId)
    .eq("status", "active")
    .order("sort_order", { ascending: false })
    .limit(1);

  const { data, error } = await consulta.maybeSingle<{ sort_order: number }>();
  if (error) throw new Error(error.message);

  return (data?.sort_order ?? 0) + 1;
}
