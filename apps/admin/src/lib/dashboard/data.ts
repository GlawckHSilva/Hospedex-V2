import type {
  CleaningTaskRow,
  LicenseRow,
  PermissionCode,
  PropertyRow,
  ReservationGuestRow,
  ReservationRow,
  ReservationStatus,
  TransactionRow
} from "@hospedex/types";

import type { ContextoAutenticacao } from "../auth/types";
import { filtrarPorPropriedadesAtivas } from "../properties/active-filter";
import { criarClienteSupabaseServer } from "../supabase/server";

/**
 * Carrega metricas reais do dashboard do proprietario.
 *
 * Todo calculo parte do tenant autenticado e tambem filtra owner_id quando a
 * tabela possui esse campo. A RLS do Supabase continua sendo a barreira final,
 * mas manter esses filtros aqui evita misturar dados entre clientes por erro de
 * consulta ou evolucao futura do modulo.
 */

export type TipoAlertaDashboard = "info" | "warning" | "success";

export type AlertaDashboard = {
  descricao: string;
  titulo: string;
  tipo: TipoAlertaDashboard;
  valor: string;
};

export type IconeCardDashboard =
  | "reservas"
  | "receita"
  | "check_in"
  | "check_out"
  | "ocupacao"
  | "casas";

export type PontoSerieDashboard = {
  rotulo: string;
  valor: number;
};

export type CardDashboard = {
  descricao: string;
  estadoVazioGrafico: string;
  icone: IconeCardDashboard;
  serie: PontoSerieDashboard[];
  titulo: string;
  valor: string;
};

export type ReceitaPeriodoDashboard = {
  periodo: string;
  receita: number;
  reservas: number;
  rotulo: string;
};

export type ReservaStatusDashboard = {
  cor: string;
  label: string;
  status: ReservationStatus;
  total: number;
};

export type EventoReservaDashboard = {
  codigo: string;
  data: string;
  hospede: string;
  id: string;
  propriedade: string;
  status: ReservationStatus;
};

export type ErroDashboardModulo = {
  mensagem: string;
  modulo: "reservas" | "financeiro" | "limpeza" | "licencas" | "propriedades";
};

export type DadosDashboardProprietario = {
  alertas: AlertaDashboard[];
  cards: CardDashboard[];
  erro?: string;
  erros: ErroDashboardModulo[];
  estadoVazio: boolean;
  periodo: string;
  proximosCheckIns: EventoReservaDashboard[];
  proximosCheckOuts: EventoReservaDashboard[];
  receitaPorPeriodo: ReceitaPeriodoDashboard[];
  reservasPorStatus: ReservaStatusDashboard[];
};

type DadosOperacionais = {
  hospedes: HospedeDashboard[];
  licencas: LicencaDashboard[];
  licencasPermitidas: boolean;
  limpezasPendentes: LimpezaDashboard[];
  limpezaPermitida: boolean;
  propriedades: PropriedadeDashboard[];
  propriedadesPermitidas: boolean;
  reservas: ReservaDashboard[];
  reservasPendentes: ReservaDashboard[];
  transacoesReceita: TransacaoDashboard[];
};

type HospedeDashboard = Pick<ReservationGuestRow, "full_name" | "reservation_id">;
type LicencaDashboard = Pick<LicenseRow, "expires_at" | "status">;
type LimpezaDashboard = Pick<CleaningTaskRow, "property_id">;
type PropriedadeDashboard = Pick<PropertyRow, "deleted_at" | "id" | "name" | "status">;
type ReservaDashboard = Pick<
  ReservationRow,
  "check_in" | "check_out" | "code" | "id" | "property_id" | "status"
>;
type TransacaoDashboard = Pick<TransactionRow, "amount" | "paid_at">;

type PeriodoDashboard = {
  fimMesExclusivo: string;
  fimProximos: string;
  hoje: string;
  inicioGrafico: string;
  inicioMes: string;
  mesesGrafico: Date[];
};

type ResultadoConsulta<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

