import type { MediaAssetRow } from "@hospedex/types";

import {
  TAMANHO_MAXIMO_IMAGEM_PROPRIEDADE_BYTES,
  TAMANHO_MAXIMO_IMAGEM_PROPRIEDADE_MB,
  tipoImagemPropriedadePermitido
} from "./media-limits";
import { ErroRegraNegocio, type ClienteSupabaseServer } from "./permissions";

/**
 * Integração de mídia com Supabase Storage.
 *
 * Os caminhos sempre começam com tenant_id para que as policies do Storage
 * consigam validar isolamento multi-tenant antes de aceitar upload, update ou delete.
 */

export const BUCKET_MIDIA_PROPRIEDADES = "hospedex-property-media";
const TIPOS_LOGO_TENANT_PERMITIDOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml"
] as const;

export type DestinoMidia = {
  tenantId: string;
  propertyId: string;
  escopo: "capa" | "galeria";
};

export type DestinoLogoTenant = {
  tenantId: string;
};

export type DestinoGuiaRegiao = {
  tenantId: string;
  localId?: string;
};

export function obterArquivosImagem(formData: FormData, chave: string): File[] {
  return formData
    .getAll(chave)
    .filter((valor): valor is File => valor instanceof File && valor.size > 0);
}

export function obterArquivoImagem(formData: FormData, chave: string): File | null {
  return obterArquivosImagem(formData, chave)[0] ?? null;
}

export async function enviarImagemParaStorage(
  supabase: ClienteSupabaseServer,
  destino: DestinoMidia,
  arquivo: File,
  chaveIdempotencia?: string
) {
  validarImagem(arquivo);

  const caminho = montarCaminhoStorage(destino, arquivo, chaveIdempotencia);
  console.info("Upload de imagem da casa iniciado.", {
    bucket: BUCKET_MIDIA_PROPRIEDADES,
    escopo: destino.escopo,
    mimeType: arquivo.type,
    propertyId: destino.propertyId,
    tamanhoBytes: arquivo.size,
    tenantId: destino.tenantId,
  });
  const { error } = await supabase.storage
    .from(BUCKET_MIDIA_PROPRIEDADES)
    .upload(caminho, arquivo, {
      contentType: arquivo.type,
      // O caminho estavel identifica repeticoes. Evitamos upsert porque ele
      // exige SELECT no bucket, leitura bloqueada para impedir enumeracao.
      upsert: false
    });

  if (error && !objetoStorageJaExiste(error.message)) {
    console.error("Falha no upload da imagem da casa.", {
      bucket: BUCKET_MIDIA_PROPRIEDADES,
      caminho,
      escopo: destino.escopo,
      mensagemTecnica: error.message,
      mimeType: arquivo.type,
      propertyId: destino.propertyId,
      tamanhoBytes: arquivo.size,
      tenantId: destino.tenantId,
    });
    throw new ErroRegraNegocio(
      "Nao foi possivel enviar a imagem para o armazenamento.",
      `Storage upload falhou: ${error.message}`,
    );
  }

  console.info("Upload de imagem da casa concluido.", {
    bucket: BUCKET_MIDIA_PROPRIEDADES,
    caminho,
    escopo: destino.escopo,
    propertyId: destino.propertyId,
    tenantId: destino.tenantId,
  });

  const { data } = supabase.storage.from(BUCKET_MIDIA_PROPRIEDADES).getPublicUrl(caminho);

  return {
    bucket: BUCKET_MIDIA_PROPRIEDADES,
    path: caminho,
    url: data.publicUrl
  };
}

function objetoStorageJaExiste(mensagem: string) {
  const normalizada = mensagem.toLowerCase();
  return (
    normalizada.includes("already exists") ||
    normalizada.includes("duplicate") ||
    normalizada.includes("resource exists")
  );
}

export async function removerImagemDoStorage(
  supabase: ClienteSupabaseServer,
  imagem: MediaAssetRow
) {
  if (!imagem.storage_path) return;

  const { error } = await supabase.storage
    .from(imagem.storage_bucket ?? BUCKET_MIDIA_PROPRIEDADES)
    .remove([imagem.storage_path]);

  if (error) throw new ErroRegraNegocio(`Erro ao remover imagem do Storage: ${error.message}`);
}

