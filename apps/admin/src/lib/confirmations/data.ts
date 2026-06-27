import type {
  CleaningTaskRow,
  ProfileRow,
  PropertyRow,
  ReservationGuestRow,
  ReservationNoteRow,
  ReservationRow,
  ReservationStatusHistoryRow
} from "@hospedex/types";

import type { ContextoAutenticacao } from "../auth/types";
import { criarClienteSupabaseServer } from "../supabase/server";
import type {
  DadosConfirmacoes,
  EventoTimelineConfirmacao,
  LimpezaConfirmacao,
  NotificacaoOperacao,
  ReservaConfirmacao
} from "./types";

export function podeLerConfirmacoes(contexto: ContextoAutenticacao): boolean {
  if (!contexto.featureFlags.confirmations) return false;
  if (contexto.role === "owner") return true;
  return (
    contexto.permissions.includes("reservations.read") ||
    contexto.permissions.includes("cleaning.read")
  );
}

export function podeGerenciarOperacaoDiaria(contexto: ContextoAutenticacao): boolean {
  if (!contexto.featureFlags.confirmations) return false;
  if (contexto.role === "owner") return true;
  return contexto.permissions.includes("reservations.manage");
}

export function podeGerenciarLimpezaDiaria(contexto: ContextoAutenticacao): boolean {
  if (!contexto.featureFlags.confirmations) return false;
  if (contexto.role === "owner") return true;
  return contexto.permissions.includes("cleaning.manage");
}

export async function carregarDadosConfirmacoes(
  contexto: ContextoAutenticacao
): Promise<DadosConfirmacoes> {
  const tenantId = contexto.tenant?.id;
  const ownerId = contexto.tenant?.owner_id;
  const hoje = obterHojeSaoPaulo();

  if (!tenantId || !ownerId || !podeLerConfirmacoes(contexto)) {
    return criarDadosVazios(contexto, hoje);
  }

  const supabase = await criarClienteSupabaseServer();
  const [
    reservasResultado,
    tarefasResultado,
    propriedadesResultado
  ] = await Promise.all([
    supabase
      .from("reservations")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("owner_id", ownerId)
      .in("status", ["pending", "awaiting_payment", "confirmed", "checked_in", "cancelled"])
      .order("check_in", { ascending: true })
      .returns<ReservationRow[]>(),
    supabase
      .from("cleaning_tasks")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("owner_id", ownerId)
      .in("status", ["awaiting_cleaning", "in_cleaning"])
      .order("scheduled_for", { ascending: true })
      .returns<CleaningTaskRow[]>(),
    supabase
      .from("properties")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("owner_id", ownerId)
      .returns<PropertyRow[]>()
  ]);

  registrarErro("reservas", reservasResultado.error);
  registrarErro("limpezas", tarefasResultado.error);
  registrarErro("casas", propriedadesResultado.error);

  const reservasBase = reservasResultado.data ?? [];
  const tarefasBase = tarefasResultado.data ?? [];
  const propriedades = propriedadesResultado.data ?? [];
  const reservaIds = reservasBase.map((reserva) => reserva.id);
  const tarefaReservaIds = tarefasBase
    .map((tarefa) => tarefa.reservation_id)
    .filter((id): id is string => Boolean(id));
  const [hospedes, historico, notas, reservasDasTarefas] = await Promise.all([
    carregarHospedes(tenantId, reservaIds),
    carregarHistorico(tenantId, reservaIds),
    carregarNotas(tenantId, reservaIds),
    carregarReservasPorId(tenantId, ownerId, tarefaReservaIds)
  ]);
  const perfis = await carregarPerfis(tenantId, ownerId, historico, notas, tarefasBase);

  const reservas = montarReservas(
    reservasBase,
    propriedades,
    hospedes,
    historico,
    notas,
    perfis
  );
  const limpezas = montarLimpezas(tarefasBase, propriedades, reservasDasTarefas);
  const checkInsHoje = reservas.filter(
    (reserva) => reserva.check_in === hoje && reserva.status === "confirmed"
  );
  const checkOutsHoje = reservas.filter(
    (reserva) => reserva.check_out === hoje && reserva.status === "checked_in"
  );
  const pendentes = reservas.filter((reserva) => reserva.status === "pending");
  const aguardandoPagamento = reservas.filter(
    (reserva) =>
      !["pending", "cancelled", "completed"].includes(reserva.status) &&
      reserva.payment_status === "pending"
  );
  const pagamentosRecebidos = reservas.filter(
    (reserva) =>
      !["cancelled", "completed"].includes(reserva.status) &&
      reserva.payment_status === "received"
  );
  const notificacoes = montarNotificacoes(
    checkInsHoje,
    checkOutsHoje,
    pendentes,
    aguardandoPagamento,
    limpezas,
    reservas
  );

  return {
    aguardandoPagamento,
    checkInsHoje,
    checkOutsHoje,
    hoje,
    limpezasPendentes: limpezas,
    notificacoes,
    pagamentosRecebidos,
    podeGerenciarLimpeza: podeGerenciarLimpezaDiaria(contexto),
    podeGerenciarOperacao: podeGerenciarOperacaoDiaria(contexto),
    podeLer: true,
    pendentes,
    resumo: {
      aguardandoPagamento: aguardandoPagamento.length,
      checkInsHoje: checkInsHoje.length,
      checkOutsHoje: checkOutsHoje.length,
      limpezasPendentes: limpezas.length,
      pagamentosRecebidos: pagamentosRecebidos.length,
      pendentes: pendentes.length
    },
    tenantNome: contexto.tenant?.name ?? "Tenant",
    timeline: montarTimeline(historico, notas, tarefasBase, perfis)
  };
}

