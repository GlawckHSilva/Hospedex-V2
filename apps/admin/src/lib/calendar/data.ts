import type {
  CalendarAvailabilityBlockRow,
  CleaningTaskRow,
  MaintenanceTaskRow,
  PropertyRow,
  ReservationGuestRow,
  ReservationRow
} from "@hospedex/types";

import type { ContextoAutenticacao } from "../auth/types";
import { criarClienteSupabaseServer } from "../supabase/server";
import type {
  BlocoCalendario,
  DadosModuloCalendario,
  DiaCalendario,
  FiltrosCalendario,
  LimpezaCalendario,
  ManutencaoCalendario,
  ReservaCalendario
} from "./types";
import { statusBloqueiaDisponibilidade } from "./types";

/**
 * Camada de leitura do calendario.
 *
 * O novo fluxo parte da casa selecionada. Caso a URL nao informe uma casa, a
 * primeira propriedade do tenant vira o calendario ativo para evitar filtros
 * vazios antes da visualizacao.
 */

export function podeLerCalendario(contexto: ContextoAutenticacao): boolean {
  if (!contexto.featureFlags.calendar) return false;
  if (contexto.role === "owner") return true;
  return contexto.permissions.includes("reservations.read");
}

export function podeGerenciarCalendario(contexto: ContextoAutenticacao): boolean {
  if (!contexto.featureFlags.calendar) return false;
  if (contexto.role === "owner") return true;
  return contexto.permissions.includes("reservations.manage");
}

export async function carregarDadosModuloCalendario(
  contexto: ContextoAutenticacao,
  filtros: FiltrosCalendario
): Promise<DadosModuloCalendario> {
  const tenantId = contexto.tenant?.id;
  const ownerId = contexto.tenant?.owner_id;

  if (!tenantId || !ownerId) {
    return criarDadosVazios(filtros);
  }

  const periodo = obterPeriodoCalendario(filtros);
  const supabase = await criarClienteSupabaseServer();
  const propriedadesResultado = await supabase
    .from("properties")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("owner_id", ownerId)
    .is("deleted_at", null)
    .order("name", { ascending: true })
    .returns<PropertyRow[]>();

  registrarErroLeitura("propriedades do calendario", propriedadesResultado.error);

  const propriedades = propriedadesResultado.data ?? [];
  const propriedadeSelecionada =
    propriedades.find((propriedade) => propriedade.id === filtros.propriedadeId) ??
    propriedades[0] ??
    null;
  const filtrosResolvidos: FiltrosCalendario = {
    ...filtros,
    ...(propriedadeSelecionada ? { propriedadeId: propriedadeSelecionada.id } : {})
  };
  const [blocosResultado, reservasResultado, limpezasResultado, manutencoesResultado] =
    propriedadeSelecionada
      ? await Promise.all([
          criarConsultaBlocos(tenantId, filtrosResolvidos, periodo),
          criarConsultaReservas(tenantId, ownerId, filtrosResolvidos, periodo),
          criarConsultaLimpezas(tenantId, filtrosResolvidos, periodo),
          criarConsultaManutencoes(tenantId, ownerId, filtrosResolvidos, periodo)
        ])
      : [
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null }
        ];

  registrarErroLeitura("bloqueios do calendario", blocosResultado.error);
  registrarErroLeitura("reservas do calendario", reservasResultado.error);
  registrarErroLeitura("limpezas do calendario", limpezasResultado.error);
  registrarErroLeitura("manutencoes do calendario", manutencoesResultado.error);

  const reservasBase = reservasResultado.data ?? [];
  const hospedes = await carregarHospedesReservas(
    tenantId,
    reservasBase.map((reserva) => reserva.id)
  );
  const reservas = montarReservasCalendario(reservasBase, hospedes);
  const blocos = blocosResultado.data ?? [];
  const limpezas = limpezasResultado.data ?? [];
  const manutencoes = manutencoesResultado.data ?? [];
  const hoje = formatDate(new Date());

  return {
    filtros: filtrosResolvidos,
    dias: montarDiasCalendario(
      periodo.inicioGrade,
      periodo.fimGrade,
      periodo.mes,
      blocos,
      reservas,
      limpezas,
      manutencoes
    ),
    podeGerenciar: podeGerenciarCalendario(contexto),
    propriedades,
    blocos,
    limpezas,
    manutencoes,
    reservas,
    resumo: {
      bloqueiosAtivos: blocos.filter(
        (bloco) =>
          bloco.blocks_availability && statusBloqueiaDisponibilidade(bloco.status)
      ).length,
      checkInsProximos: reservas.filter((reserva) => reserva.check_in >= hoje).length,
      checkOutsProximos: reservas.filter((reserva) => reserva.check_out >= hoje).length,
      limpezasPendentes: limpezas.filter((limpeza) => limpeza.status !== "completed").length,
      manutencoesPendentes: manutencoes.filter((manutencao) => manutencao.status === "pending").length,
      reservasAtivas: reservas.length
    }
  };
}

