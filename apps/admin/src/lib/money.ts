/**
 * Utilitários monetários do Gerenciamento.
 *
 * Entradas de formulário podem chegar como "R$ 1.234,56", "1234,56" ou
 * "1234.56". A normalização evita parseFloat direto em moeda brasileira.
 */
export function normalizarMoedaFormulario(valor: string): number {
  const limpo = valor.trim().replace(/[^\d,.-]/g, "");

  if (!limpo || limpo.includes("-")) return Number.NaN;

  const temVirgula = limpo.includes(",");
  const normalizado = temVirgula
    ? limpo.replace(/\./g, "").replace(",", ".")
    : normalizarSemVirgula(limpo);

  const numero = Number(normalizado);
  return Number.isFinite(numero) ? Math.round(numero * 100) / 100 : Number.NaN;
}

function normalizarSemVirgula(valor: string) {
  const partes = valor.split(".");

  if (partes.length === 1) return valor;
  if (partes.length === 2 && (partes[1]?.length ?? 0) <= 2) return valor;

  return valor.replace(/\./g, "");
}