async function carregarHospedes(tenantId: string, reservaIds: string[]) {
  if (!reservaIds.length) return [];
  const supabase = await criarClienteSupabaseServer();
  const { data, error } = await supabase
    .from("reservation_guests")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("is_primary", true)
    .in("reservation_id", reservaIds)
    .returns<ReservationGuestRow[]>();

  registrarErro("hospedes", error);
  return data ?? [];
}

async function carregarHistorico(tenantId: string, reservaIds: string[]) {
  if (!reservaIds.length) return [];
  const supabase = await criarClienteSupabaseServer();
  const { data, error } = await supabase
    .from("reservation_status_history")
    .select("*")
    .eq("tenant_id", tenantId)
    .in("reservation_id", reservaIds)
    .order("created_at", { ascending: false })
    .limit(20)
    .returns<ReservationStatusHistoryRow[]>();

  registrarErro("historico", error);
  return data ?? [];
}

async function carregarNotas(tenantId: string, reservaIds: string[]) {
  if (!reservaIds.length) return [];
  const supabase = await criarClienteSupabaseServer();
  const { data, error } = await supabase
    .from("reservation_notes")
    .select("*")
    .eq("tenant_id", tenantId)
    .in("reservation_id", reservaIds)
    .order("created_at", { ascending: false })
    .limit(20)
    .returns<ReservationNoteRow[]>();

  registrarErro("notas", error);
  return data ?? [];
}

async function carregarReservasPorId(
  tenantId: string,
  ownerId: string,
  reservaIds: string[]
) {
  if (!reservaIds.length) return [];
  const supabase = await criarClienteSupabaseServer();
  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("owner_id", ownerId)
    .in("id", reservaIds)
    .returns<ReservationRow[]>();

  registrarErro("reservas das limpezas", error);
  return data ?? [];
}

async function carregarPerfis(
  tenantId: string,
  ownerId: string,
  historico: ReservationStatusHistoryRow[],
  notas: ReservationNoteRow[],
  tarefas: CleaningTaskRow[]
) {
  const ids = Array.from(
    new Set([
      ownerId,
      ...historico.map((item) => item.changed_by),
      ...notas.map((item) => item.created_by),
      ...tarefas.map((tarefa) => tarefa.completed_by)
    ].filter((id): id is string => Boolean(id)))
  );

  if (!ids.length) return [];
  const supabase = await criarClienteSupabaseServer();
  const { data, error } = await supabase.from("profiles").select("*").in("id", ids).returns<ProfileRow[]>();
  registrarErro(`perfis do tenant ${tenantId}`, error);
  return data ?? [];
}

function montarReservas(
  reservas: ReservationRow[],
  propriedades: PropertyRow[],
  hospedes: ReservationGuestRow[],
  historico: ReservationStatusHistoryRow[],
  notas: ReservationNoteRow[],
  perfis: ProfileRow[]
): ReservaConfirmacao[] {
  return reservas.map((reserva) => ({
    ...reserva,
    hospedePrincipal:
      hospedes.find((hospede) => hospede.reservation_id === reserva.id) ?? null,
    propriedade:
      propriedades.find((propriedade) => propriedade.id === reserva.property_id) ?? null,
    timeline: montarTimelineReserva(reserva.id, historico, notas, perfis)
  }));
}

function montarLimpezas(
  tarefas: CleaningTaskRow[],
  propriedades: PropertyRow[],
  reservas: ReservationRow[]
): LimpezaConfirmacao[] {
  return tarefas.map((tarefa) => ({
    ...tarefa,
    propriedade:
      propriedades.find((propriedade) => propriedade.id === tarefa.property_id) ?? null,
    reserva: reservas.find((reserva) => reserva.id === tarefa.reservation_id) ?? null
  }));
}

