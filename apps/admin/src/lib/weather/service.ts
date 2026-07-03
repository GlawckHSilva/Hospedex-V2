import "server-only";

import type { JsonValue } from "@hospedex/types";

import type { LocalizacaoClima, PrevisaoTempoNormalizada } from "./types";

/**
 * Service server-side para previsao do tempo.
 *
 * A API externa fica isolada aqui para permitir trocar de provedor no futuro
 * sem espalhar chamadas HTTP pelo job. Nenhuma chave de clima e enviada ao
 * navegador.
 */

const PROVIDER_PADRAO = "open-meteo";
const FORECAST_URL_PADRAO = "https://api.open-meteo.com/v1/forecast";
const GEOCODING_URL_PADRAO = "https://geocoding-api.open-meteo.com/v1/search";

type Coordenadas = {
  cidade: string;
  latitude: number;
  longitude: number;
};

type OpenMeteoForecastResponse = {
  daily?: {
    precipitation_probability_max?: Array<number | null>;
    temperature_2m_max?: Array<number | null>;
    temperature_2m_min?: Array<number | null>;
    time?: string[];
    weather_code?: Array<number | null>;
    wind_speed_10m_max?: Array<number | null>;
  };
};

type OpenMeteoGeocodingResponse = {
  results?: Array<{
    admin1?: string;
    country_code?: string;
    latitude?: number;
    longitude?: number;
    name?: string;
  }>;
};

const CONDICOES_CLIMA: Record<number, string> = {
  0: "ceu limpo",
  1: "sol com poucas nuvens",
  2: "parcialmente nublado",
  3: "nublado",
  45: "neblina",
  48: "neblina com geada",
  51: "garoa fraca",
  53: "garoa moderada",
  55: "garoa intensa",
  61: "chuva fraca",
  63: "chuva moderada",
  65: "chuva forte",
  71: "neve fraca",
  73: "neve moderada",
  75: "neve forte",
  80: "pancadas de chuva fracas",
  81: "pancadas de chuva",
  82: "pancadas de chuva fortes",
  95: "trovoadas",
  96: "trovoadas com granizo",
  99: "trovoadas fortes com granizo",
};

const ESTADOS_BRASILEIROS: Record<string, string> = {
  AC: "Acre",
  AL: "Alagoas",
  AP: "Amapa",
  AM: "Amazonas",
  BA: "Bahia",
  CE: "Ceara",
  DF: "Distrito Federal",
  ES: "Espirito Santo",
  GO: "Goias",
  MA: "Maranhao",
  MT: "Mato Grosso",
  MS: "Mato Grosso do Sul",
  MG: "Minas Gerais",
  PA: "Para",
  PB: "Paraiba",
  PR: "Parana",
  PE: "Pernambuco",
  PI: "Piaui",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul",
  RO: "Rondonia",
  RR: "Roraima",
  SC: "Santa Catarina",
  SP: "Sao Paulo",
  SE: "Sergipe",
  TO: "Tocantins",
};

export async function buscarPrevisaoTempo(
  localizacao: LocalizacaoClima,
  dataPrevisao: string,
): Promise<PrevisaoTempoNormalizada> {
  const provider = obterProvider();
  if (provider !== PROVIDER_PADRAO) {
    throw new Error(`Provider de clima nao suportado: ${provider}.`);
  }

  const coordenadas = await resolverCoordenadas(localizacao);
  const timezone = localizacao.timezone || "America/Sao_Paulo";
  const url = new URL(obterForecastUrl());
  url.searchParams.set("latitude", String(coordenadas.latitude));
  url.searchParams.set("longitude", String(coordenadas.longitude));
  url.searchParams.set("daily", [
    "weather_code",
    "temperature_2m_max",
    "temperature_2m_min",
    "precipitation_probability_max",
    "wind_speed_10m_max",
  ].join(","));
  url.searchParams.set("timezone", timezone);
  url.searchParams.set("start_date", dataPrevisao);
  url.searchParams.set("end_date", dataPrevisao);

  const resposta = await fetch(url, { cache: "no-store" });
  if (!resposta.ok) {
    throw new Error("Nao foi possivel consultar a previsao do tempo.");
  }

  const dados = (await resposta.json()) as OpenMeteoForecastResponse;
  const diario = dados.daily;
  const codigo = diario?.weather_code?.[0] ?? null;
  const minima = diario?.temperature_2m_min?.[0] ?? null;
  const maxima = diario?.temperature_2m_max?.[0] ?? null;
  const chuva = diario?.precipitation_probability_max?.[0] ?? null;
  const vento = diario?.wind_speed_10m_max?.[0] ?? null;

  if (!diario?.time?.[0] || codigo === null) {
    throw new Error("Retorno da API de clima incompleto.");
  }

  return {
    chanceChuva: arredondarOpcional(chuva),
    cidade: coordenadas.cidade,
    condicao: CONDICOES_CLIMA[codigo] ?? "condicao climatica nao informada",
    dataPrevisao: diario.time[0],
    fonte: PROVIDER_PADRAO,
    resumoBruto: resumirForecast(diario),
    temperaturaMaxima: arredondarOpcional(maxima),
    temperaturaMinima: arredondarOpcional(minima),
    ventoKmH: arredondarOpcional(vento),
  };
}

