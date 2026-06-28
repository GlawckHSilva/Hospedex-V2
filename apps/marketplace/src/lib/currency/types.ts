/**
 * Tipos de conversao informativa do Marketplace.
 *
 * O valor oficial da reserva continua em BRL. USD e EUR sao exibidos apenas
 * como referencia para hospedes internacionais e nao entram no calculo de
 * pagamento, financeiro ou confirmacao de reserva.
 */

export type MoedaBase = "BRL";
export type MoedaConversao = "USD" | "EUR";
export type CodigoMoeda = MoedaBase | MoedaConversao;

export type CotacaoMoeda = {
  base: MoedaBase;
  cotadoEm: string;
  moeda: MoedaConversao;
  provider: string;
  taxa: number;
};

export type CotacoesCambioDisponiveis = {
  base: MoedaBase;
  cotacoes: Record<MoedaConversao, CotacaoMoeda>;
  cotadoEm: string;
  disponivel: true;
  mensagem: null;
  provider: string;
};

export type CotacoesCambioIndisponiveis = {
  base: MoedaBase;
  cotacoes: null;
  cotadoEm: null;
  disponivel: false;
  mensagem: string;
  provider: string;
};

export type CotacoesCambio =
  | CotacoesCambioDisponiveis
  | CotacoesCambioIndisponiveis;
