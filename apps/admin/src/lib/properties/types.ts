import type {
  AmenityRow,
  MediaAssetRow,
  PropertyRow,
  PropertySettingRow,
  UnitCategoryRow,
  UnitRow
} from "@hospedex/types";

/**
 * Contratos do módulo de Propriedades e Unidades.
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
  linha1: string;
  numero: string;
  referencia: string;
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

export type UnidadeComCategoria = UnitRow & {
  categoria: UnitCategoryRow | null;
  imagens: MediaAssetRow[];
};

export type PropriedadeComRelacionamentos = PropertyRow & {
  enderecoFormatado: EnderecoPropriedade;
  estrutura: EstruturaPropriedade;
  imagemCapa: MediaAssetRow | null;
  imagens: MediaAssetRow[];
  comodidades: AmenityRow[];
  regras: PropertySettingRow;
  valores: ValoresPropriedade;
  unidades: UnidadeComCategoria[];
};

export type LimitesPlanoPropriedades = {
  nomePlano: string;
  maxPropriedades: number;
  maxUnidades: number;
  propriedadesUsadas: number;
  unidadesUsadas: number;
};

export type DadosModuloPropriedades = {
  propriedades: PropriedadeComRelacionamentos[];
  comodidadesDisponiveis: AmenityRow[];
  limitesPlano: LimitesPlanoPropriedades;
  podeGerenciar: boolean;
  multiUnidadesAtivo: boolean;
};

export type SearchParamsModulo = {
  sucesso?: string | undefined;
  erro?: string | undefined;
};
