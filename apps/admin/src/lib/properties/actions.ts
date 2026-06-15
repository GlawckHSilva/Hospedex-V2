"use server";

import type {
  PropertyRow,
  PropertyStatus,
  PropertyType,
  UnitCategoryRow,
  UnitRow,
  UnitStatus
} from "@hospedex/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { criarClienteSupabaseServer } from "../supabase/server";
import { carregarLimitesPlano } from "./data";
import { enviarImagemParaStorage, obterArquivoImagem } from "./media-storage";
import {
  carregarEscopoGerenciamento,
  ErroRegraNegocio,
  type ClienteSupabaseServer,
  type EscopoGerenciamento
} from "./permissions";
import type { EnderecoPropriedade } from "./types";

/**
 * Server actions do módulo de Propriedades e Unidades.
 *
 * As regras de tenant, owner, plano e feature flag ficam no servidor porque o
 * cliente nunca deve decidir sozinho o que pode ser gravado em um SaaS multi-tenant.
 */

const CAMINHO_PROPRIEDADES = "/propriedades";
const CAMINHO_UNIDADES = "/unidades";
const STATUS_PROPRIEDADE: PropertyStatus[] = ["draft", "published", "paused"];
const TIPOS_PROPRIEDADE: PropertyType[] = ["seasonal_home", "inn", "small_hotel"];
const STATUS_UNIDADE: UnitStatus[] = ["active", "inactive", "maintenance"];
const CATEGORIAS_UNIDADE = ["Standard", "Luxo", "Master"];

type EntradaPropriedade = {
  nome: string;
  descricao: string | null;
  tipo: PropertyType;
  endereco: EnderecoPropriedade;
  status: PropertyStatus;
  imagemCapaArquivo: File | null;
};

type EntradaUnidade = {
  propriedadeId: string;
  nome: string;
  categoria: string;
  capacidade: number;
  quartos: number;
  camas: number;
  banheiros: number;
  valorBase: number;
  status: UnitStatus;
};

export async function criarPropriedadeAction(formData: FormData) {
  const escopo = await carregarEscopoGerenciamento();

  try {
    const entrada = obterEntradaPropriedade(formData);
    const supabase = await criarClienteSupabaseServer();

    await garantirLimitePropriedades(supabase, escopo.tenantId);

    const { data: propriedade, error } = await supabase
      .from("properties")
      .insert({
        tenant_id: escopo.tenantId,
        // O owner_id vem do tenant, não do usuário logado, para equipe criar sem virar dona do imóvel.
        owner_id: escopo.ownerId,
        name: entrada.nome,
        slug: gerarIdentificadorUrl(entrada.nome),
        property_type: entrada.tipo,
        status: entrada.status,
        headline: entrada.nome,
        description: entrada.descricao,
        address: entrada.endereco,
        timezone: "America/Sao_Paulo"
      })
      .select("*")
      .single<PropertyRow>();

    if (error || !propriedade) {
      throw new Error(error?.message ?? "Propriedade não retornada após criação.");
    }

    await salvarImagemCapa(supabase, escopo.tenantId, propriedade.id, entrada);
    revalidarModulo();
  } catch (erro) {
    redirecionarComErro(CAMINHO_PROPRIEDADES, erro, "Erro ao criar propriedade.");
  }

  redirect(`${CAMINHO_PROPRIEDADES}?sucesso=propriedade-criada`);
}