async function criarConsultaBlocos(
  tenantId: string,
  filtros: FiltrosCalendario,
  periodo: PeriodoCalendario
) {
  const supabase = await criarClienteSupabaseServer();
  let consulta = supabase
    .from("calendar_availability_blocks")
    .select("*")
    .eq("tenant_id", tenantId)
    .lt("starts_on", periodo.fimExclusivo)
    .gt("ends_on", periodo.inicio)
    .order("starts_on", { ascending: true });

  if (filtros.propriedadeId) consulta = consulta.eq("property_id", filtros.propriedadeId);

  return consulta.returns<CalendarAvailabilityBlockRow[]>();
}

async function criarConsultaReservas(
  tenantId: string,
  ownerId: string,
  filtros: FiltrosCalendario,
  periodo: PeriodoCalendario
) {
  const supabase = await criarClienteSupabaseServer();
  let consulta = supabase
    .from("reservations")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("owner_id", ownerId)
    .lt("check_in", periodo.fimExclusivo)
    .gt("check_out", periodo.inicio)
    .order("check_in", { ascending: true });

  if (filtros.propriedadeId) consulta = consulta.eq("property_id", filtros.propriedadeId);

  return consulta.returns<ReservationRow[]>();
}

async function criarConsultaLimpezas(
  tenantId: string,
  filtros: FiltrosCalendario,
  periodo: PeriodoCalendario
) {
  const supabase = await criarClienteSupabaseServer();
  let consulta = supabase
    .from("cleaning_tasks")
    .select("*")
    .eq("tenant_id", tenantId)
    .gte("scheduled_for", periodo.inicio)
    .lt("scheduled_for", periodo.fimExclusivo)
    .order("scheduled_for", { ascending: true });

  if (filtros.propriedadeId) consulta = consulta.eq("property_id", filtros.propriedadeId);

  return consulta.returns<CleaningTaskRow[]>();
}

async function criarConsultaManutencoes(
  tenantId: string,
  ownerId: string,
  filtros: FiltrosCalendario,
  periodo: PeriodoCalendario
) {
  const supabase = await criarClienteSupabaseServer();
  let consulta = supabase
    .from("maintenance_tasks")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("owner_id", ownerId)
    .gte("scheduled_for", periodo.inicio)
    .lt("scheduled_for", periodo.fimExclusivo)
    .order("scheduled_for", { ascending: true });

  if (filtros.propriedadeId) consulta = consulta.eq("property_id", filtros.propriedadeId);

  return consulta.returns<MaintenanceTaskRow[]>();
}

async function carregarHospedesReservas(tenantId: string, reservaIds: string[]) {
  if (!reservaIds.length) return [];

  const supabase = await criarClienteSupabaseServer();
  const resultado = await supabase
    .from("reservation_guests")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("is_primary", true)
    .in("reservation_id", reservaIds)
    .returns<ReservationGuestRow[]>();

  registrarErroLeitura("hospedes principais do calendario", resultado.error);
  return resultado.data ?? [];
}

function montarReservasCalendario(
  reservas: ReservationRow[],
  hospedes: ReservationGuestRow[]
): ReservaCalendario[] {
  return reservas.map((reserva) => ({
    ...reserva,
    hospedePrincipal:
      hospedes.find((hospede) => hospede.reservation_id === reserva.id) ?? null
  }));
}

