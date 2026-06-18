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
  linha1: string;
  cidade: string;
  estado: string;
};

export type UnidadeComCategoria = UnitRow & {
  categoria: UnitCategoryRow | null;
  imagens: MediaAssetRow[];
};

export type PropriedadeComRelacionamentos = PropertyRow & {
  enderecoFormatado: EnderecoPropriedade;
  imagemCapa: MediaAssetRow | null;
  imagens: MediaAssetRow[];
  comodidades: AmenityRow[];
  regras: PropertySettingRow;
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
