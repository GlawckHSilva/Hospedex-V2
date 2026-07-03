import type { JsonValue } from "@hospedex/types";

/**
 * Contratos internos da previsao do tempo.
 *
 * O valor oficial da reserva nao depende destes dados. A previsao serve apenas
 * para comunicacao operacional ao hospede antes do check-in.
 */

export type LocalizacaoClima = {
  cidade: string | null;
  estado: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
};

export type PrevisaoTempoNormalizada = {
  cidade: string;
  condicao: string;
  dataPrevisao: string;
  fonte: string;
  chanceChuva: number | null;
  temperaturaMaxima: number | null;
  temperaturaMinima: number | null;
  ventoKmH: number | null;
  resumoBruto: JsonValue;
};

export type MensagemClimaCheckin = {
  html: string;
  subject: string;
  text: string;
};

