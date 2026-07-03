import "server-only";

import type {
  JsonValue,
  PropertyRow,
  ReservationGuestRow,
  ReservationRow,
  TenantIntegrationRow,
  WeatherCheckinReminderLogRow,
  WeatherCheckinReminderStatus,
} from "@hospedex/types";
import type { SupabaseClient } from "@supabase/supabase-js";

import { renderEmailTemplate, sendEmail } from "../email-service/service";
import { criarClienteSupabaseAdmin } from "../supabase/admin";
import { buscarPrevisaoTempo } from "./service";
import type { LocalizacaoClima, MensagemClimaCheckin, PrevisaoTempoNormalizada } from "./types";

/**
 * Job server-side de lembrete climatico antes do check-in.
 *
 * A regra roda fora do frontend porque usa service role, consulta API externa e
 * precisa registrar idempotencia por tenant/reserva. Reservas pendentes nao
 * entram no processamento para evitar mensagens antes da aprovacao real.
 */

const TIPO_LEMBRETE = "weather_checkin_reminder";
const TIMEZONE_PADRAO = "America/Sao_Paulo";
const STATUS_RESERVA_ELEGIVEIS: Array<ReservationRow["status"]> = ["confirmed"];

type SupabaseAdmin = SupabaseClient;

type ProcessarLembretesInput = {
  dataBase?: Date;
  dryRun?: boolean;
};

type ResultadoReserva = {
  canal: "email" | "whatsapp" | "internal" | "none";
  codigoReserva: string;
  mensagem: string;
  reservaId: string;
  status: WeatherCheckinReminderStatus | "dry_run";
};

type ResultadoJobClima = {
  dataAlvo: string;
  dryRun: boolean;
  elegiveis: number;
  processadas: ResultadoReserva[];
  puladas: ResultadoReserva[];
};

type ReservaBase = {
  hospede: ReservationGuestRow | null;
  integracoes: TenantIntegrationRow[];
  propriedade: PropertyRow | null;
  reserva: ReservationRow;
};

type LogClaim =
  | { duplicado: true; log: null }
  | { duplicado: false; log: WeatherCheckinReminderLogRow };

export async function processarLembretesClimaCheckin(
  input: ProcessarLembretesInput = {},
): Promise<ResultadoJobClima> {
  const supabase = criarClienteSupabaseAdmin();
  const dataAlvo = obterDataAlvo(input.dataBase ?? new Date());
  const reservas = await carregarReservasElegiveis(supabase, dataAlvo);
  const bases = await carregarBasesReservas(supabase, reservas);
  const cachePrevisao = new Map<string, Promise<PrevisaoTempoNormalizada>>();
  const resultado: ResultadoJobClima = {
    dataAlvo,
    dryRun: Boolean(input.dryRun),
    elegiveis: bases.length,
    processadas: [],
    puladas: [],
  };

  for (const base of bases) {
    try {
      const item = await processarReserva(supabase, base, cachePrevisao, Boolean(input.dryRun));
      if (item.status === "sent" || item.status === "test" || item.status === "dry_run") {
        resultado.processadas.push(item);
      } else {
        resultado.puladas.push(item);
      }
    } catch (erro) {
      console.error("Erro ao processar lembrete de clima da reserva.", serializarErro(erro));
      resultado.puladas.push({
        canal: "none",
        codigoReserva: base.reserva.code,
        mensagem: "Erro inesperado ao processar reserva.",
        reservaId: base.reserva.id,
        status: "failed",
      });
    }
  }

  return resultado;
}

