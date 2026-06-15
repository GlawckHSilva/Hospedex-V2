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
  carregarUnidadeGerenciavel,
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
    const proximaOrdem = await obterProximaOrdem(supabase, escopo.tenantId, propriedadeId, null);

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
          storagePath: midia.path,
          unitId: null
        });
      })
    );

    revalidarModuloPropriedades();
  } catch (erro) {
    redirecionarComErro(caminhoRetorno, erro, "Erro ao enviar galeria da propriedade.");
  }

  redirect(`${caminhoRetorno}?sucesso=galeria-atualizada`);
}

export async function enviarImagensUnidadeAction(formData: FormData) {
  const escopo = await carregarEscopoGerenciamento();
  const caminhoRetorno = obterCaminhoRetorno(formData);

  try {
    const unidadeId = textoObrigatorio(formData, "unidadeId", "unidade");
    const arquivos = obterArquivosImagem(formData, "imagens");
    if (!arquivos.length) throw new ErroRegraNegocio("Selecione ao menos uma imagem.");

    const supabase = await criarClienteSupabaseServer();
    const unidade = await carregarUnidadeGerenciavel(supabase, escopo, unidadeId);
    const proximaOrdem = await obterProximaOrdem(
      supabase,
      escopo.tenantId,
      unidade.property_id,
      unidade.id
    );

    await Promise.all(
      arquivos.map(async (arquivo, indice) => {
        const midia = await enviarImagemParaStorage(
          supabase,
          {
            escopo: "unidade",
            propertyId: unidade.property_id,
            tenantId: escopo.tenantId,
            unitId: unidade.id
          },
          arquivo
        );

        await inserirMidia(supabase, {
          alt: arquivo.name,
          isCover: false,
          propertyId: unidade.property_id,
          sortOrder: proximaOrdem + indice,
          tenantId: escopo.tenantId,
          url: midia.url,
          storageBucket: midia.bucket,
          storagePath: midia.path,
          unitId: unidade.id
        });
      })
    );

    revalidarModuloPropriedades();
  } catch (erro) {
    redirecionarComErro(caminhoRetorno, erro, "Erro ao enviar imagens da unidade.");
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

    if (imagem.unit_id) {
      await carregarUnidadeGerenciavel(supabase, escopo, imagem.unit_id);
    } else if (imagem.property_id) {
      await carregarPropriedadeGerenciavel(supabase, escopo, imagem.property_id);
    }

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

    if (imagem.unit_id) {
      await carregarUnidadeGerenciavel(supabase, escopo, imagem.unit_id);
    } else if (imagem.property_id) {
      await carregarPropriedadeGerenciavel(supabase, escopo, imagem.property_id);
    }

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
    const delta = direcao === "subir" ? -1 : 1;

    const { error } = await supabase
      .from("media_assets")
      .update({ sort_order: Math.max(0, imagem.sort_order + delta) })
      .eq("id", imagem.id)
      .eq("tenant_id", escopo.tenantId);

    if (error) throw new Error(error.message);
    revalidarModuloPropriedades();
  } catch (erro) {
    redirecionarComErro(caminhoRetorno, erro, "Erro ao alterar ordem da imagem.");
  }

  redirect(`${caminhoRetorno}?sucesso=galeria-atualizada`);
}

type NovaMidia = {
  alt: string;
  isCover: boolean;
  propertyId: string;
  sortOrder: number;
  storageBucket: string;
  storagePath: string;
  tenantId: string;
  unitId: string | null;
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
    unit_id: midia.unitId,
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
  const consultaBase = supabase
    .from("media_assets")
    .update({ is_cover: false })
    .eq("tenant_id", imagem.tenant_id)
    .eq("property_id", imagem.property_id)
    .eq("status", "active");

  const { error: erroLimpeza } = imagem.unit_id
    ? await consultaBase.eq("unit_id", imagem.unit_id)
    : await consultaBase.is("unit_id", null);

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
  propriedadeId: string,
  unidadeId: string | null
) {
  let consulta = supabase
    .from("media_assets")
    .select("sort_order")
    .eq("tenant_id", tenantId)
    .eq("property_id", propriedadeId)
    .eq("status", "active")
    .order("sort_order", { ascending: false })
    .limit(1);

  consulta = unidadeId ? consulta.eq("unit_id", unidadeId) : consulta.is("unit_id", null);

  const { data, error } = await consulta.maybeSingle<{ sort_order: number }>();
  if (error) throw new Error(error.message);

  return (data?.sort_order ?? 0) + 1;
}
