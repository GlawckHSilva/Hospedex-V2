import type { MediaAssetRow } from "@hospedex/types";

import type { ClienteSupabaseServer } from "./permissions";

/**
 * Integração de mídia com Supabase Storage.
 *
 * Os caminhos sempre começam com tenant_id para que as policies do Storage
 * consigam validar isolamento multi-tenant antes de aceitar upload, update ou delete.
 */

export const BUCKET_MIDIA_PROPRIEDADES = "hospedex-property-media";

const TAMANHO_MAXIMO_IMAGEM = 5 * 1024 * 1024;
const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export type DestinoMidia = {
  tenantId: string;
  propertyId: string;
  unitId?: string;
  escopo: "capa" | "galeria" | "unidade";
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
  arquivo: File
) {
  validarImagem(arquivo);

  const caminho = montarCaminhoStorage(destino, arquivo);
  const { error } = await supabase.storage
    .from(BUCKET_MIDIA_PROPRIEDADES)
    .upload(caminho, arquivo, {
      contentType: arquivo.type,
      upsert: false
    });

  if (error) throw new Error(`Erro ao enviar imagem para o Storage: ${error.message}`);

  const { data } = supabase.storage
    .from(BUCKET_MIDIA_PROPRIEDADES)
    .getPublicUrl(caminho);

  return {
    bucket: BUCKET_MIDIA_PROPRIEDADES,
    path: caminho,
    url: data.publicUrl
  };
}

export async function removerImagemDoStorage(
  supabase: ClienteSupabaseServer,
  imagem: MediaAssetRow
) {
  if (!imagem.storage_path) return;

  const { error } = await supabase.storage
    .from(imagem.storage_bucket ?? BUCKET_MIDIA_PROPRIEDADES)
    .remove([imagem.storage_path]);

  if (error) throw new Error(`Erro ao remover imagem do Storage: ${error.message}`);
}

function validarImagem(arquivo: File) {
  if (!TIPOS_PERMITIDOS.includes(arquivo.type)) {
    throw new Error("Formato de imagem inválido. Use JPG, PNG, WebP ou GIF.");
  }

  if (arquivo.size > TAMANHO_MAXIMO_IMAGEM) {
    throw new Error("Imagem acima do limite de 5MB.");
  }
}

function montarCaminhoStorage(destino: DestinoMidia, arquivo: File): string {
  const nomeSeguro = normalizarNomeArquivo(arquivo.name);
  const pastaEntidade = destino.unitId
    ? `units/${destino.unitId}`
    : `properties/${destino.propertyId}`;

  return `${destino.tenantId}/${pastaEntidade}/${destino.escopo}/${Date.now()}-${nomeSeguro}`;
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
