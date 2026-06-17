import type {
  CleaningTaskRow,
  LicenseRow,
  ManagementNotificationStateRow,
  PermissionCode,
  ReservationRow,
  ReservationStatusHistoryRow,
  TransactionRow
} from "@hospedex/types";

import type { ContextoAutenticacao } from "../auth/types";
import { criarClienteSupabaseServer } from "../supabase/server";
import type {
  DadosNotificacoesGerenciamento,
  FiltrosNotificacoes,
  FiltroStatusNotificacao,
  FiltroTipoNotificacao,
  NotificacaoGerenciamento,
  ResumoNotificacoesGerenciamento
} from "./types";

export const TIPOS_NOTIFICACAO: Array<{ label: string; tipo: FiltroTipoNotificacao }> = [
  { label: "Todos", tipo: "todos" },
  { label: "Nova reserva", tipo: "new_reservation" },
  { label: "Reserva cancelada", tipo: "reservation_cancelled" },
  { label: "Check-in do dia", tipo: "checkin_today" },
  { label: "Check-out do dia", tipo: "checkout_today" },
  { label: "Limpeza pendente", tipo: "cleaning_pending" },
  { label: "Pagamento aguardando", tipo: "payment_awaiting_confirmation" },
  { label: "Pagamento confirmado", tipo: "payment_confirmed" },
  { label: "Licenca vencendo", tipo: "license_expiring" }
];

export function podeUsarNotificacoesGerenciamento(contexto: ContextoAutenticacao): boolean {
  if (!contexto.tenant || contexto.role === "super_admin") return false;
  if (contexto.role === "owner") return true;

  return contexto.permissions.some((permissao) =>
    [
      "reservations.read",
      "cleaning.read",
      "finance.read",
      "settings.manage"
    ].includes(permissao)
  );
}

export async function carregarResumoNotificacoesGerenciamento(
  contexto: ContextoAutenticacao
): Promise<ResumoNotificacoesGerenciamento> {
  if (!podeUsarNotificacoesGerenciamento(contexto)) {
    return { itens: [], totalNaoLidas: 0 };
  }

  try {
    const dados = await carregarNotificacoesGerenciamento(contexto, {
      status: "nao_lidas",
      tipo: "todos"
    });

    return {
      itens: dados.itens.slice(0, 5),
      totalNaoLidas: dados.totalNaoLidas
    };
  } catch (erro) {
    console.error("Erro ao carregar resumo de notificacoes.", erro);
    return { itens: [], totalNaoLidas: 0 };
  }
}

export async function carregarNotificacoesGerenciamento(
  contexto: ContextoAutenticacao,
  filtros: FiltrosNotificacoes
): Promise<DadosNotificacoesGerenciamento> {
  const tenantId = contexto.tenant?.id;
  const ownerId = contexto.tenant?.owner_id;

  if (!tenantId || !ownerId || !podeUsarNotificacoesGerenciamento(contexto)) {
    return criarDadosVazios(filtros);
  }

  const hoje = obterHojeSaoPaulo();
  const [reservas, limpezas, transacoes, historicoPagamentos, licencas] =
    await Promise.all([
      carregarReservas(contexto, tenantId, ownerId),
      carregarLimpezas(contexto, tenantId, ownerId),
      carregarTransacoes(contexto, tenantId),
      carregarHistoricoPagamento(contexto, tenantId),
      carregarLicencas(contexto, tenantId, ownerId)
    ]);

  const derivadas = [
    ...notificacoesDeReservas(reservas, hoje, contexto),
    ...notificacoesDeLimpeza(limpezas, contexto),
    ...notificacoesDeTransacoes(transacoes, contexto),
    ...notificacoesDeHistorico(historicoPagamentos, contexto),
    ...notificacoesDeLicencas(licencas, hoje, contexto)
  ];
  const estados = await carregarEstados(tenantId, contexto.userId);
  const estadosPorKey = new Map(estados.map((estado) => [estado.notification_key, estado]));
  const notificacoes = derivadas
    .map((notificacao) => aplicarEstado(notificacao, estadosPorKey.get(notificacao.key) ?? null))
    .filter((notificacao) => !notificacao.state?.deleted_at)
    .filter((notificacao) => filtrarPorTipo(notificacao, filtros.tipo))
    .filter((notificacao) => filtrarPorStatus(notificacao, filtros.status))
    .sort((a, b) => b.data.localeCompare(a.data));
  const totalNaoLidas = derivadas
    .map((notificacao) => aplicarEstado(notificacao, estadosPorKey.get(notificacao.key) ?? null))
    .filter((notificacao) => !notificacao.state?.deleted_at && !notificacao.lida).length;

  return {
    filtros,
    itens: notificacoes,
    tiposDisponiveis: TIPOS_NOTIFICACAO,
    total: notificacoes.length,
    totalNaoLidas
  };
}