export async function atualizarPropriedadeAction(formData: FormData) {
  const escopo = await carregarEscopoGerenciamento();

  try {
    const propriedadeId = textoObrigatorio(formData, "propriedadeId", "propriedade");
    const entrada = obterEntradaPropriedade(formData);
    const supabase = await criarClienteSupabaseServer();

    const { data: propriedade, error } = await supabase
      .from("properties")
      .update({
        name: entrada.nome,
        property_type: entrada.tipo,
        status: entrada.status,
        headline: entrada.nome,
        description: entrada.descricao,
        address: entrada.endereco
      })
      .eq("id", propriedadeId)
      .eq("tenant_id", escopo.tenantId)
      .eq("owner_id", escopo.ownerId)
      .select("*")
      .maybeSingle<PropertyRow>();

    if (error || !propriedade) {
      throw new ErroRegraNegocio("Propriedade não encontrada para este tenant.");
    }

    await salvarImagemCapa(supabase, escopo.tenantId, propriedade.id, entrada);
    revalidarModulo();
  } catch (erro) {
    redirecionarComErro(CAMINHO_PROPRIEDADES, erro, "Erro ao atualizar propriedade.");
  }

  redirect(`${CAMINHO_PROPRIEDADES}?sucesso=propriedade-atualizada`);
}

export async function alternarStatusPropriedadeAction(formData: FormData) {
  const escopo = await carregarEscopoGerenciamento();

  try {
    const propriedadeId = textoObrigatorio(formData, "propriedadeId", "propriedade");
    const supabase = await criarClienteSupabaseServer();
    const propriedade = await carregarPropriedadeDoTenant(
      supabase,
      escopo,
      propriedadeId
    );
    const statusDestino: PropertyStatus =
      propriedade.status === "paused" ? "published" : "paused";

    // Pausar preserva dados e unidades; arquivamento fica fora desta etapa para evitar perda operacional.
    const { error } = await supabase
      .from("properties")
      .update({ status: statusDestino })
      .eq("id", propriedade.id)
      .eq("tenant_id", escopo.tenantId)
      .eq("owner_id", escopo.ownerId);

    if (error) throw new Error(error.message);
    revalidarModulo();
  } catch (erro) {
    redirecionarComErro(CAMINHO_PROPRIEDADES, erro, "Erro ao alterar status.");
  }

  redirect(`${CAMINHO_PROPRIEDADES}?sucesso=status-propriedade`);
}

export async function criarUnidadeAction(formData: FormData) {
  const escopo = await carregarEscopoGerenciamento();
  const caminhoRetorno = obterCaminhoRetorno(formData);

  try {
    const entrada = obterEntradaUnidade(formData);
    const supabase = await criarClienteSupabaseServer();

    await carregarPropriedadeDoTenant(supabase, escopo, entrada.propriedadeId);
    await garantirLimiteUnidades(supabase, escopo.tenantId);
    await garantirRegraMultiUnidade(
      supabase,
      escopo.tenantId,
      entrada.propriedadeId,
      escopo.contexto.featureFlags.multi_unit
    );

    const categoria = await criarOuObterCategoria(supabase, escopo.tenantId, entrada);
    const { error } = await supabase.from("units").insert({
      tenant_id: escopo.tenantId,
      property_id: entrada.propriedadeId,
      unit_category_id: categoria?.id ?? null,
      code: gerarIdentificadorUrl(entrada.nome),
      name: entrada.nome,
      status: entrada.status,
      capacity: entrada.capacidade,
      bedrooms: entrada.quartos,
      beds: entrada.camas,
      bathrooms: entrada.banheiros,
      base_price: entrada.valorBase
    });

    if (error) throw new Error(error.message);
    revalidarModulo();
  } catch (erro) {
    redirecionarComErro(caminhoRetorno, erro, "Erro ao criar unidade.");
  }

  redirect(`${caminhoRetorno}?sucesso=unidade-criada`);
}