function montarDiasCalendario(
  inicioGrade: string,
  fimGrade: string,
  mes: string,
  blocos: BlocoCalendario[],
  reservas: ReservaCalendario[],
  limpezas: LimpezaCalendario[],
  manutencoes: ManutencaoCalendario[]
): DiaCalendario[] {
  const dias: DiaCalendario[] = [];
  let cursor = parseDate(inicioGrade);
  const fim = parseDate(fimGrade);

  while (cursor < fim) {
    const data = formatDate(cursor);
    dias.push({
      data,
      numero: cursor.getUTCDate(),
      foraDoMes: data.slice(0, 7) !== mes,
      blocos: blocos.filter((bloco) => dataEstaNoIntervalo(data, bloco.starts_on, bloco.ends_on)),
      checkIns: reservas.filter((reserva) => reserva.check_in === data),
      checkOuts: reservas.filter((reserva) => reserva.check_out === data),
      limpezas: limpezas.filter((limpeza) => limpeza.scheduled_for === data),
      manutencoes: manutencoes.filter((manutencao) => manutencao.scheduled_for === data),
      reservas: reservas.filter((reserva) =>
        dataEstaNoIntervalo(data, reserva.check_in, reserva.check_out)
      )
    });
    cursor = addDays(cursor, 1);
  }

  return dias;
}

export function normalizarMesCalendario(valor: string | undefined) {
  if (valor && /^\d{4}-\d{2}$/.test(valor)) return valor;
  return new Date().toISOString().slice(0, 7);
}

export function normalizarVisaoCalendario(valor: string | undefined) {
  if (valor === "agenda") return "agenda";
  return valor === "semanal" ? "semanal" : "mensal";
}

export function normalizarSemanaCalendario(valor: string | undefined, mes: string) {
  if (valor && /^\d{4}-\d{2}-\d{2}$/.test(valor)) return valor;
  return `${mes}-01`;
}

function obterPeriodoCalendario(filtros: FiltrosCalendario) {
  if (filtros.visao === "semanal") {
    const referencia = parseDate(filtros.semana);
    const diaSemana = referencia.getUTCDay();
    const offsetSegunda = diaSemana === 0 ? 6 : diaSemana - 1;
    const inicioSemana = addDays(referencia, -offsetSegunda);
    const fimSemana = addDays(inicioSemana, 7);

    return {
      mes: filtros.mes,
      inicio: formatDate(inicioSemana),
      fimExclusivo: formatDate(fimSemana),
      inicioGrade: formatDate(inicioSemana),
      fimGrade: formatDate(fimSemana)
    };
  }

  const mes = filtros.mes;
  const inicioMes = parseDate(`${mes}-01`);
  const fimMes = new Date(Date.UTC(inicioMes.getUTCFullYear(), inicioMes.getUTCMonth() + 1, 1));
  const diaSemana = inicioMes.getUTCDay();
  const offsetSegunda = diaSemana === 0 ? 6 : diaSemana - 1;
  const inicioGrade = addDays(inicioMes, -offsetSegunda);
  const diasGrade = 42;
  const fimGrade = addDays(inicioGrade, diasGrade);

  return {
    mes,
    inicio: formatDate(inicioMes),
    fimExclusivo: formatDate(fimMes),
    inicioGrade: formatDate(inicioGrade),
    fimGrade: formatDate(fimGrade)
  };
}

type PeriodoCalendario = ReturnType<typeof obterPeriodoCalendario>;

function dataEstaNoIntervalo(data: string, inicio: string, fimExclusivo: string) {
  return data >= inicio && data < fimExclusivo;
}

function parseDate(data: string) {
  const [ano = 1970, mes = 1, dia = 1] = data.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia));
}

function addDays(data: Date, dias: number) {
  return new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate() + dias));
}

function formatDate(data: Date) {
  return data.toISOString().slice(0, 10);
}

function criarDadosVazios(filtros: FiltrosCalendario): DadosModuloCalendario {
  return {
    filtros,
    dias: [],
    podeGerenciar: false,
    propriedades: [],
    blocos: [],
    limpezas: [],
    manutencoes: [],
    reservas: [],
    resumo: {
      bloqueiosAtivos: 0,
      checkInsProximos: 0,
      checkOutsProximos: 0,
      limpezasPendentes: 0,
      manutencoesPendentes: 0,
      reservasAtivas: 0
    }
  };
}

function registrarErroLeitura(modulo: string, erro: { message: string } | null) {
  if (!erro) return;
  throw new Error(`Erro ao carregar ${modulo}: ${erro.message}`);
}