async function processarReserva(
  supabase: SupabaseAdmin,
  base: ReservaBase,
  cachePrevisao: Map<string, Promise<PrevisaoTempoNormalizada>>,
  dryRun: boolean,
): Promise<ResultadoReserva> {
  const validacao = validarBase(base);
  if (!validacao.ok) {
    if (!dryRun) {
      await registrarTentativaNaoEnviada(supabase, base, validacao.status, validacao.motivo);
    }
    return resultado(base, "none", validacao.status, validacao.motivo);
  }

  const hospede = base.hospede;
  const propriedade = base.propriedade;
  if (!hospede || !propriedade) {
    return resultado(base, "none", "skipped", "Reserva sem hospede ou casa vinculada.");
  }

  const localizacao = obterLocalizacao(propriedade);
  const previsao = await tentarObterPrevisao(
    supabase,
    base,
    cachePrevisao,
    localizacao,
    dryRun,
  );
  if (!previsao.ok) {
    return resultado(base, "none", "failed", previsao.motivo);
  }
  const mensagem = montarMensagemLembreteClima(
    base.reserva,
    hospede,
    propriedade,
    previsao.previsao,
  );

  if (dryRun) {
    return resultado(base, "none", "dry_run", mensagem.text);
  }

  const claim = await criarClaimEnvio(supabase, base, hospede, mensagem.text, previsao.previsao);
  if (claim.duplicado) {
    return resultado(base, "none", "skipped", "Lembrete de clima ja registrado para esta reserva.");
  }

  const canalEmailAtivo = integracaoAtiva(base.integracoes, "email");
  if (!canalEmailAtivo) {
    await finalizarLog(supabase, claim.log, {
      channel: "none",
      errorMessage: "Tenant sem canal de e-mail ativo para envio automatico.",
      status: "not_configured",
    });
    await registrarNotaReserva(
      supabase,
      base,
      "internal",
      "Lembrete de clima nao enviado: tenant sem canal de e-mail ativo.",
    );
    return resultado(base, "none", "not_configured", "Tenant sem canal de e-mail ativo.");
  }

  if (!hospede.email) {
    await finalizarLog(supabase, claim.log, {
      channel: "none",
      errorMessage: "Hospede sem e-mail valido para envio automatico.",
      status: "failed",
    });
    await registrarNotaReserva(
      supabase,
      base,
      "internal",
      "Lembrete de clima nao enviado: hospede sem e-mail cadastrado.",
    );
    return resultado(base, "none", "failed", "Hospede sem e-mail cadastrado.");
  }

  const envio = await sendEmail({
    audience: "guest",
    eventType: TIPO_LEMBRETE,
    html: mensagem.html,
    logClient: supabase,
    ownerId: base.reserva.owner_id,
    payload: {
      checkIn: base.reserva.check_in,
      forecast: previsao.previsao,
      propertyId: base.reserva.property_id,
      reservationCode: base.reserva.code,
    },
    referenceId: base.reserva.id,
    subject: mensagem.subject,
    templateKey: TIPO_LEMBRETE,
    tenantId: base.reserva.tenant_id,
    text: mensagem.text,
    to: hospede.email,
  });

  const status: WeatherCheckinReminderStatus = envio.success
    ? envio.status === "test"
      ? "test"
      : "sent"
    : normalizarStatusFalhaEmail(envio.status);
  await finalizarLog(supabase, claim.log, {
    channel: "email",
    errorMessage: envio.success ? null : envio.message,
    providerMessageId: envio.providerMessageId ?? null,
    recipientEmail: envio.recipientEmail ?? hospede.email,
    status,
  });

  await registrarNotaReserva(
    supabase,
    base,
    envio.success ? "system" : "internal",
    envio.success
      ? "Previsao do tempo enviada automaticamente para o hospede."
      : `Lembrete de clima nao enviado: ${envio.message}`,
  );

  return resultado(base, "email", status, envio.message);
}

function validarBase(base: ReservaBase):
  | { ok: true }
  | { ok: false; motivo: string; status: WeatherCheckinReminderStatus } {
  if (!integracaoAtiva(base.integracoes, "weather")) {
    return {
      motivo: "Tenant sem integracao de clima ativa para mensagens automaticas.",
      ok: false,
      status: "skipped",
    };
  }

  if (!base.hospede) {
    return {
      motivo: "Reserva ignorada: hospede principal nao encontrado.",
      ok: false,
      status: "skipped",
    };
  }

  if (!base.propriedade) {
    return {
      motivo: "Reserva ignorada: casa vinculada nao encontrada.",
      ok: false,
      status: "skipped",
    };
  }

  const localizacao = obterLocalizacao(base.propriedade);
  if (
    (localizacao.latitude === null || localizacao.longitude === null) &&
    (!localizacao.cidade || !localizacao.estado)
  ) {
    return {
      motivo: "Previsao nao enviada: casa sem localizacao suficiente.",
      ok: false,
      status: "skipped",
    };
  }

  return { ok: true };
}