export async function atualizarUnidadeAction(formData: FormData) {
  const escopo = await carregarEscopoGerenciamento();
  const caminhoRetorno = obterCaminhoRetorno(formData);

  try {
    const unidadeId = textoObrigatorio(formData, "unidadeId", "unidade");
    const entrada = obterEntradaUnidade(formData);
    const supabase = await criarClienteSupabaseServer();
    const unidadeAtual = await carregarUnidadeDoTenant(supabase, escopo.tenantId, unidadeId);

    await carregarPropriedadeDoTenant(supabase, escopo, entrada.propriedadeId);
    await garantirRegraMultiUnidade(
      supabase,
      escopo.tenantId,
      entrada.propriedadeId,
      escopo.contexto.featureFlags.multi_unit,
      unidadeId
    );

    const categoria = await criarOuObterCategoria(supabase, escopo.tenantId, entrada);
    const mudouPropriedade = unidadeAtual.property_id !== entrada.propriedadeId;
    const { error } = await supabase
      .from("units")
      .update({
        property_id: entrada.propriedadeId,
        unit_category_id: categoria?.id ?? null,
        code: mudouPropriedade ? gerarIdentificadorUrl(entrada.nome) : unidadeAtual.code,
        name: entrada.nome,
        status: entrada.status,
        capacity: entrada.capacidade,
        bedrooms: entrada.quartos,
        beds: entrada.camas,
        bathrooms: entrada.banheiros,
        base_price: entrada.valorBase
      })
      .eq("id", unidadeId)
      .eq("tenant_id", escopo.tenantId);

    if (error) throw new Error(error.message);
    revalidarModulo();
  } catch (erro) {
    redirecionarComErro(caminhoRetorno, erro, "Erro ao atualizar unidade.");
  }

  redirect(`${caminhoRetorno}?sucesso=unidade-atualizada`);
}

export async function alternarStatusUnidadeAction(formData: FormData) {
  const escopo = await carregarEscopoGerenciamento();
  const caminhoRetorno = obterCaminhoRetorno(formData);

  try {
    const unidadeId = textoObrigatorio(formData, "unidadeId", "unidade");
    const supabase = await criarClienteSupabaseServer();
    const unidade = await carregarUnidadeDoTenant(supabase, escopo.tenantId, unidadeId);
    const statusDestino: UnitStatus = unidade.status === "active" ? "inactive" : "active";

    // A pausa operacional deixa a unidade fora do uso futuro sem apagar histórico ou categoria.
    const { error } = await supabase
      .from("units")
      .update({ status: statusDestino })
      .eq("id", unidade.id)
      .eq("tenant_id", escopo.tenantId);

    if (error) throw new Error(error.message);
    revalidarModulo();
  } catch (erro) {
    redirecionarComErro(caminhoRetorno, erro, "Erro ao alterar unidade.");
  }

  redirect(`${caminhoRetorno}?sucesso=status-unidade`);
}

function obterEntradaPropriedade(formData: FormData): EntradaPropriedade {
  return {
    nome: textoObrigatorio(formData, "nome", "nome"),
    descricao: textoOpcional(formData, "descricao"),
    tipo: validarTipoPropriedade(textoObrigatorio(formData, "tipo", "tipo")),
    endereco: {
      linha1: textoObrigatorio(formData, "endereco", "endereço"),
      cidade: textoObrigatorio(formData, "cidade", "cidade"),
      estado: textoObrigatorio(formData, "estado", "estado")
    },
    status: validarStatusPropriedade(textoObrigatorio(formData, "status", "status")),
    imagemCapaArquivo: obterArquivoImagem(formData, "imagemCapaArquivo")
  };
}

function obterEntradaUnidade(formData: FormData): EntradaUnidade {
  return {
    propriedadeId: textoObrigatorio(formData, "propriedadeId", "propriedade"),
    nome: textoObrigatorio(formData, "nome", "nome"),
    categoria: validarCategoriaUnidade(textoObrigatorio(formData, "categoria", "categoria")),
    capacidade: numeroInteiro(formData, "capacidade", "capacidade", 1),
    quartos: numeroInteiro(formData, "quartos", "quartos", 0),
    camas: numeroInteiro(formData, "camas", "camas", 1),
    banheiros: numeroInteiro(formData, "banheiros", "banheiros", 0),
    valorBase: numeroMoeda(formData, "valorBase", "valor base"),
    status: validarStatusUnidade(textoObrigatorio(formData, "status", "status"))
  };
}

