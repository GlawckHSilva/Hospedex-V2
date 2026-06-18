import type {
  RegionalGuideCategory,
  RegionalGuideLocationRow,
  RegionalGuideStatus
} from "@hospedex/types";

/**
 * Contratos do Guia da Regiao no Gerenciamento.
 *
 * O proprietario cadastra recomendacoes locais do tenant. A exibicao publica
 * para hospedes sera ligada em etapa futura, usando estes mesmos dados.
 */

export const CATEGORIAS_GUIA_REGIAO: Array<{
  label: string;
  value: RegionalGuideCategory | "todas";
}> = [
  { label: "Todas", value: "todas" },
  { label: "Restaurantes", value: "restaurants" },
  { label: "Lanchonetes", value: "snack_bars" },
  { label: "Cafeterias", value: "coffee_shops" },
  { label: "Mercados", value: "markets" },
  { label: "Farmacias", value: "pharmacies" },
  { label: "Hospitais", value: "hospitals" },
  { label: "Passeios", value: "tours" },
  { label: "Praias", value: "beaches" },
  { label: "Cachoeiras", value: "waterfalls" },
  { label: "Pontos turisticos", value: "tourist_spots" },
  { label: "Vida noturna", value: "nightlife" },
  { label: "Outros", value: "others" }
];

export const STATUS_GUIA_REGIAO: Array<{
  label: string;
  value: RegionalGuideStatus | "todos";
}> = [
  { label: "Todos", value: "todos" },
  { label: "Ativos", value: "active" },
  { label: "Inativos", value: "inactive" }
];

export const LABEL_CATEGORIA_GUIA_REGIAO: Record<RegionalGuideCategory, string> = {
  beaches: "Praias",
  coffee_shops: "Cafeterias",
  hospitals: "Hospitais",
  markets: "Mercados",
  nightlife: "Vida noturna",
  others: "Outros",
  pharmacies: "Farmacias",
  restaurants: "Restaurantes",
  snack_bars: "Lanchonetes",
  tourist_spots: "Pontos turisticos",
  tours: "Passeios",
  waterfalls: "Cachoeiras"
};

export type FiltroCategoriaGuiaRegiao = RegionalGuideCategory | "todas";
export type FiltroStatusGuiaRegiao = RegionalGuideStatus | "todos";

export type FiltrosGuiaRegiao = {
  categoria: FiltroCategoriaGuiaRegiao;
  status: FiltroStatusGuiaRegiao;
};

export type ResumoGuiaRegiao = {
  ativos: number;
  inativos: number;
  total: number;
};

export type DadosModuloGuiaRegiao = {
  filtros: FiltrosGuiaRegiao;
  locais: RegionalGuideLocationRow[];
  podeGerenciar: boolean;
  resumo: ResumoGuiaRegiao;
  tenantNome: string;
};

export type SearchParamsGuiaRegiao = {
  erro?: string;
  sucesso?: string;
};
