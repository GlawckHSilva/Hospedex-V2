import type {
  CotacaoMoeda,
  CotacoesCambio,
  MoedaConversao
} from "./types";

type AwesomeQuote = {
  ask?: string;
  bid?: string;
  create_date?: string;
  timestamp?: string;
};

type AwesomeResponse = {
  EURBRL?: AwesomeQuote;
  USDBRL?: AwesomeQuote;
};

type CacheCotacao = {
  expiraEm: number;
  valor: CotacoesCambio;
};

const PROVIDER_PADRAO = "awesomeapi";
const BASE_URL_PADRAO = "https://economia.awesomeapi.com.br";
const TTL_PADRAO_SEGUNDOS = 3600;
const PARES_AWESOME = "USD-BRL,EUR-BRL";

let cacheCotacao: CacheCotacao | null = null;

/**
 * Busca cotacoes server-side para o Marketplace.
 *
 * A chave da API fica restrita ao servidor. Se o provider falhar, a pagina
 * publica continua funcionando e a reserva segue com valor oficial em BRL.
 */
export async function carregarCotacoesCambio(): Promise<CotacoesCambio> {
  const provider = obterProvider();
  const ttlSegundos = obterTtlSegundos();
  const agora = Date.now();

  if (cacheCotacao && cacheCotacao.expiraEm > agora) {
    return cacheCotacao.valor;
  }

  if (provider !== PROVIDER_PADRAO) {
    return marcarIndisponivel(
      provider,
      "Conversao internacional indisponivel no momento."
    );
  }

  try {
    const cotacoes = await buscarCotacoesAwesomeApi(ttlSegundos);
    cacheCotacao = {
      expiraEm: agora + ttlSegundos * 1000,
      valor: cotacoes
    };

    return cotacoes;
  } catch (erro) {
    console.warn(
      "Nao foi possivel carregar cotacoes internacionais.",
      erro instanceof Error ? erro.message : "Erro desconhecido."
    );

    return marcarIndisponivel(
      provider,
      "Conversao internacional indisponivel no momento."
    );
  }
}

async function buscarCotacoesAwesomeApi(
  ttlSegundos: number
): Promise<CotacoesCambio> {
  const provider = obterProvider();
  const baseUrl = obterBaseUrl();
  const resposta = await fetch(`${baseUrl}/json/last/${PARES_AWESOME}`, {
    headers: obterHeaders(),
    next: { revalidate: ttlSegundos },
    signal: AbortSignal.timeout(5000)
  });

  if (!resposta.ok) {
    throw new Error(`Provider de cambio retornou status ${resposta.status}.`);
  }

  const dados = (await resposta.json()) as AwesomeResponse;
  const usd = normalizarCotacaoAwesome(dados.USDBRL, "USD", provider);
  const eur = normalizarCotacaoAwesome(dados.EURBRL, "EUR", provider);
  const cotadoEm = obterCotacaoMaisRecente([usd, eur]);

  return {
    base: "BRL",
    cotacoes: { EUR: eur, USD: usd },
    cotadoEm,
    disponivel: true,
    mensagem: null,
    provider
  };
}

function normalizarCotacaoAwesome(
  cotacao: AwesomeQuote | undefined,
  moeda: MoedaConversao,
  provider: string
): CotacaoMoeda {
  const brlPorMoeda = Number(cotacao?.ask ?? cotacao?.bid ?? 0);
  if (!Number.isFinite(brlPorMoeda) || brlPorMoeda <= 0) {
    throw new Error(`Cotacao ${moeda}-BRL invalida.`);
  }

  return {
    base: "BRL",
    cotadoEm: normalizarDataCotacao(cotacao),
    moeda,
    provider,
    taxa: 1 / brlPorMoeda
  };
}

function normalizarDataCotacao(cotacao: AwesomeQuote | undefined) {
  const timestamp = Number(cotacao?.timestamp ?? 0);

  if (Number.isFinite(timestamp) && timestamp > 0) {
    const milissegundos = timestamp > 99_999_999_999 ? timestamp : timestamp * 1000;
    return new Date(milissegundos).toISOString();
  }

  if (cotacao?.create_date) {
    const data = new Date(`${cotacao.create_date.replace(" ", "T")}-03:00`);
    if (!Number.isNaN(data.getTime())) return data.toISOString();
  }

  return new Date().toISOString();
}

function obterCotacaoMaisRecente(cotacoes: CotacaoMoeda[]) {
  return cotacoes
    .map((cotacao) => cotacao.cotadoEm)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]!;
}

function obterProvider() {
  return (process.env.CURRENCY_API_PROVIDER || PROVIDER_PADRAO).toLowerCase();
}

function obterBaseUrl() {
  return (process.env.CURRENCY_API_BASE_URL || BASE_URL_PADRAO).replace(/\/$/, "");
}

function obterHeaders() {
  const headers: Record<string, string> = {
    Accept: "application/json"
  };

  if (process.env.CURRENCY_API_KEY) {
    headers.Authorization = `Bearer ${process.env.CURRENCY_API_KEY}`;
  }

  return headers;
}

function obterTtlSegundos() {
  const valor = Number(process.env.CURRENCY_CACHE_TTL_SECONDS ?? TTL_PADRAO_SEGUNDOS);

  if (!Number.isFinite(valor) || valor < 60) return TTL_PADRAO_SEGUNDOS;
  return Math.floor(valor);
}

function marcarIndisponivel(provider: string, mensagem: string): CotacoesCambio {
  return {
    base: "BRL",
    cotacoes: null,
    cotadoEm: null,
    disponivel: false,
    mensagem,
    provider
  };
}