async function garantirLimitePropriedades(
  supabase: ClienteSupabaseServer,
  tenantId: string
) {
  const limites = await carregarLimitesPlano(tenantId);
  const { count, error } = await supabase
    .from("properties")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .neq("status", "archived");

  if (error) throw new Error(error.message);

  if ((count ?? 0) >= limites.maxPropriedades) {
    throw new ErroRegraNegocio(
      `Limite do plano atingido: ${limites.maxPropriedades} propriedade(s).`
    );
  }
}

async function garantirLimiteUnidades(supabase: ClienteSupabaseServer, tenantId: string) {
  const limites = await carregarLimitesPlano(tenantId);
  const { count, error } = await supabase
    .from("units")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId);

  if (error) throw new Error(error.message);

  if ((count ?? 0) >= limites.maxUnidades) {
    throw new ErroRegraNegocio(
      `Limite do plano atingido: ${limites.maxUnidades} unidade(s).`
    );
  }
}

async function garantirRegraMultiUnidade(
  supabase: ClienteSupabaseServer,
  tenantId: string,
  propriedadeId: string,
  multiUnidadeAtivo: boolean | undefined,
  unidadeIdIgnorada?: string
) {
  if (multiUnidadeAtivo) return;

  let consulta = supabase
    .from("units")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("property_id", propriedadeId);

  if (unidadeIdIgnorada) {
    consulta = consulta.neq("id", unidadeIdIgnorada);
  }

  const { count, error } = await consulta;
  if (error) throw new Error(error.message);

  // Sem a feature flag multi_unit, uma propriedade representa uma casa ou unidade única.
  if ((count ?? 0) > 0) {
    throw new ErroRegraNegocio(
      "A feature flag de multiunidades está desligada para este tenant."
    );
  }
}