async function carregarReservas(
  contexto: ContextoAutenticacao,
  tenantId: string,
  ownerId: string
) {
  if (!temPermissao(contexto, ["reservations.read"])) return [];

  const supabase = await criarClienteSupabaseServer();
  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("owner_id", ownerId)
    .in("status", ["pending", "awaiting_payment", "confirmed", "checked_in", "cancelled"])
    .order("updated_at", { ascending: false })
    .limit(120)
    .returns<ReservationRow[]>();

  registrarErro("reservas para notificacoes", error);
  return data ?? [];
}

async function carregarLimpezas(
  contexto: ContextoAutenticacao,
  tenantId: string,
  ownerId: string
) {
  if (!temPermissao(contexto, ["cleaning.read"])) return [];

  const supabase = await criarClienteSupabaseServer();
  const { data, error } = await supabase
    .from("cleaning_tasks")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("owner_id", ownerId)
    .in("status", ["awaiting_cleaning", "in_cleaning"])
    .order("scheduled_for", { ascending: true })
    .limit(80)
    .returns<CleaningTaskRow[]>();

  registrarErro("limpezas para notificacoes", error);
  return data ?? [];
}

async function carregarTransacoes(contexto: ContextoAutenticacao, tenantId: string) {
  if (!temPermissao(contexto, ["finance.read"])) return [];

  const supabase = await criarClienteSupabaseServer();
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("tenant_id", tenantId)
    .in("status", ["pending", "paid"])
    .not("reservation_id", "is", null)
    .order("updated_at", { ascending: false })
    .limit(80)
    .returns<TransactionRow[]>();

  registrarErro("transacoes para notificacoes", error);
  return data ?? [];
}

async function carregarHistoricoPagamento(contexto: ContextoAutenticacao, tenantId: string) {
  if (!temPermissao(contexto, ["reservations.read"])) return [];

  const supabase = await criarClienteSupabaseServer();
  const { data, error } = await supabase
    .from("reservation_status_history")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("from_status", "awaiting_payment")
    .eq("to_status", "confirmed")
    .order("created_at", { ascending: false })
    .limit(40)
    .returns<ReservationStatusHistoryRow[]>();

  registrarErro("historico de pagamentos para notificacoes", error);
  return data ?? [];
}

async function carregarLicencas(
  contexto: ContextoAutenticacao,
  tenantId: string,
  ownerId: string
) {
  if (!temPermissao(contexto, ["settings.manage"])) return [];

  const supabase = await criarClienteSupabaseServer();
  const { data, error } = await supabase
    .from("licenses")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("owner_id", ownerId)
    .in("status", ["trial", "active"])
    .order("expires_at", { ascending: true })
    .limit(5)
    .returns<LicenseRow[]>();

  registrarErro("licencas para notificacoes", error);
  return data ?? [];
}

async function carregarEstados(tenantId: string, userId: string) {
  const supabase = await criarClienteSupabaseServer();
  const { data, error } = await supabase
    .from("management_notification_states")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .returns<ManagementNotificationStateRow[]>();

  registrarErro("estado de notificacoes", error);
  return data ?? [];
}