const STATUS_RESERVA_ATIVA: ReservationStatus[] = [
  "confirmed",
  "checked_in",
  "checked_out",
  "completed"
];
const STATUS_RESERVA_PENDENTE: ReservationStatus[] = ["pending", "awaiting_payment"];
const STATUS_RESERVA_DASHBOARD: ReservationStatus[] = [
  "pending",
  "awaiting_payment",
  "confirmed",
  "checked_in",
  "checked_out",
  "completed",
  "cancelled"
];
const STATUS_LIMPEZA_PENDENTE = ["awaiting_cleaning", "in_cleaning"] as const;

const LABEL_STATUS_RESERVA: Record<ReservationStatus, string> = {
  awaiting_payment: "Aguardando pagamento",
  cancelled: "Cancelada",
  checked_in: "Hospedado",
  checked_out: "Check-out feito",
  completed: "Concluida",
  confirmed: "Confirmada",
  pending: "Pendente"
};

const COR_STATUS_RESERVA: Record<ReservationStatus, string> = {
  awaiting_payment: "#f59e0b",
  cancelled: "#ef4444",
  checked_in: "#06b6d4",
  checked_out: "#6366f1",
  completed: "#22c55e",
  confirmed: "#0ea5e9",
  pending: "#f97316"
};

export async function carregarDadosDashboardProprietario(
  contexto: ContextoAutenticacao
): Promise<DadosDashboardProprietario> {
  const tenantId = contexto.tenant?.id;
  const ownerId = contexto.tenant?.owner_id;

  if (!tenantId || !ownerId) {
    return criarDashboardVazio("Tenant não encontrado.");
  }

  if (!podeLerDashboard(contexto)) {
    return criarDashboardVazio("Você não tem permissão para visualizar o dashboard.");
  }

  const periodo = criarPeriodoDashboard();

  try {
    const { dados, erros } = await carregarDadosOperacionais(contexto, tenantId, ownerId, periodo);
    return montarDashboard(dados, contexto, periodo, erros);
  } catch (erro) {
    console.error("Erro ao carregar dashboard do proprietário.", erro);
    return criarDashboardVazio("Não foi possível carregar os indicadores.");
  }
}

