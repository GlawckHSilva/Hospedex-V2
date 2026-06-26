import type {
  AmenityRow,
  MediaAssetRow,
  PropertyRow,
  PropertySettingRow
} from "@hospedex/types";

/**
 * Contratos do módulo de Casas.
 *
 * Este arquivo traduz a estrutura normalizada do banco para objetos prontos para
 * tela, mantendo explícitos tenant, plano e relações sem espalhar regras pela UI.
 */

export type EnderecoPropriedade = {
  bairro: string;
  cidade: string;
  cep: string;
  complemento: string;
  estado: string;
  googleMapsLink: string;
  latitude: number | null;
  linha1: string;
  longitude: number | null;
  numero: string;
  referencia: string;
};

export type DetalhesPublicosPropriedade = {
  descricaoPublica: string;
  imagemCompartilhamento: string;
  nomeExibicao: string;
  tituloPublico: string;
};

export type EstruturaPropriedade = {
  areaExterna: boolean;
  banheiros: number;
  camas: number;
  churrasqueira: boolean;
  garagemVagas: number;
  hospedesMaximos: number;
  piscina: boolean;
  quartos: number;
};

export type ValoresPropriedade = {
  aceitaCartaoCredito: boolean;
  caucao: number;
  cobraHospedeExtra: boolean;
  hospedesInclusos: number;
  jurosParcelasCartao: Array<{
    jurosPercentual: number;
    parcela: number;
  }>;
  maxParcelasCartao: number;
  taxaLimpeza: number;
  valorDiaria: number;
  valorHospedeExtra: number;
};

export type PropriedadeComRelacionamentos = PropertyRow & {
  detalhesPublicos: DetalhesPublicosPropriedade;
  enderecoFormatado: EnderecoPropriedade;
  estrutura: EstruturaPropriedade;
  imagemCapa: MediaAssetRow | null;
  imagens: MediaAssetRow[];
  comodidades: AmenityRow[];
  regras: PropertySettingRow;
  valores: ValoresPropriedade;
};

export type LimitesPlanoPropriedades = {
  nomePlano: string;
  maxPropriedades: number;
  propriedadesUsadas: number;
};

export type DadosModuloPropriedades = {
  propriedades: PropriedadeComRelacionamentos[];
  comodidadesDisponiveis: AmenityRow[];
  limitesPlano: LimitesPlanoPropriedades;
  podeGerenciar: boolean;
};

export type SearchParamsModulo = {
  sucesso?: string | undefined;
  erro?: string | undefined;
};