function notificacoesDeReservas(
  reservas: ReservationRow[],
  hoje: string,
  contexto: ContextoAutenticacao
): NotificacaoGerenciamento[] {
  if (!temPermissao(contexto, ["reservations.read"])) return [];

  return reservas.flatMap((reserva) => {
    const notificacoes: NotificacaoGerenciamento[] = [];
    const href = `/reservas?busca=${encodeURIComponent(reserva.code)}`;

    if (reserva.status === "pending") {
      notificacoes.push(criarNotificacao({
        data: reserva.created_at,
        descricao: `A reserva ${reserva.code} precisa de analise.`,
        href,
        key: `reservation:${reserva.id}:new`,
        permissoes: ["reservations.read"],
        tipo: "new_reservation",
        titulo: "Nova reserva",
        tom: "verde"
      }));
    }

    if (reserva.status === "cancelled") {
      notificacoes.push(criarNotificacao({
        data: reserva.cancelled_at ?? reserva.updated_at,
        descricao: `A reserva ${reserva.code} foi cancelada.`,
        href,
        key: `reservation:${reserva.id}:cancelled`,
        permissoes: ["reservations.read"],
        tipo: "reservation_cancelled",
        titulo: "Reserva cancelada",
        tom: "vermelho"
      }));
    }

    if (reserva.status === "confirmed" && reserva.check_in === hoje) {
      notificacoes.push(criarNotificacao({
        data: `${hoje}T09:00:00.000Z`,
        descricao: `Check-in hoje para a reserva ${reserva.code}.`,
        href,
        key: `reservation:${reserva.id}:checkin:${hoje}`,
        permissoes: ["reservations.read"],
        tipo: "checkin_today",
        titulo: "Check-in do dia",
        tom: "verde"
      }));
    }

    if (reserva.status === "checked_in" && reserva.check_out === hoje) {
      notificacoes.push(criarNotificacao({
        data: `${hoje}T12:00:00.000Z`,
        descricao: `Check-out hoje para a reserva ${reserva.code}.`,
        href,
        key: `reservation:${reserva.id}:checkout:${hoje}`,
        permissoes: ["reservations.read"],
        tipo: "checkout_today",
        titulo: "Check-out do dia",
        tom: "laranja"
      }));
    }

    if (reserva.status === "awaiting_payment") {
      notificacoes.push(criarNotificacao({
        data: reserva.updated_at,
        descricao: `A reserva ${reserva.code} aguarda confirmacao de pagamento.`,
        href,
        key: `reservation:${reserva.id}:payment-awaiting`,
        permissoes: ["reservations.read"],
        tipo: "payment_awaiting_confirmation",
        titulo: "Pagamento aguardando confirmacao",
        tom: "roxo"
      }));
    }

    return notificacoes;
  });
}

function notificacoesDeLimpeza(
  tarefas: CleaningTaskRow[],
  contexto: ContextoAutenticacao
): NotificacaoGerenciamento[] {
  if (!temPermissao(contexto, ["cleaning.read"])) return [];

  return tarefas.map((tarefa) =>
    criarNotificacao({
      data: tarefa.scheduled_for ? `${tarefa.scheduled_for}T10:00:00.000Z` : tarefa.created_at,
      descricao: tarefa.notes ?? "Tarefa de limpeza pendente.",
      href: "/limpeza",
      key: `cleaning:${tarefa.id}:pending`,
      permissoes: ["cleaning.read"],
      tipo: "cleaning_pending",
      titulo: tarefa.title,
      tom: "azul"
    })
  );
}

function notificacoesDeTransacoes(
  transacoes: TransactionRow[],
  contexto: ContextoAutenticacao
): NotificacaoGerenciamento[] {
  if (!temPermissao(contexto, ["finance.read"])) return [];

  return transacoes.map((transacao) =>
    criarNotificacao({
      data: transacao.paid_at ?? transacao.updated_at,
      descricao:
        transacao.status === "paid"
          ? `Pagamento de ${formatarMoeda(transacao.amount, transacao.currency)} confirmado.`
          : `Pagamento de ${formatarMoeda(transacao.amount, transacao.currency)} aguarda confirmacao.`,
      href: "/financeiro",
      key: `transaction:${transacao.id}:${transacao.status}`,
      permissoes: ["finance.read"],
      tipo:
        transacao.status === "paid"
          ? "payment_confirmed"
          : "payment_awaiting_confirmation",
      titulo: transacao.status === "paid" ? "Pagamento confirmado" : "Pagamento aguardando",
      tom: "roxo"
    })
  );
}