async function resolverCoordenadas(localizacao: LocalizacaoClima): Promise<Coordenadas> {
  if (numeroValido(localizacao.latitude) && numeroValido(localizacao.longitude)) {
    return {
      cidade: localizacao.cidade || "regiao da hospedagem",
      latitude: localizacao.latitude,
      longitude: localizacao.longitude,
    };
  }

  if (!localizacao.cidade || !localizacao.estado) {
    throw new Error("Previsao nao enviada: casa sem localizacao suficiente.");
  }

  const url = new URL(obterGeocodingUrl());
  url.searchParams.set("name", localizacao.cidade);
  url.searchParams.set("count", "5");
  url.searchParams.set("language", "pt");
  url.searchParams.set("format", "json");
  url.searchParams.set("countryCode", "BR");

  const resposta = await fetch(url, { cache: "no-store" });
  if (!resposta.ok) {
    throw new Error("Nao foi possivel localizar a cidade para consultar o clima.");
  }

  const dados = (await resposta.json()) as OpenMeteoGeocodingResponse;
  const estadoNormalizado = normalizarTexto(estadoCompleto(localizacao.estado));
  const cidade = dados.results?.find((resultado) => {
    const admin = normalizarTexto(resultado.admin1 ?? "");
    return admin === estadoNormalizado || !estadoNormalizado;
  }) ?? dados.results?.[0];

  if (!cidade || !numeroValido(cidade.latitude) || !numeroValido(cidade.longitude)) {
    throw new Error("Previsao nao enviada: cidade da casa nao encontrada.");
  }

  return {
    cidade: cidade.name ?? localizacao.cidade,
    latitude: cidade.latitude,
    longitude: cidade.longitude,
  };
}

function obterProvider() {
  return (process.env.WEATHER_PROVIDER?.trim() || PROVIDER_PADRAO).toLowerCase();
}

function obterForecastUrl() {
  return process.env.WEATHER_API_URL?.trim() || FORECAST_URL_PADRAO;
}

function obterGeocodingUrl() {
  return process.env.WEATHER_GEOCODING_API_URL?.trim() || GEOCODING_URL_PADRAO;
}

function estadoCompleto(estado: string) {
  const limpo = estado.trim();
  return ESTADOS_BRASILEIROS[limpo.toUpperCase()] ?? limpo;
}

function normalizarTexto(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function numeroValido(valor: number | null | undefined): valor is number {
  return typeof valor === "number" && Number.isFinite(valor);
}

function arredondarOpcional(valor: number | null | undefined) {
  return numeroValido(valor) ? Math.round(valor) : null;
}

function resumirForecast(diario: NonNullable<OpenMeteoForecastResponse["daily"]>): JsonValue {
  return {
    precipitation_probability_max: diario.precipitation_probability_max?.[0] ?? null,
    temperature_2m_max: diario.temperature_2m_max?.[0] ?? null,
    temperature_2m_min: diario.temperature_2m_min?.[0] ?? null,
    weather_code: diario.weather_code?.[0] ?? null,
    wind_speed_10m_max: diario.wind_speed_10m_max?.[0] ?? null,
  };
}

