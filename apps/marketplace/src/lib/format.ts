/**
 * Utilitários de texto público do Marketplace.
 *
 * Mantém pluralização e formatação básica em um único lugar para evitar textos
 * como "1 hóspedes" ou "2 quarto" em cards, reservas e favoritos.
 */
export function pluralizar(
  quantidade: number,
  singular: string,
  plural = `${singular}s`,
) {
  return quantidade === 1 ? singular : plural;
}

export function formatarQuantidade(
  quantidade: number,
  singular: string,
  plural = `${singular}s`,
) {
  return `${quantidade} ${pluralizar(quantidade, singular, plural)}`;
}

export function formatarNoites(quantidade: number) {
  return formatarQuantidade(quantidade, "noite", "noites");
}

export function formatarDiarias(quantidade: number) {
  return formatarQuantidade(quantidade, "diária", "diárias");
}