async function carregarDadosOperacionais(
  contexto: ContextoAutenticacao,
  tenantId: string,
  ownerId: string,
  periodo: PeriodoDashboard
): Promise<{ dados: DadosOperacionais; erros: ErroDashboardModulo[] }> {
  const supabase = await criarClienteSupabaseServer();
  const erros: ErroDashboardModulo[] = [];
  const podeVerPropriedades = podeLerModulo(contexto, "properties.read");
  const podeVerReservas = podeLerModulo(contexto, "reservations.read");
  const podeVerFinanceiro = podeLerModulo(contexto, "finance.read");
  const podeVerLimpeza =
    Boolean(contexto.featureFlags.cleaning) && podeLerModulo(contexto, "cleaning.read");
  const podeVerLicencas =
    contexto.role === "owner" ||
    contexto.permissions.includes("settings.manage") ||
    contexto.permissions.includes("tenants.manage");

  const [
    propriedadesResultado,
    reservasResultado,
    reservasPendentesResultado,
    transacoesResultado,
    limpezasResultado,
    licencasResultado
  ] = await Promise.all([
    podeVerPropriedades
      ? supabase
          .from("properties")
          .select("id, name, status, deleted_at")
          .eq("tenant_id", tenantId)
          .eq("owner_id", ownerId)
          .is("deleted_at", null)
          .order("name", { ascending: true })
          .returns<PropriedadeDashboard[]>()
      : consultaVazia<PropriedadeDashboard>(),
    podeVerReservas
      ? supabase
          .from("reservations")
          .select("id, code, property_id, status, check_in, check_out")
          .eq("tenant_id", tenantId)
          .eq("owner_id", ownerId)
          .gte("check_out", periodo.inicioGrafico)
          .lte("check_in", periodo.fimProximos)
          .order("check_in", { ascending: true })
          .returns<ReservaDashboard[]>()
      : consultaVazia<ReservaDashboard>(),
    podeVerReservas
      ? supabase
          .from("reservations")
          .select("id, code, property_id, status, check_in, check_out")
          .eq("tenant_id", tenantId)
          .eq("owner_id", ownerId)
          .in("status", STATUS_RESERVA_PENDENTE)
          .order("check_in", { ascending: true })
          .returns<ReservaDashboard[]>()
      : consultaVazia<ReservaDashboard>(),
    podeVerFinanceiro
      ? supabase
          .from("transactions")
          .select("amount, paid_at")
          .eq("tenant_id", tenantId)
          .eq("transaction_type", "income")
          .eq("status", "paid")
          .gte("paid_at", `${periodo.inicioGrafico}T00:00:00`)
          .lt("paid_at", `${periodo.fimMesExclusivo}T00:00:00`)
          .order("paid_at", { ascending: true })
          .returns<TransacaoDashboard[]>()
      : consultaVazia<TransacaoDashboard>(),
    podeVerLimpeza
      ? supabase
          .from("cleaning_tasks")
          .select("property_id")
          .eq("tenant_id", tenantId)
          .eq("owner_id", ownerId)
          .in("status", [...STATUS_LIMPEZA_PENDENTE])
          .order("scheduled_for", { ascending: true, nullsFirst: false })
          .returns<LimpezaDashboard[]>()
      : consultaVazia<LimpezaDashboard>(),
    podeVerLicencas
      ? supabase
          .from("licenses")
          .select("status, expires_at")
          .eq("tenant_id", tenantId)
          .eq("owner_id", ownerId)
          .order("expires_at", { ascending: true, nullsFirst: false })
          .returns<LicencaDashboard[]>()
      : consultaVazia<LicencaDashboard>()
  ]);

  registrarErroModulo(erros, "propriedades", propriedadesResultado.error);
  registrarErroModulo(erros, "reservas", reservasResultado.error);
  registrarErroModulo(erros, "reservas", reservasPendentesResultado.error);
  registrarErroModulo(erros, "financeiro", transacoesResultado.error);
  registrarErroModulo(erros, "limpeza", limpezasResultado.error);
  registrarErroModulo(erros, "licencas", licencasResultado.error);

  const propriedades = propriedadesResultado.data ?? [];
  const reservas = filtrarPorPropriedadesAtivas(reservasResultado.data ?? [], propriedades);
  const reservasPendentes = filtrarPorPropriedadesAtivas(
    reservasPendentesResultado.data ?? [],
    propriedades
  );
  const limpezasPendentes = filtrarPorPropriedadesAtivas(
    limpezasResultado.data ?? [],
    propriedades
  );
  const hospedes = await carregarHospedesEventos(tenantId, reservas, periodo, erros);

  return {
    dados: {
      hospedes,
      licencas: licencasResultado.data ?? [],
      licencasPermitidas: podeVerLicencas,
      limpezasPendentes,
      limpezaPermitida: podeVerLimpeza,
      propriedades,
      propriedadesPermitidas: podeVerPropriedades,
      reservas,
      reservasPendentes,
      transacoesReceita: transacoesResultado.data ?? []
    },
    erros
  };
}

async function carregarHospedesEventos(
  tenantId: string,
  reservas: ReservaDashboard[],
  periodo: PeriodoDashboard,
  erros: ErroDashboardModulo[]
) {
  const reservaIds = obterReservasProximas(reservas, periodo, "check_in")
    .concat(obterReservasProximas(reservas, periodo, "check_out"))
    .map((reserva) => reserva.id);
  const idsUnicos = Array.from(new Set(reservaIds));

  if (idsUnicos.length === 0) return [];

  const supabase = await criarClienteSupabaseServer();
  const { data, error } = await supabase
    .from("reservation_guests")
    .select("reservation_id, full_name")
    .eq("tenant_id", tenantId)
    .eq("is_primary", true)
    .in("reservation_id", idsUnicos)
    .returns<HospedeDashboard[]>();

  registrarErroModulo(erros, "reservas", error);
  return data ?? [];
}