function notificacoesDeHistorico(
  historico: ReservationStatusHistoryRow[],
  contexto: ContextoAutenticacao
): NotificacaoGerenciamento[] {
  if (!temPermissao(contexto, ["reservations.read"])) return [];

  return historico.map((item) =>
    criarNotificacao({
      data: item.created_at,
      descricao: item.reason ?? "Pagamento confirmado e reserva liberada.",
      href: "/reservas",
      key: `reservation-history:${item.id}:payment-confirmed`,
      permissoes: ["reservations.read"],
      tipo: "payment_confirmed",
      titulo: "Pagamento confirmado",
      tom: "roxo"
    })
  );
}

function notificacoesDeLicencas(
  licencas: LicenseRow[],
  hoje: string,
  contexto: ContextoAutenticacao
): NotificacaoGerenciamento[] {
  if (!temPermissao(contexto, ["settings.manage"])) return [];
  const limite = somarDias(hoje, 7);

  return licencas
    .filter((licenca) => licenca.expires_at)
    .filter((licenca) => {
      const vencimento = licenca.expires_at!.slice(0, 10);
      return vencimento >= hoje && vencimento <= limite;
    })
    .map((licenca) =>
      criarNotificacao({
        data: licenca.expires_at!,
        descricao: `Licenca ${licenca.license_key} vence em ${formatarData(licenca.expires_at!)}.`,
        href: "/configuracoes",
        key: `license:${licenca.id}:expiring`,
        permissoes: ["settings.manage"],
        tipo: "license_expiring",
        titulo: "Licenca vencendo",
        tom: "laranja"
      })
    );
}

function criarNotificacao(
  notificacao: Omit<NotificacaoGerenciamento, "lida" | "state">
): NotificacaoGerenciamento {
  return {
    ...notificacao,
    lida: false,
    state: null
  };
}

function aplicarEstado(
  notificacao: NotificacaoGerenciamento,
  state: ManagementNotificationStateRow | null
): NotificacaoGerenciamento {
  return {
    ...notificacao,
    lida: Boolean(state?.read_at),
    state
  };
}

function filtrarPorTipo(
  notificacao: NotificacaoGerenciamento,
  filtro: FiltroTipoNotificacao
) {
  return filtro === "todos" || notificacao.tipo === filtro;
}

function filtrarPorStatus(
  notificacao: NotificacaoGerenciamento,
  filtro: FiltroStatusNotificacao
) {
  if (filtro === "lidas") return notificacao.lida;
  if (filtro === "nao_lidas") return !notificacao.lida;
  return true;
}

function temPermissao(contexto: ContextoAutenticacao, permissoes: PermissionCode[]) {
  if (contexto.role === "owner") return true;
  return permissoes.some((permissao) => contexto.permissions.includes(permissao));
}

function criarDadosVazios(
  filtros: FiltrosNotificacoes
): DadosNotificacoesGerenciamento {
  return {
    filtros,
    itens: [],
    tiposDisponiveis: TIPOS_NOTIFICACAO,
    total: 0,
    totalNaoLidas: 0
  };
}

function obterHojeSaoPaulo() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo"
  }).format(new Date());
}

function somarDias(data: string, dias: number) {
  const valor = new Date(`${data}T00:00:00.000Z`);
  valor.setUTCDate(valor.getUTCDate() + dias);
  return valor.toISOString().slice(0, 10);
}

function formatarData(data: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(
    new Date(data)
  );
}

function formatarMoeda(valor: number, moeda: string) {
  return new Intl.NumberFormat("pt-BR", {
    currency: moeda,
    style: "currency"
  }).format(valor);
}

function registrarErro(modulo: string, erro: { message: string } | null) {
  if (!erro) return;
  throw new Error(`Erro ao carregar ${modulo}: ${erro.message}`);
}
