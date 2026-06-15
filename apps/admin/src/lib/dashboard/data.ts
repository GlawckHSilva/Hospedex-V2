import type {
  LicenseRow,
  PropertyRow,
  ReservationExtraServiceRow,
  ReservationRow,
  UnitRow
} from "@hospedex/types";

import type { ContextoAutenticacao } from "../auth/types";
import { criarClienteSupabaseServer } from "../supabase/server";

/**
 * Carrega métricas iniciais do dashboard do proprietário.
 *
 * Todas as consultas usam o tenant autenticado para manter isolamento entre
 * clientes. A RLS do Supabase continua como a barreira final de autorização.
 */

export type AlertaDashboard = {
  descricao: string;
  titulo: string;
  tipo: "info" | "warning" | "success";
  valor: string;
};

export type CardDashboard = {
  descricao: string;
  titulo: string;
  valor: string;
};

export type DadosDashboardProprietario = {
  alertas: AlertaDashboard[];
  cards: CardDashboard[];
  erro?: string;
  estadoVazio: boolean;
  periodo: string;
};

type DadosOperacionais = {
  extras: ReservationExtraServiceRow[];
  licencas: LicenseRow[];
  propriedades: PropertyRow[];
  reservas: ReservationRow[];
  unidades: UnitRow[];
};

const STATUS_RESERVA_ATIVA = ["confirmed", "checked_in", "checked_out", "completed"];

export async function carregarDadosDashboardProprietario(
  contexto: ContextoAutenticacao
): Promise<DadosDashboardProprietario> {
  const tenantId = contexto.tenant?.id;

  if (!tenantId) {
    return criarDashboardVazio("Tenant não encontrado.");
  }

  const hoje = criarDataLocal();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

  try {
    const dados = await carregarDadosOperacionais(tenantId);
    return montarDashboard(dados, contexto, hoje, inicioMes, fimMes);
  } catch (erro) {
    console.error("Erro ao carregar dashboard do proprietário.", erro);
    return criarDashboardVazio("Não foi possível carregar os indicadores.");
  }
}

async function carregarDadosOperacionais(tenantId: string): Promise<DadosOperacionais> {
  const supabase = await criarClienteSupabaseServer();
  const [propriedades, unidades, reservas, extras, licencas] = await Promise.all([
    supabase
      .from("properties")
      .select("*")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .returns<PropertyRow[]>(),
    supabase.from("units").select("*").eq("tenant_id", tenantId).returns<UnitRow[]>(),
    supabase
      .from("reservations")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("check_in", { ascending: true })
      .returns<ReservationRow[]>(),
    supabase
      .from("reservation_extra_services")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .returns<ReservationExtraServiceRow[]>(),
    supabase
      .from("licenses")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("expires_at", { ascending: true })
      .returns<LicenseRow[]>()
  ]);

  lançarErroConsulta("propriedades", propriedades.error);
  lançarErroConsulta("unidades", unidades.error);
  lançarErroConsulta("reservas", reservas.error);
  lançarErroConsulta("serviços extras", extras.error);
  lançarErroConsulta("licenças", licencas.error);

  return {
    extras: extras.data ?? [],
    licencas: licencas.data ?? [],
    propriedades: propriedades.data ?? [],
    reservas: reservas.data ?? [],
    unidades: unidades.data ?? []
  };
}

function montarDashboard(
  dados: DadosOperacionais,
  contexto: ContextoAutenticacao,
  hoje: Date,
  inicioMes: Date,
  fimMes: Date
): DadosDashboardProprietario {
  const reservasMes = dados.reservas.filter((reserva) =>
    dataEstaNoPeriodo(reserva.check_in, inicioMes, fimMes)
  );
  const reservasReceita = reservasMes.filter((reserva) => reserva.status !== "cancelled");
  const extrasPorReserva = somarExtrasPorReserva(dados.extras);
  const receitaMes = reservasReceita.reduce(
    (total, reserva) => total + Number(reserva.total_amount) + (extrasPorReserva.get(reserva.id) ?? 0),
    0
  );
  const checkInsHoje = dados.reservas.filter(
    (reserva) => reserva.status !== "cancelled" && datasIguais(reserva.check_in, hoje)
  ).length;
  const checkOutsHoje = dados.reservas.filter(
    (reserva) => reserva.status !== "cancelled" && datasIguais(reserva.check_out, hoje)
  ).length;
  const propriedadesAtivas = dados.propriedades.filter(
    (propriedade) => propriedade.status === "published"
  ).length;

  return {
    alertas: montarAlertas(dados, contexto, hoje),
    cards: [
      {
        titulo: "Reservas do mês",
        valor: String(reservasMes.length),
        descricao: "Reservas com check-in neste mês."
      },
      {
        titulo: "Receita do mês",
        valor: formatarMoeda(receitaMes),
        descricao: "Reservas não canceladas e serviços extras."
      },
      {
        titulo: "Check-ins de hoje",
        valor: String(checkInsHoje),
        descricao: "Entradas previstas para hoje."
      },
      {
        titulo: "Check-outs de hoje",
        valor: String(checkOutsHoje),
        descricao: "Saídas previstas para hoje."
      },
      {
        titulo: "Ocupação",
        valor: `${calcularOcupacao(dados, inicioMes, fimMes)}%`,
        descricao: "Noites ocupadas no mês atual."
      },
      {
        titulo: "Propriedades ativas",
        valor: String(propriedadesAtivas),
        descricao: "Propriedades publicadas no tenant."
      }
    ],
    estadoVazio: dados.propriedades.length === 0 && dados.reservas.length === 0,
    periodo: new Intl.DateTimeFormat("pt-BR", {
      month: "long",
      year: "numeric"
    }).format(hoje)
  };
}