function montarDashboard(
  dados: DadosOperacionais,
  contexto: ContextoAutenticacao,
  periodo: PeriodoDashboard,
  erros: ErroDashboardModulo[]
): DadosDashboardProprietario {
  const reservasMes = dados.reservas.filter((reserva) =>
    dataEstaNoPeriodo(reserva.check_in, periodo.inicioMes, periodo.fimMesExclusivo)
  );
  const receitaPorPeriodo = montarReceitaPorPeriodo(dados, periodo);
  const receitaMes =
    receitaPorPeriodo.find((ponto) => ponto.periodo === periodo.inicioMes.slice(0, 7))?.receita ?? 0;
  const checkInsHoje = contarReservasPorData(dados.reservas, "check_in", periodo.hoje);
  const checkOutsHoje = contarReservasPorData(dados.reservas, "check_out", periodo.hoje);
  const casasAtivas = dados.propriedades.filter((propriedade) => propriedade.status === "published");
  const ocupacaoMes = calcularOcupacao(dados, periodo.inicioMes, periodo.fimMesExclusivo);
  const proximosCheckIns = montarEventosReserva(
    obterReservasProximas(dados.reservas, periodo, "check_in"),
    dados,
    "check_in"
  );
  const proximosCheckOuts = montarEventosReserva(
    obterReservasProximas(dados.reservas, periodo, "check_out"),
    dados,
    "check_out"
  );

  return {
    alertas: montarAlertas(dados, contexto, periodo),
    cards: [
      {
        descricao: "Reservas com check-in neste mês.",
        estadoVazioGrafico: "Sem reservas nos últimos meses.",
        icone: "reservas",
        serie: receitaPorPeriodo.map((ponto) => ({
          rotulo: ponto.rotulo,
          valor: ponto.reservas
        })),
        titulo: "Reservas do mês",
        valor: String(reservasMes.length)
      },
      {
        descricao: "Receitas pagas registradas no financeiro.",
        estadoVazioGrafico: "Sem receitas pagas no período.",
        icone: "receita",
        serie: receitaPorPeriodo.map((ponto) => ({
          rotulo: ponto.rotulo,
          valor: ponto.receita
        })),
        titulo: "Receita do mês",
        valor: formatarMoeda(receitaMes)
      },
      {
        descricao: "Entradas previstas para hoje.",
        estadoVazioGrafico: "Sem check-ins futuros no período.",
        icone: "check_in",
        serie: montarSerieDiaria(dados.reservas, "check_in", periodo),
        titulo: "Check-ins de hoje",
        valor: String(checkInsHoje)
      },
      {
        descricao: "Saídas previstas para hoje.",
        estadoVazioGrafico: "Sem check-outs futuros no período.",
        icone: "check_out",
        serie: montarSerieDiaria(dados.reservas, "check_out", periodo),
        titulo: "Check-outs de hoje",
        valor: String(checkOutsHoje)
      },
      {
        descricao: "Noites ocupadas no mês atual.",
        estadoVazioGrafico: "Sem ocupação real no período.",
        icone: "ocupacao",
        serie: montarSerieOcupacao(dados, periodo),
        titulo: "Ocupação",
        valor: `${ocupacaoMes}%`
      },
      {
        descricao: "Casas publicadas e visíveis no tenant.",
        estadoVazioGrafico: "Sem casas cadastradas.",
        icone: "casas",
        serie: montarSeriePropriedades(dados.propriedades),
        titulo: "Casas ativas",
        valor: String(casasAtivas.length)
      }
    ],
    erros: errosUnicos(erros),
    estadoVazio:
      dados.propriedades.length === 0 &&
      dados.reservas.length === 0 &&
      dados.transacoesReceita.length === 0 &&
      dados.limpezasPendentes.length === 0,
    periodo: formatarMesAno(periodo.hoje),
    proximosCheckIns,
    proximosCheckOuts,
    receitaPorPeriodo,
    reservasPorStatus: montarReservasPorStatus(reservasMes)
  };
}