async function carregarReservasElegiveis(supabase: SupabaseAdmin, dataAlvo: string) {
  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .eq("check_in", dataAlvo)
    .in("status", STATUS_RESERVA_ELEGIVEIS)
    .returns<ReservationRow[]>();

  if (error) {
    throw new Error(`Nao foi possivel carregar reservas elegiveis: ${error.message}`);
  }

  return data ?? [];
}

async function carregarBasesReservas(
  supabase: SupabaseAdmin,
  reservas: ReservationRow[],
): Promise<ReservaBase[]> {
  if (!reservas.length) return [];

  const reservaIds = reservas.map((reserva) => reserva.id);
  const propriedadeIds = [...new Set(reservas.map((reserva) => reserva.property_id))];
  const tenantIds = [...new Set(reservas.map((reserva) => reserva.tenant_id))];

  const [propriedadesResultado, hospedesResultado, integracoesResultado] = await Promise.all([
    supabase
      .from("properties")
      .select("*")
      .in("id", propriedadeIds)
      .returns<PropertyRow[]>(),
    supabase
      .from("reservation_guests")
      .select("*")
      .in("reservation_id", reservaIds)
      .eq("is_primary", true)
      .returns<ReservationGuestRow[]>(),
    supabase
      .from("tenant_integrations")
      .select("*")
      .in("tenant_id", tenantIds)
      .in("provider", ["weather", "email"])
      .returns<TenantIntegrationRow[]>(),
  ]);

  if (propriedadesResultado.error) {
    throw new Error(`Nao foi possivel carregar casas das reservas: ${propriedadesResultado.error.message}`);
  }
  if (hospedesResultado.error) {
    throw new Error(`Nao foi possivel carregar hospedes das reservas: ${hospedesResultado.error.message}`);
  }
  if (integracoesResultado.error) {
    throw new Error(`Nao foi possivel carregar integracoes dos tenants: ${integracoesResultado.error.message}`);
  }

  const propriedades = propriedadesResultado.data ?? [];
  const hospedes = hospedesResultado.data ?? [];
  const integracoes = integracoesResultado.data ?? [];

  return reservas.map((reserva) => ({
    hospede: hospedes.find((hospede) => hospede.reservation_id === reserva.id) ?? null,
    integracoes: integracoes.filter((integracao) => integracao.tenant_id === reserva.tenant_id),
    propriedade:
      propriedades.find(
        (propriedade) =>
          propriedade.id === reserva.property_id && propriedade.tenant_id === reserva.tenant_id,
      ) ?? null,
    reserva,
  }));
}

async function criarClaimEnvio(
  supabase: SupabaseAdmin,
  base: ReservaBase,
  hospede: ReservationGuestRow,
  mensagem: string,
  previsao: PrevisaoTempoNormalizada,
): Promise<LogClaim> {
  const { data, error } = await supabase
    .from("weather_checkin_reminder_logs")
    .insert({
      channel: "none",
      check_in_date: base.reserva.check_in,
      forecast: previsao as unknown as JsonValue,
      guest_user_id: base.reserva.guest_user_id,
      message: mensagem,
      property_id: base.reserva.property_id,
      recipient_email: hospede.email,
      recipient_phone: hospede.phone,
      reminder_type: TIPO_LEMBRETE,
      reservation_id: base.reserva.id,
      status: "pending",
      tenant_id: base.reserva.tenant_id,
    })
    .select("*")
    .single<WeatherCheckinReminderLogRow>();

  if (!error && data) {
    return { duplicado: false, log: data };
  }

  if (error?.code === "23505") {
    return { duplicado: true, log: null };
  }

  throw new Error(`Nao foi possivel registrar controle do lembrete de clima: ${error?.message}`);
}

async function registrarTentativaNaoEnviada(
  supabase: SupabaseAdmin,
  base: ReservaBase,
  status: WeatherCheckinReminderStatus,
  motivo: string,
) {
  const { error } = await supabase.from("weather_checkin_reminder_logs").insert({
    channel: "none",
    check_in_date: base.reserva.check_in,
    error_message: motivo,
    forecast: {},
    guest_user_id: base.reserva.guest_user_id,
    message: motivo,
    property_id: base.reserva.property_id,
    recipient_email: base.hospede?.email ?? null,
    recipient_phone: base.hospede?.phone ?? null,
    reminder_type: TIPO_LEMBRETE,
    reservation_id: base.reserva.id,
    status,
    tenant_id: base.reserva.tenant_id,
  });

  if (error && error.code !== "23505") {
    console.error("Nao foi possivel registrar tentativa de lembrete de clima.", error.message);
  }

  if (!error) {
    await registrarNotaReserva(supabase, base, "internal", motivo);
  }
}