function montarTimeline(
  historico: ReservationStatusHistoryRow[],
  notas: ReservationNoteRow[],
  tarefas: CleaningTaskRow[],
  perfis: ProfileRow[]
): EventoTimelineConfirmacao[] {
  const eventos: EventoTimelineConfirmacao[] = [
    ...historico.map((item) => ({
      autor: perfis.find((perfil) => perfil.id === item.changed_by) ?? null,
      data: item.created_at,
      descricao: item.reason ?? `Status alterado para ${item.to_status}.`,
      id: item.id,
      tipo: "status" as const
    })),
    ...notas.map((nota) => ({
      autor: perfis.find((perfil) => perfil.id === nota.created_by) ?? null,
      data: nota.created_at,
      descricao: nota.content,
      id: nota.id,
      tipo: "nota" as const
    })),
    ...tarefas
      .filter((tarefa) => tarefa.completed_at)
      .map((tarefa) => ({
        autor: perfis.find((perfil) => perfil.id === tarefa.completed_by) ?? null,
        data: tarefa.completed_at!,
        descricao: `Limpeza concluida: ${tarefa.title}.`,
        id: tarefa.id,
        tipo: "limpeza" as const
      }))
  ];

  return eventos.sort((a, b) => b.data.localeCompare(a.data)).slice(0, 12);
}

function montarTimelineReserva(
  reservaId: string,
  historico: ReservationStatusHistoryRow[],
  notas: ReservationNoteRow[],
  perfis: ProfileRow[]
): EventoTimelineConfirmacao[] {
  const eventos = montarTimeline(
    historico.filter((item) => item.reservation_id === reservaId),
    notas.filter((nota) => nota.reservation_id === reservaId),
    [],
    perfis
  );

  return eventos;
}

function montarNotificacoes(
  checkInsHoje: ReservaConfirmacao[],
  checkOutsHoje: ReservaConfirmacao[],
  pendentes: ReservaConfirmacao[],
  aguardandoPagamento: ReservaConfirmacao[],
  limpezas: LimpezaConfirmacao[],
  reservas: ReservaConfirmacao[]
): NotificacaoOperacao[] {
  return [
    ...pendentes.map((reserva) => ({
      descricao: `Nova reserva pendente ${reserva.code}.`,
      id: `nova-${reserva.id}`,
      tipo: "nova_reserva" as const
    })),
    ...reservas
      .filter((reserva) => reserva.status === "cancelled")
      .map((reserva) => ({
        descricao: `Reserva cancelada ${reserva.code}.`,
        id: `cancelada-${reserva.id}`,
        tipo: "reserva_cancelada" as const
      })),
    ...checkInsHoje.map((reserva) => ({
      descricao: `Check-in hoje: ${reserva.code}.`,
      id: `checkin-${reserva.id}`,
      tipo: "checkin_hoje" as const
    })),
    ...checkOutsHoje.map((reserva) => ({
      descricao: `Check-out hoje: ${reserva.code}.`,
      id: `checkout-${reserva.id}`,
      tipo: "checkout_hoje" as const
    })),
    ...limpezas.map((tarefa) => ({
      descricao: `Limpeza pendente: ${tarefa.title}.`,
      id: `limpeza-${tarefa.id}`,
      tipo: "limpeza_pendente" as const
    })),
    ...aguardandoPagamento.map((reserva) => ({
      descricao: `Pagamento pendente: ${reserva.code}.`,
      id: `pagamento-${reserva.id}`,
      tipo: "pagamento_pendente" as const
    })),
    ...reservas
      .filter((reserva) => reserva.payment_status === "received")
      .map((reserva) => ({
        descricao: `Pagamento recebido: ${reserva.code}.`,
        id: `pagamento-recebido-${reserva.id}`,
        tipo: "pagamento_recebido" as const
      }))
  ].slice(0, 12);
}

function criarDadosVazios(
  contexto: ContextoAutenticacao,
  hoje: string
): DadosConfirmacoes {
  return {
    aguardandoPagamento: [],
    checkInsHoje: [],
    checkOutsHoje: [],
    hoje,
    limpezasPendentes: [],
    notificacoes: [],
    pagamentosRecebidos: [],
    podeGerenciarLimpeza: false,
    podeGerenciarOperacao: false,
    podeLer: false,
    pendentes: [],
    resumo: {
      aguardandoPagamento: 0,
      checkInsHoje: 0,
      checkOutsHoje: 0,
      limpezasPendentes: 0,
      pagamentosRecebidos: 0,
      pendentes: 0
    },
    tenantNome: contexto.tenant?.name ?? "Tenant",
    timeline: []
  };
}

function obterHojeSaoPaulo() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo"
  }).format(new Date());
}

function registrarErro(modulo: string, erro: { message: string } | null) {
  if (!erro) return;
  throw new Error(`Erro ao carregar ${modulo}: ${erro.message}`);
}