function montarAlertas(
  dados: DadosOperacionais,
  contexto: ContextoAutenticacao,
  periodo: PeriodoDashboard
): AlertaDashboard[] {
  const reservasPendentes = dados.reservasPendentes.length;
  const limpezaAtiva = Boolean(contexto.featureFlags.cleaning);
  const limpezasPendentes = limpezaAtiva && dados.limpezaPermitida ? dados.limpezasPendentes.length : 0;
  const licencaVencendo = obterLicencaVencendo(dados.licencas, periodo.hoje);

  return [
    {
      descricao:
        reservasPendentes > 0
          ? "Há reservas aguardando aprovação ou pagamento."
          : "Nenhuma reserva pendente agora.",
      tipo: reservasPendentes > 0 ? "warning" : "success",
      titulo: "Reservas pendentes",
      valor: String(reservasPendentes)
    },
    {
      descricao: limpezaAtiva
        ? dados.limpezaPermitida
          ? limpezasPendentes > 0
          ? "Existem tarefas aguardando execução."
          : "Nenhuma tarefa de limpeza pendente."
          : "Seu perfil não possui permissão de limpeza."
        : "Feature flag de limpeza desativada para este tenant.",
      tipo: limpezaAtiva
        ? dados.limpezaPermitida
          ? limpezasPendentes > 0
            ? "warning"
            : "success"
          : "info"
        : "info",
      titulo: "Limpezas pendentes",
      valor: limpezaAtiva ? (dados.limpezaPermitida ? String(limpezasPendentes) : "Sem acesso") : "Off"
    },
    {
      descricao: dados.licencasPermitidas
        ? licencaVencendo
          ? "A licença ativa expira nos próximos 30 dias."
          : "Nenhuma licença próxima do vencimento."
        : "Seu perfil não possui permissão para visualizar licenças.",
      tipo: dados.licencasPermitidas ? (licencaVencendo ? "warning" : "success") : "info",
      titulo: "Licença vencendo",
      valor: dados.licencasPermitidas
        ? licencaVencendo?.expires_at
          ? formatarData(licencaVencendo.expires_at)
          : "OK"
        : "Sem acesso"
    }
  ];
}

function montarReceitaPorPeriodo(
  dados: DadosOperacionais,
  periodo: PeriodoDashboard
): ReceitaPeriodoDashboard[] {
  return periodo.mesesGrafico.map((mes) => {
    const chaveMes = formatarMesChave(mes);
    const inicioMes = `${chaveMes}-01`;
    const fimMes = formatarDataIso(new Date(mes.getFullYear(), mes.getMonth() + 1, 1));
    const transacoesMes = dados.transacoesReceita.filter((transacao) =>
      (transacao.paid_at ?? "").startsWith(chaveMes)
    );
    const reservasMes = dados.reservas.filter((reserva) =>
      dataEstaNoPeriodo(reserva.check_in, inicioMes, fimMes)
    );

    return {
      periodo: chaveMes,
      receita: transacoesMes.reduce((total, transacao) => total + Number(transacao.amount), 0),
      reservas: reservasMes.length,
      rotulo: new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(mes)
    };
  });
}

function montarReservasPorStatus(reservas: ReservaDashboard[]): ReservaStatusDashboard[] {
  return STATUS_RESERVA_DASHBOARD.map((status) => ({
    cor: COR_STATUS_RESERVA[status],
    label: LABEL_STATUS_RESERVA[status],
    status,
    total: reservas.filter((reserva) => reserva.status === status).length
  })).filter((item) => item.total > 0);
}

function montarEventosReserva(
  reservas: ReservaDashboard[],
  dados: DadosOperacionais,
  campoData: "check_in" | "check_out"
): EventoReservaDashboard[] {
  return reservas.slice(0, 5).map((reserva) => {
    const propriedade = dados.propriedades.find((item) => item.id === reserva.property_id);
    const hospede = dados.hospedes.find((item) => item.reservation_id === reserva.id);

    return {
      codigo: reserva.code,
      data: reserva[campoData],
      hospede: hospede?.full_name ?? "Hóspede não informado",
      id: reserva.id,
      propriedade: propriedade?.name ?? "Propriedade não encontrada",
      status: reserva.status
    };
  });
}