async function finalizarLog(
  supabase: SupabaseAdmin,
  log: WeatherCheckinReminderLogRow,
  entrada: {
    channel: "email" | "whatsapp" | "internal" | "none";
    errorMessage?: string | null;
    providerMessageId?: string | null;
    recipientEmail?: string | null;
    status: WeatherCheckinReminderStatus;
  },
) {
  const enviado = entrada.status === "sent" || entrada.status === "test";
  const { error } = await supabase
    .from("weather_checkin_reminder_logs")
    .update({
      attempted_at: new Date().toISOString(),
      channel: entrada.channel,
      error_message: entrada.errorMessage ?? null,
      recipient_email: entrada.recipientEmail ?? log.recipient_email,
      sent_at: enviado ? new Date().toISOString() : null,
      status: entrada.status,
      forecast: {
        ...(valorEhObjeto(log.forecast) ? log.forecast : {}),
        providerMessageId: entrada.providerMessageId ?? null,
      },
    })
    .eq("id", log.id);

  if (error) {
    throw new Error(`Nao foi possivel atualizar log do lembrete de clima: ${error.message}`);
  }
}

async function registrarNotaReserva(
  supabase: SupabaseAdmin,
  base: ReservaBase,
  tipo: "internal" | "system",
  conteudo: string,
) {
  const { error } = await supabase.from("reservation_notes").insert({
    content: conteudo,
    created_by: null,
    note_type: tipo,
    reservation_id: base.reserva.id,
    tenant_id: base.reserva.tenant_id,
  });

  if (error) {
    console.error("Nao foi possivel registrar nota da previsao do tempo.", error.message);
  }
}

async function obterPrevisaoComCache(
  cache: Map<string, Promise<PrevisaoTempoNormalizada>>,
  localizacao: LocalizacaoClima,
  dataPrevisao: string,
) {
  const chave = [
    dataPrevisao,
    localizacao.latitude,
    localizacao.longitude,
    localizacao.cidade,
    localizacao.estado,
  ].join("|");

  if (!cache.has(chave)) {
    cache.set(chave, buscarPrevisaoTempo(localizacao, dataPrevisao));
  }

  return cache.get(chave)!;
}

async function tentarObterPrevisao(
  supabase: SupabaseAdmin,
  base: ReservaBase,
  cache: Map<string, Promise<PrevisaoTempoNormalizada>>,
  localizacao: LocalizacaoClima,
  dryRun: boolean,
): Promise<{ ok: true; previsao: PrevisaoTempoNormalizada } | { ok: false; motivo: string }> {
  try {
    const previsao = await obterPrevisaoComCache(cache, localizacao, base.reserva.check_in);
    return { ok: true, previsao };
  } catch (erro) {
    const motivo = serializarErro(erro) || "Nao foi possivel consultar a previsao do tempo.";
    if (!dryRun) {
      await registrarTentativaNaoEnviada(supabase, base, "failed", motivo);
    }
    return { ok: false, motivo };
  }
}

function montarMensagemLembreteClima(
  reserva: ReservationRow,
  hospede: ReservationGuestRow,
  propriedade: PropertyRow,
  previsao: PrevisaoTempoNormalizada,
): MensagemClimaCheckin {
  const nomeHospede = primeiroNome(hospede.full_name);
  const temperatura = montarTrechoTemperatura(previsao);
  const chuva = montarTrechoChuva(previsao.chanceChuva);
  const vento = previsao.ventoKmH !== null ? ` Vento previsto: ${previsao.ventoKmH} km/h.` : "";
  const corpo = [
    `Ola, ${nomeHospede}! Faltam 2 dias para seu check-in em ${propriedade.name}.`,
    `A previsao para ${previsao.cidade} indica ${previsao.condicao}${temperatura}.`,
    chuva,
    vento.trim(),
    "Prepare-se para a viagem e ate breve!",
  ]
    .filter(Boolean)
    .join("\n\n");
  const subject = `Previsao do tempo para sua hospedagem em ${propriedade.name}`;
  const email = renderEmailTemplate({
    body: corpo,
    subject,
    title: "Previsao do tempo da sua hospedagem",
  });

  return {
    html: email.html,
    subject: email.subject,
    text: email.text,
  };
}

