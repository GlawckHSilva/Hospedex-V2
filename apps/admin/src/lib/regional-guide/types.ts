import type {
  RegionalGuideCategory,
  RegionalGuideLocationRow,
  RegionalGuideStatus
} from "@hospedex/types";

/**
 * Contratos do Guia da região no Gerenciamento.
 *
 * O proprietário cadastra recomendações locais do tenant. A exibição pública
 * para hóspedes usa estes mesmos dados sem expor informações administrativas.
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
  { label: "Farmácias", value: "pharmacies" },
  { label: "Hospitais", value: "hospitals" },
  { label: "Passeios", value: "tours" },
  { label: "Praias", value: "beaches" },
  { label: "Cachoeiras", value: "waterfalls" },
  { label: "Pontos turísticos", value: "tourist_spots" },
  { label: "Vida noturna", value: "nightlife" },
  { label: "Outros", value: "others" }
];

export const STATUS_GUIA_REGIAO: Array<{
  label: string;
  value: RegionalGuideStatus | "todos";
}> = [
  { label: "Todos", value: "todos" },
  { label: "Ativo", value: "active" },
  { label: "Inativo", value: "inactive" }
];

export const LABEL_CATEGORIA_GUIA_REGIAO: Record<RegionalGuideCategory, string> = {
  beaches: "Praias",
  coffee_shops: "Cafeterias",
  hospitals: "Hospitais",
  markets: "Mercados",
  nightlife: "Vida noturna",
  others: "Outros",
  pharmacies: "Farmácias",
  restaurants: "Restaurantes",
  snack_bars: "Lanchonetes",
  tourist_spots: "Pontos turísticos",
  tours: "Passeios",
  waterfalls: "Cachoeiras"
};

export type FiltroCategoriaGuiaRegiao = RegionalGuideCategory | "todas";
export type FiltroStatusGuiaRegiao = RegionalGuideStatus | "todos";

export type FiltrosGuiaRegiao = {
  busca: string;
  categoria: FiltroCategoriaGuiaRegiao;
  status: FiltroStatusGuiaRegiao;
};

export type ResumoGuiaRegiao = {
  ativos: number;
  categorias: number;
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