export async function enviarLogoTenantParaStorage(
  supabase: ClienteSupabaseServer,
  destino: DestinoLogoTenant,
  arquivo: File
) {
  validarLogoTenant(arquivo);

  const caminho = montarCaminhoLogoTenant(destino, arquivo);
  const { error } = await supabase.storage
    .from(BUCKET_MIDIA_PROPRIEDADES)
    .upload(caminho, arquivo, {
      contentType: arquivo.type,
      upsert: false
    });

  if (error) throw new ErroRegraNegocio(`Erro ao enviar logo para o Storage: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET_MIDIA_PROPRIEDADES).getPublicUrl(caminho);

  return {
    bucket: BUCKET_MIDIA_PROPRIEDADES,
    path: caminho,
    url: data.publicUrl
  };
}

export async function enviarImagemGuiaRegiaoParaStorage(
  supabase: ClienteSupabaseServer,
  destino: DestinoGuiaRegiao,
  arquivo: File
) {
  validarImagemGuiaRegiao(arquivo);

  const caminho = montarCaminhoGuiaRegiao(destino, arquivo);
  const { error } = await supabase.storage
    .from(BUCKET_MIDIA_PROPRIEDADES)
    .upload(caminho, arquivo, {
      contentType: arquivo.type,
      upsert: false
    });

  if (error) {
    throw new ErroRegraNegocio(`Erro ao enviar imagem do guia da região: ${error.message}`);
  }

  const { data } = supabase.storage.from(BUCKET_MIDIA_PROPRIEDADES).getPublicUrl(caminho);

  return {
    bucket: BUCKET_MIDIA_PROPRIEDADES,
    path: caminho,
    url: data.publicUrl
  };
}

export async function removerLogoTenantDoStorage(
  supabase: ClienteSupabaseServer,
  destino: DestinoLogoTenant,
  logoUrl: string | null
) {
  const caminho = extrairCaminhoLogoTenant(logoUrl, destino.tenantId);

  if (!caminho) return;

  const { error } = await supabase.storage.from(BUCKET_MIDIA_PROPRIEDADES).remove([caminho]);

  if (error) throw new ErroRegraNegocio(`Erro ao remover logo do Storage: ${error.message}`);
}

function validarImagem(arquivo: File) {
  if (!tipoImagemPropriedadePermitido(arquivo.type)) {
    throw new ErroRegraNegocio("Formato de imagem inválido. Use JPG, PNG, WebP ou GIF.");
  }

  if (arquivo.size > TAMANHO_MAXIMO_IMAGEM_PROPRIEDADE_BYTES) {
    throw new ErroRegraNegocio(
      `Imagem acima do limite de ${TAMANHO_MAXIMO_IMAGEM_PROPRIEDADE_MB}MB.`
    );
  }
}

function validarLogoTenant(arquivo: File) {
  if (!(TIPOS_LOGO_TENANT_PERMITIDOS as readonly string[]).includes(arquivo.type)) {
    throw new ErroRegraNegocio("Formato de logo invalido. Use JPG, PNG, WebP ou SVG.");
  }

  if (arquivo.size > TAMANHO_MAXIMO_IMAGEM_PROPRIEDADE_BYTES) {
    throw new ErroRegraNegocio(
      `Logo acima do limite de ${TAMANHO_MAXIMO_IMAGEM_PROPRIEDADE_MB}MB.`
    );
  }
}

function validarImagemGuiaRegiao(arquivo: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(arquivo.type)) {
    throw new ErroRegraNegocio("Formato de imagem inválido. Use JPG, PNG ou WebP.");
  }

  if (arquivo.size > TAMANHO_MAXIMO_IMAGEM_PROPRIEDADE_BYTES) {
    throw new ErroRegraNegocio(
      `Imagem acima do limite de ${TAMANHO_MAXIMO_IMAGEM_PROPRIEDADE_MB}MB.`
    );
  }
}

function montarCaminhoStorage(
  destino: DestinoMidia,
  arquivo: File,
  chaveIdempotencia?: string
): string {
  const nomeSeguro = normalizarNomeArquivo(arquivo.name);
  const identificador = chaveIdempotencia ?? Date.now().toString();
  return `${destino.tenantId}/properties/${destino.propertyId}/${destino.escopo}/${identificador}-${nomeSeguro}`;
}

function montarCaminhoLogoTenant(destino: DestinoLogoTenant, arquivo: File): string {
  const nomeSeguro = normalizarNomeArquivo(arquivo.name);

  // O tenant_id fica no inicio do path para preservar isolamento multi-tenant no Storage.
  return `${destino.tenantId}/tenant/logo/${Date.now()}-${nomeSeguro}`;
}

function montarCaminhoGuiaRegiao(destino: DestinoGuiaRegiao, arquivo: File): string {
  const nomeSeguro = normalizarNomeArquivo(arquivo.name);
  const local = destino.localId ?? "novo";

  // O tenant_id no início do caminho permite que a policy de Storage bloqueie
  // uploads fora do tenant do proprietário autenticado.
  return `${destino.tenantId}/regional-guide/${local}/${Date.now()}-${nomeSeguro}`;
}

function extrairCaminhoLogoTenant(logoUrl: string | null, tenantId: string): string | null {
  if (!logoUrl) return null;

  try {
    const url = new URL(logoUrl);
    const marcador = `/object/public/${BUCKET_MIDIA_PROPRIEDADES}/`;
    const indice = url.pathname.indexOf(marcador);

    if (indice === -1) return null;

    const caminho = decodeURIComponent(url.pathname.slice(indice + marcador.length));
    const prefixoSeguro = `${tenantId}/tenant/logo/`;

    return caminho.startsWith(prefixoSeguro) ? caminho : null;
  } catch {
    return null;
  }
}

function normalizarNomeArquivo(nome: string): string {
  const extensao = nome.split(".").pop()?.toLowerCase() ?? "jpg";
  const base = nome
    .replace(/\.[^.]+$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

  return `${base || "imagem"}.${extensao}`;
}
