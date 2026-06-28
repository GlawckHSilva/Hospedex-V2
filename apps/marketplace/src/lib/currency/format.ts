import type {
  CodigoMoeda,
  CotacoesCambio,
  MoedaConversao
} from "./types";

export function formatarMoeda(valor: number, moeda: CodigoMoeda) {
  return new Intl.NumberFormat("pt-BR", {
    currency: moeda,
    maximumFractionDigits: moeda === "BRL" ? 0 : 2,
    minimumFractionDigits: moeda === "BRL" ? 0 : 2,
    style: "currency"
  }).format(valor);
}

export function converterValorBrl(
  valorBrl: number | null,
  cotacoes: CotacoesCambio,
  moeda: MoedaConversao
) {
  if (!valorBrl || !cotacoes.disponivel) return null;

  const taxa = cotacoes.cotacoes[moeda]?.taxa ?? 0;
  if (taxa <= 0) return null;

  return valorBrl * taxa;
}

export function formatarDataCotacao(cotadoEm: string | null) {
  if (!cotadoEm) return null;

  const data = new Date(cotadoEm);
  if (Number.isNaN(data.getTime())) return null;

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo"
  }).format(data);
}