function montarAlertas(
  dados: DadosOperacionais,
  contexto: ContextoAutenticacao,
  hoje: Date
): AlertaDashboard[] {
  const reservasPendentes = dados.reservas.filter((reserva) =>
    ["pending", "awaiting_payment"].includes(reserva.status)
  ).length;
  const licencaVencendo = dados.licencas.find((licenca) =>
    licenca.expires_at ? diasEntre(hoje, new Date(`${licenca.expires_at}T00:00:00`)) <= 30 : false
  );

  return [
    {
      titulo: "Reservas pendentes",
      valor: String(reservasPendentes),
      descricao:
        reservasPendentes > 0
          ? "Há reservas aguardando ação."
          : "Nenhuma reserva pendente agora.",
      tipo: reservasPendentes > 0 ? "warning" : "success"
    },
    {
      titulo: "Limpeza pendente",
      valor: contexto.featureFlags.cleaning ? "0" : "flag off",
      descricao: contexto.featureFlags.cleaning
        ? "Nenhuma tarefa de limpeza registrada."
        : "Feature flag de limpeza ainda desligada.",
      tipo: contexto.featureFlags.cleaning ? "success" : "info"
    },
    {
      titulo: "Licença vencendo",
      valor: licencaVencendo?.expires_at ? formatarData(licencaVencendo.expires_at) : "OK",
      descricao: licencaVencendo
        ? "A licença ativa expira nos próximos 30 dias."
        : "Nenhuma licença próxima do vencimento.",
      tipo: licencaVencendo ? "warning" : "success"
    }
  ];
}

function calcularOcupacao(dados: DadosOperacionais, inicioMes: Date, fimMes: Date): number {
  const capacidade = Math.max(
    dados.unidades.length,
    dados.propriedades.filter((propriedade) => propriedade.status === "published").length,
    1
  );
  const diasMes = fimMes.getDate();
  const noitesDisponiveis = capacidade * diasMes;
  const noitesOcupadas = dados.reservas
    .filter((reserva) => STATUS_RESERVA_ATIVA.includes(reserva.status))
    .reduce((total, reserva) => total + contarNoitesNoPeriodo(reserva, inicioMes, fimMes), 0);

  return Math.min(100, Math.round((noitesOcupadas / noitesDisponiveis) * 100));
}

function contarNoitesNoPeriodo(reserva: ReservationRow, inicioMes: Date, fimMes: Date): number {
  const inicioReserva = new Date(`${reserva.check_in}T00:00:00`);
  const fimReserva = new Date(`${reserva.check_out}T00:00:00`);
  const inicio = new Date(Math.max(inicioReserva.getTime(), inicioMes.getTime()));
  const fim = new Date(Math.min(fimReserva.getTime(), fimMes.getTime()));

  return Math.max(0, Math.ceil((fim.getTime() - inicio.getTime()) / 86400000));
}

function somarExtrasPorReserva(extras: ReservationExtraServiceRow[]) {
  const mapa = new Map<string, number>();
  extras.forEach((extra) => {
    mapa.set(extra.reservation_id, (mapa.get(extra.reservation_id) ?? 0) + Number(extra.total_amount));
  });
  return mapa;
}

function dataEstaNoPeriodo(valor: string, inicio: Date, fim: Date): boolean {
  const data = new Date(`${valor}T00:00:00`);
  return data >= inicio && data <= fim;
}

function datasIguais(valor: string, data: Date): boolean {
  return valor === data.toISOString().slice(0, 10);
}

function diasEntre(inicio: Date, fim: Date): number {
  return Math.ceil((fim.getTime() - inicio.getTime()) / 86400000);
}

function criarDataLocal(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
}

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency"
  }).format(valor);
}

function formatarData(valor: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(
    new Date(`${valor}T00:00:00`)
  );
}

function criarDashboardVazio(erro?: string): DadosDashboardProprietario {
  const dashboard: DadosDashboardProprietario = {
    alertas: [],
    cards: [],
    estadoVazio: true,
    periodo: "mês atual"
  };

  if (erro) dashboard.erro = erro;
  return dashboard;
}

function lançarErroConsulta(modulo: string, erro: { message: string } | null) {
  if (!erro) return;
  throw new Error(`Erro ao carregar ${modulo}: ${erro.message}`);
}