async function carregarPropriedadeDoTenant(
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

async function carregarUnidadeDoTenant(
  supabase: ClienteSupabaseServer,
  tenantId: string,
  unidadeId: string
) {
  const { data, error } = await supabase
    .from("units")
    .select("*")
    .eq("id", unidadeId)
    .eq("tenant_id", tenantId)
    .maybeSingle<UnitRow>();

  if (error || !data) {
    throw new ErroRegraNegocio("Unidade não encontrada para este tenant.");
  }

  return data;
}

async function criarOuObterCategoria(
  supabase: ClienteSupabaseServer,
  tenantId: string,
  entrada: EntradaUnidade
) {
  const { data: categoriaExistente, error: erroBusca } = await supabase
    .from("unit_categories")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("property_id", entrada.propriedadeId)
    .eq("name", entrada.categoria)
    .maybeSingle<UnitCategoryRow>();

  if (erroBusca) throw new Error(erroBusca.message);
  if (categoriaExistente) return categoriaExistente;

  // A categoria nasce simples para agrupar unidades semelhantes sem criar CRUD específico agora.
  const { data: categoria, error } = await supabase
    .from("unit_categories")
    .insert({
      tenant_id: tenantId,
      property_id: entrada.propriedadeId,
      name: entrada.categoria,
      max_guests: entrada.capacidade,
      bedrooms: entrada.quartos,
      bathrooms: entrada.banheiros
    })
    .select("*")
    .single<UnitCategoryRow>();

  if (error || !categoria) throw new Error(error?.message ?? "Categoria não criada.");
  return categoria;
}

async function salvarImagemCapa(
  supabase: ClienteSupabaseServer,
  tenantId: string,
  propriedadeId: string,
  entrada: EntradaPropriedade
) {
  if (!entrada.imagemCapaArquivo) return;

  const arquivo = await enviarImagemParaStorage(
    supabase,
    {
      escopo: "capa",
      propertyId: propriedadeId,
      tenantId
    },
    entrada.imagemCapaArquivo
  );

  // Apenas uma imagem principal fica marcada por propriedade para evitar ambiguidade no marketplace futuro.
  const { error: erroCapaAnterior } = await supabase
    .from("media_assets")
    .update({ is_cover: false })
    .eq("tenant_id", tenantId)
    .eq("property_id", propriedadeId)
    .is("unit_id", null)
    .eq("is_cover", true);

  if (erroCapaAnterior) throw new Error(erroCapaAnterior.message);

  const { error } = await supabase.from("media_assets").insert({
    tenant_id: tenantId,
    property_id: propriedadeId,
    unit_id: null,
    media_type: "image",
    storage_bucket: arquivo.bucket,
    storage_path: arquivo.path,
    url: arquivo.url,
    alt: `Imagem de capa de ${entrada.nome}`,
    sort_order: 0,
    is_cover: true,
    status: "active"
  });
  if (error) throw new Error(error.message);
}

function textoObrigatorio(formData: FormData, chave: string, label: string): string {
  const valor = formData.get(chave)?.toString().trim();
  if (!valor) throw new ErroRegraNegocio(`Informe ${label}.`);
  return valor;
}

function textoOpcional(formData: FormData, chave: string): string | null {
  const valor = formData.get(chave)?.toString().trim();
  return valor ? valor : null;
}

function numeroInteiro(
  formData: FormData,
  chave: string,
  label: string,
  minimo: number
): number {
  const valor = Number.parseInt(textoObrigatorio(formData, chave, label), 10);
  if (Number.isNaN(valor) || valor < minimo) {
    throw new ErroRegraNegocio(`Informe ${label} válido.`);
  }
  return valor;
}

function numeroMoeda(formData: FormData, chave: string, label: string): number {
  const valor = Number.parseFloat(textoObrigatorio(formData, chave, label).replace(",", "."));
  if (Number.isNaN(valor) || valor < 0) {
    throw new ErroRegraNegocio(`Informe ${label} válido.`);
  }
  return valor;
}

function validarTipoPropriedade(valor: string): PropertyType {
  if (TIPOS_PROPRIEDADE.includes(valor as PropertyType)) return valor as PropertyType;
  throw new ErroRegraNegocio("Tipo de propriedade inválido.");
}

function validarStatusPropriedade(valor: string): PropertyStatus {
  if (STATUS_PROPRIEDADE.includes(valor as PropertyStatus)) {
    return valor as PropertyStatus;
  }
  throw new ErroRegraNegocio("Status da propriedade inválido.");
}

function validarStatusUnidade(valor: string): UnitStatus {
  if (STATUS_UNIDADE.includes(valor as UnitStatus)) return valor as UnitStatus;
  throw new ErroRegraNegocio("Status da unidade inválido.");
}

function validarCategoriaUnidade(valor: string): string {
  if (CATEGORIAS_UNIDADE.includes(valor)) return valor;
  throw new ErroRegraNegocio("Categoria da unidade inválida.");
}

function gerarIdentificadorUrl(valor: string): string {
  const base = valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

  return `${base || "item"}-${Date.now().toString(36)}`;
}

function redirecionarComErro(caminho: string, erro: unknown, mensagemLog: string): never {
  const mensagem =
    erro instanceof ErroRegraNegocio
      ? erro.message
      : "Não foi possível concluir a operação.";

  if (!(erro instanceof ErroRegraNegocio)) {
    console.error(mensagemLog, erro);
  }

  redirect(`${caminho}?erro=${encodeURIComponent(mensagem)}`);
}

function revalidarModulo() {
  revalidatePath(CAMINHO_PROPRIEDADES);
  revalidatePath(CAMINHO_UNIDADES);
}

function obterCaminhoRetorno(formData: FormData): string {
  const retorno = formData.get("retorno")?.toString();
  return retorno === CAMINHO_PROPRIEDADES ? CAMINHO_PROPRIEDADES : CAMINHO_UNIDADES;
}
