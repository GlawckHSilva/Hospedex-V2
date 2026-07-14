import type {
  AmenityRow,
  MediaAssetRow,
  PropertyRow,
  PropertySettingRow,
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

export type CampoRascunhoCasa = {
  checked?: boolean;
  tipo: string;
  valor: string;
};

export type RascunhoFormularioCasa = {
  campos: Record<string, CampoRascunhoCasa[]>;
  etapaAtual: number;
  incluiArquivos: boolean;
  operacaoId: string;
  salvoEm: string;
  sincronizadoEm?: string;
  versao: 1;
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

export type TipoChavePixPropriedade =
  | "cpf"
  | "cnpj"
  | "email"
  | "telefone"
  | "aleatoria";

export type FormasPagamentoPropriedade = {
  cartaoCredito: {
    ativo: boolean;
    instrucoes: string;
    jurosParcelas: Array<{
      jurosPercentual: number;
      parcela: number;
    }>;
    maxParcelas: number;
  };
  cartaoDebito: {
    ativo: boolean;
    instrucoes: string;
  };
  dinheiro: {
    ativo: boolean;
    instrucoes: string;
  };
  pix: {
    ativo: boolean;
    banco: string;
    chave: string;
    instrucoes: string;
    recebedor: string;
    tipoChave: TipoChavePixPropriedade;
  };
  transferenciaBancaria: {
    agencia: string;
    ativo: boolean;
    banco: string;
    conta: string;
    instrucoes: string;
    recebedor: string;
  };
};

export type TipoCobrancaHospedeExtra = "per_stay" | "per_night";

export type ValoresPropriedade = {
  /** @deprecated Mantido para compatibilidade com funcoes publicas antigas. */
  aceitaCartaoCredito: boolean;
  caucao: number;
  cobraHospedeExtra: boolean;
  formasPagamento: FormasPagamentoPropriedade;
  hospedesInclusos: number;
  /** @deprecated Usar formasPagamento.cartaoCredito.jurosParcelas. */
  jurosParcelasCartao: Array<{
    jurosPercentual: number;
    parcela: number;
  }>;
  /** @deprecated Usar formasPagamento.cartaoCredito.maxParcelas. */
  maxParcelasCartao: number;
  taxaLimpeza: number;
  tipoCobrancaHospedeExtra: TipoCobrancaHospedeExtra;
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
  rascunhoFormulario: RascunhoFormularioCasa | null;
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