function montarTrechoTemperatura(previsao: PrevisaoTempoNormalizada) {
  if (previsao.temperaturaMinima !== null && previsao.temperaturaMaxima !== null) {
    return `, com minima de ${previsao.temperaturaMinima} C e maxima de ${previsao.temperaturaMaxima} C`;
  }

  return "";
}

function montarTrechoChuva(chanceChuva: number | null) {
  if (chanceChuva === null) {
    return "Nao ha informacao confiavel de chuva no momento.";
  }

  const trechoChance = `Chance de chuva: ${chanceChuva}%.`;
  const recomendacao =
    chanceChuva >= 50
      ? "Pode chover durante sua chegada, entao vale levar guarda-chuva ou capa."
      : "Nao ha previsao relevante de chuva no momento.";

  return `${trechoChance} ${recomendacao}`;
}

function obterLocalizacao(propriedade: PropertyRow): LocalizacaoClima {
  const endereco = valorEhObjeto(propriedade.address) ? propriedade.address : {};

  return {
    cidade: textoJson(endereco, "cidade") || textoJson(endereco, "city"),
    estado: textoJson(endereco, "estado") || textoJson(endereco, "state"),
    latitude: numeroJson(endereco, "latitude"),
    longitude: numeroJson(endereco, "longitude"),
    timezone: propriedade.timezone || TIMEZONE_PADRAO,
  };
}

function integracaoAtiva(integracoes: TenantIntegrationRow[], provider: "weather" | "email") {
  const integracao = integracoes.find((item) => item.provider === provider);
  if (!integracao?.enabled) return false;

  const configuracao = valorEhObjeto(integracao.public_settings) ? integracao.public_settings : {};
  return configuracao.ativa_pelo_proprietario === true &&
    (provider !== "weather" || configuracao.mensagens_automaticas === true);
}

function normalizarStatusFalhaEmail(status: string): WeatherCheckinReminderStatus {
  if (status === "not_configured") return "not_configured";
  if (status === "skipped") return "skipped";
  return "failed";
}

function resultado(
  base: ReservaBase,
  canal: "email" | "whatsapp" | "internal" | "none",
  status: WeatherCheckinReminderStatus | "dry_run",
  mensagem: string,
): ResultadoReserva {
  return {
    canal,
    codigoReserva: base.reserva.code,
    mensagem,
    reservaId: base.reserva.id,
    status,
  };
}

function obterDataAlvo(dataBase: Date) {
  const hoje = dataLocalISO(dataBase, TIMEZONE_PADRAO);
  const data = new Date(`${hoje}T12:00:00Z`);
  data.setUTCDate(data.getUTCDate() + 2);
  return data.toISOString().slice(0, 10);
}

function dataLocalISO(data: Date, timezone: string) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    year: "numeric",
  }).formatToParts(data);
  const mapa = new Map(partes.map((parte) => [parte.type, parte.value]));

  return `${mapa.get("year")}-${mapa.get("month")}-${mapa.get("day")}`;
}

function primeiroNome(nome: string) {
  return nome.trim().split(/\s+/)[0] || "hospede";
}

function textoJson(valor: Record<string, JsonValue>, chave: string) {
  const dado = valor[chave];
  return typeof dado === "string" ? dado.trim() : "";
}

function numeroJson(valor: Record<string, JsonValue>, chave: string) {
  const dado = valor[chave];
  return typeof dado === "number" && Number.isFinite(dado) ? dado : null;
}

function valorEhObjeto(valor: JsonValue): valor is Record<string, JsonValue> {
  return Boolean(valor) && typeof valor === "object" && !Array.isArray(valor);
}

function serializarErro(erro: unknown): string {
  if (erro instanceof Error) return erro.message;
  try {
    return JSON.stringify(erro);
  } catch {
    return "Erro desconhecido.";
  }
}
