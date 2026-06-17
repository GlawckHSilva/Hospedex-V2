export const TAMANHO_MAXIMO_IMAGEM_PROPRIEDADE_BYTES = 5 * 1024 * 1024;
export const TAMANHO_MAXIMO_IMAGEM_PROPRIEDADE_MB = 5;
export const TIPOS_IMAGEM_PROPRIEDADE_PERMITIDOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif"
] as const;

export function tipoImagemPropriedadePermitido(tipo: string) {
  return (TIPOS_IMAGEM_PROPRIEDADE_PERMITIDOS as readonly string[]).includes(tipo);
}
