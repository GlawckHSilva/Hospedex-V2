import type { RascunhoFormularioCasa } from "./types";

/**
 * Centraliza o rascunho local de Casas. Somente campos comuns do formulario
 * sao persistidos; arquivos, tokens e campos ocultos nunca entram nesta copia.
 */

export const EVENTO_RASCUNHO_CASA = "hospedex:rascunho-casa-atualizado";

export function obterChaveRascunhoCasa(
  modo: "criar" | "editar",
  userId: string,
  propriedadeId?: string,
) {
  return `hospedex:v2:rascunho-casa:${userId}:${modo}:${propriedadeId ?? "nova"}`;
}

export function lerRascunhoCasaLocal(chave: string) {
  if (typeof window === "undefined") return null;

  try {
    const valor = window.localStorage.getItem(chave);
    if (!valor) return null;
    const rascunho = JSON.parse(valor) as RascunhoFormularioCasa;
    return rascunho.versao === 1 && rascunho.operacaoId ? rascunho : null;
  } catch {
    return null;
  }
}

export function listarRascunhosCasasLocais(userId: string) {
  if (typeof window === "undefined") return [];
  const prefixo = `hospedex:v2:rascunho-casa:${userId}:`;

  try {
    return Object.keys(window.localStorage)
      .filter((chave) => chave.startsWith(prefixo))
      .map(lerRascunhoCasaLocal)
      .filter((item): item is RascunhoFormularioCasa => Boolean(item))
      .sort(
        (a, b) =>
          new Date(b.salvoEm).getTime() - new Date(a.salvoEm).getTime(),
      );
  } catch {
    return [];
  }
}

export function obterCampoRascunho(
  rascunho: RascunhoFormularioCasa,
  nome: string,
) {
  return rascunho.campos[nome]?.[0]?.valor ?? "";
}

export function notificarRascunhoCasaAtualizado() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(EVENTO_RASCUNHO_CASA));
  }
}