function obterReservasProximas(
  reservas: ReservaDashboard[],
  periodo: PeriodoDashboard,
  campoData: "check_in" | "check_out"
) {
  return reservas
    .filter((reserva) => reserva.status !== "cancelled")
    .filter((reserva) => reserva[campoData] >= periodo.hoje && reserva[campoData] <= periodo.fimProximos)
    .sort((a, b) => a[campoData].localeCompare(b[campoData]));
}

function montarSerieDiaria(
  reservas: ReservaDashboard[],
  campoData: "check_in" | "check_out",
  periodo: PeriodoDashboard
): PontoSerieDashboard[] {
  return Array.from({ length: 7 }, (_, indice) => {
    const data = adicionarDias(periodo.hoje, indice);

    return {
      rotulo: new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(
        new Date(`${data}T00:00:00`)
      ),
      valor: contarReservasPorData(reservas, campoData, data)
    };
  });
}

function montarSerieOcupacao(
  dados: DadosOperacionais,
  periodo: PeriodoDashboard
): PontoSerieDashboard[] {
  return periodo.mesesGrafico.map((mes) => {
    const inicioMes = formatarDataIso(new Date(mes.getFullYear(), mes.getMonth(), 1));
    const fimMes = formatarDataIso(new Date(mes.getFullYear(), mes.getMonth() + 1, 1));

    return {
      rotulo: new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(mes),
      valor: calcularOcupacao(dados, inicioMes, fimMes)
    };
  });
}

function montarSeriePropriedades(propriedades: PropriedadeDashboard[]): PontoSerieDashboard[] {
  const status = [
    ["Publicadas", "published"],
    ["Pausadas", "paused"],
    ["Rascunhos", "draft"]
  ] as const;

  return status.map(([rotulo, valorStatus]) => ({
    rotulo,
    valor: propriedades.filter((propriedade) => propriedade.status === valorStatus).length
  }));
}

function calcularOcupacao(dados: DadosOperacionais, inicio: string, fimExclusivo: string): number {
  const casasPublicadas = dados.propriedades.filter(
    (propriedade) => propriedade.status === "published"
  ).length;
  const capacidade = casasPublicadas;

  if (capacidade <= 0) return 0;

  const noitesDisponiveis = capacidade * diferencaDias(inicio, fimExclusivo);
  const noitesOcupadas = dados.reservas
    .filter((reserva) => STATUS_RESERVA_ATIVA.includes(reserva.status))
    .reduce((total, reserva) => total + contarNoitesNoPeriodo(reserva, inicio, fimExclusivo), 0);

  if (noitesDisponiveis <= 0) return 0;
  return Math.min(100, Math.round((noitesOcupadas / noitesDisponiveis) * 100));
}

function contarNoitesNoPeriodo(
  reserva: ReservaDashboard,
  inicio: string,
  fimExclusivo: string
): number {
  const inicioReserva = criarData(reserva.check_in);
  const fimReserva = criarData(reserva.check_out);
  const inicioPeriodo = criarData(inicio);
  const fimPeriodo = criarData(fimExclusivo);
  const inicioCalculado = new Date(Math.max(inicioReserva.getTime(), inicioPeriodo.getTime()));
  const fimCalculado = new Date(Math.min(fimReserva.getTime(), fimPeriodo.getTime()));

  return Math.max(0, Math.ceil((fimCalculado.getTime() - inicioCalculado.getTime()) / 86400000));
}

function contarReservasPorData(
  reservas: ReservaDashboard[],
  campoData: "check_in" | "check_out",
  data: string
) {
  return reservas.filter((reserva) => reserva.status !== "cancelled" && reserva[campoData] === data)
    .length;
}

function obterLicencaVencendo(licencas: LicencaDashboard[], hoje: string) {
  return licencas
    .filter((licenca) => ["trial", "active"].includes(licenca.status))
    .find((licenca) => {
      if (!licenca.expires_at) return false;
      const dias = diferencaDias(hoje, licenca.expires_at);
      return dias >= 0 && dias <= 30;
    });
}

function dataEstaNoPeriodo(valor: string, inicio: string, fimExclusivo: string): boolean {
  return valor >= inicio && valor < fimExclusivo;
}

function criarPeriodoDashboard(): PeriodoDashboard {
  const hoje = obterHojeSaoPaulo();
  const dataHoje = criarData(hoje);
  const inicioMesAtual = new Date(dataHoje.getFullYear(), dataHoje.getMonth(), 1);
  const inicioGrafico = new Date(dataHoje.getFullYear(), dataHoje.getMonth() - 5, 1);
  const mesesGrafico = Array.from({ length: 6 }, (_, indice) => {
    return new Date(inicioGrafico.getFullYear(), inicioGrafico.getMonth() + indice, 1);
  });

  return {
    fimMesExclusivo: formatarDataIso(new Date(dataHoje.getFullYear(), dataHoje.getMonth() + 1, 1)),
    fimProximos: adicionarDias(hoje, 30),
    hoje,
    inicioGrafico: formatarDataIso(inicioGrafico),
    inicioMes: formatarDataIso(inicioMesAtual),
    mesesGrafico
  };
}

function obterHojeSaoPaulo() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo"
  }).format(new Date());
}

function adicionarDias(dataIso: string, dias: number) {
  const data = criarData(dataIso);
  data.setDate(data.getDate() + dias);
  return formatarDataIso(data);
}

function criarData(dataIso: string) {
  return new Date(`${dataIso}T00:00:00`);
}

function formatarDataIso(data: Date) {
  return new Intl.DateTimeFormat("sv-SE").format(data);
}

function formatarMesChave(data: Date) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
}

function diferencaDias(inicio: string, fim: string): number {
  return Math.ceil((criarData(fim).getTime() - criarData(inicio).getTime()) / 86400000);
}

function formatarMesAno(dataIso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric"
  }).format(criarData(dataIso));
}

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency"
  }).format(valor);
}

function formatarData(valor: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(criarData(valor));
}

function consultaVazia<T>(): Promise<ResultadoConsulta<T>> {
  return Promise.resolve({ data: [], error: null });
}

function podeLerDashboard(contexto: ContextoAutenticacao) {
  return contexto.role === "owner" || contexto.permissions.includes("dashboard.read");
}

function podeLerModulo(contexto: ContextoAutenticacao, permissao: PermissionCode) {
  return contexto.role === "owner" || contexto.permissions.includes(permissao);
}

function errosUnicos(erros: ErroDashboardModulo[]) {
  return erros.filter(
    (erro, indice, lista) =>
      lista.findIndex((item) => item.modulo === erro.modulo && item.mensagem === erro.mensagem) === indice
  );
}

function criarDashboardVazio(erro?: string): DadosDashboardProprietario {
  const dashboard: DadosDashboardProprietario = {
    alertas: [],
    cards: [],
    erros: [],
    estadoVazio: true,
    periodo: "mês atual",
    proximosCheckIns: [],
    proximosCheckOuts: [],
    receitaPorPeriodo: [],
    reservasPorStatus: []
  };

  if (erro) dashboard.erro = erro;
  return dashboard;
}

function registrarErroModulo(
  erros: ErroDashboardModulo[],
  modulo: ErroDashboardModulo["modulo"],
  erro: { message: string } | null
) {
  if (!erro) return;

  const mensagens: Record<ErroDashboardModulo["modulo"], string> = {
    financeiro: "Não foi possível carregar financeiro.",
    licencas: "Não foi possível carregar licenças.",
    limpeza: "Não foi possível carregar limpeza.",
    propriedades: "Não foi possível carregar propriedades.",
    reservas: "Não foi possível carregar reservas."
  };

  console.error(`${mensagens[modulo]} ${erro.message}`);
  erros.push({ mensagem: mensagens[modulo], modulo });
}
