import type {
  ProfileRow,
  PropertyRow,
  ReservationChargeRow,
  ReservationExtraServiceRow,
  ReservationGuestRow,
  ReservationNoteRow,
  ReservationPaymentRow,
  ReservationRow,
  ReservationStatusHistoryRow,
  TransactionRow
} from "@hospedex/types";

import type { ContextoAutenticacao } from "../auth/types";
import { carregarEstadoLicencaTenant } from "../license-state";
import { filtrarPorPropriedadesAtivas } from "../properties/active-filter";
import { criarClienteSupabaseServer } from "../supabase/server";
import type {
  DadosModuloReservas,
  FiltrosReservas,
  ReservaComRelacionamentos,
  StatusPagamentoReserva
} from "./types";

/**
 * Camada de leitura do módulo de Reservas.
 *
 * As consultas recebem o contexto autenticado para garantir isolamento por tenant
 * no app. A RLS do Supabase segue como proteção final contra acesso cruzado.
 */

export function podeLerReservas(contexto: ContextoAutenticacao): boolean {
  if (!contexto.featureFlags.manual_approval) return false;
  if (contexto.role === "owner") return true;
  return contexto.permissions.includes("reservations.read");
}

export function podeGerenciarReservas(contexto: ContextoAutenticacao): boolean {
  if (!contexto.featureFlags.manual_approval) return false;
  if (contexto.role === "owner") return true;
  return contexto.permissions.includes("reservations.manage");
}

export function podeGerenciarPagamentoReservas(contexto: ContextoAutenticacao): boolean {
  if (!contexto.featureFlags.manual_approval) return false;
  if (contexto.role === "owner") return true;
  return contexto.permissions.includes("finance.manage");
}

export async function carregarDadosModuloReservas(
  contexto: ContextoAutenticacao,
  filtros: FiltrosReservas
): Promise<DadosModuloReservas> {
  const tenantId = contexto.tenant?.id;

  if (!tenantId) {
    return criarDadosVazios(filtros);
  }

  const supabase = await criarClienteSupabaseServer();
  const [propriedadesResultado, reservasResultado, estadoLicenca] =
    await Promise.all([
      supabase
        .from("properties")
        .select("*")
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .order("name", { ascending: true })
        .returns<PropertyRow[]>(),
      criarConsultaReservas(tenantId, filtros),
      carregarEstadoLicencaTenant(tenantId),
    ]);

  registrarErroLeitura("propriedades", propriedadesResultado.error);
  registrarErroLeitura("reservas", reservasResultado.error);

  const propriedades = propriedadesResultado.data ?? [];
  const reservasOperacionais = filtrarPorPropriedadesAtivas(
    reservasResultado.data ?? [],
    propriedades,
  );
  const reservaIds = reservasOperacionais.map((reserva) => reserva.id);
  const hospedePerfilIds = Array.from(
    new Set(
      reservasOperacionais
        .map((reserva) => reserva.guest_user_id)
        .filter((id): id is string => Boolean(id))
    )
  );
  const [
    hospedesResultado,
    hospedePerfisResultado,
    historicoResultado,
    cobrancasResultado,
    pagamentosResultado,
    extrasResultado,
    observacoesResultado,
    lancamentosFinanceiros,
  ] = await Promise.all([
    reservaIds.length
      ? supabase
          .from("reservation_guests")
          .select("*")
          .eq("tenant_id", tenantId)
          .in("reservation_id", reservaIds)
          .returns<ReservationGuestRow[]>()
      : consultaVazia<ReservationGuestRow>(),
    hospedePerfilIds.length
      ? supabase
          .from("profiles")
          .select("id,full_name,avatar_url")
          .in("id", hospedePerfilIds)
          .returns<Array<Pick<ProfileRow, "avatar_url" | "full_name" | "id">>>()
      : consultaVazia<Pick<ProfileRow, "avatar_url" | "full_name" | "id">>(),
    reservaIds.length
      ? supabase
          .from("reservation_status_history")
          .select("*")
          .eq("tenant_id", tenantId)
          .in("reservation_id", reservaIds)
          .order("created_at", { ascending: true })
          .returns<ReservationStatusHistoryRow[]>()
      : consultaVazia<ReservationStatusHistoryRow>(),
    reservaIds.length
      ? supabase
          .from("reservation_charges")
          .select("*")
          .eq("tenant_id", tenantId)
          .in("reservation_id", reservaIds)
          .returns<ReservationChargeRow[]>()
      : consultaVazia<ReservationChargeRow>(),
    reservaIds.length
      ? supabase
          .from("reservation_payments")
          .select("*")
          .eq("tenant_id", tenantId)
          .in("reservation_id", reservaIds)
          .order("created_at", { ascending: true })
          .returns<ReservationPaymentRow[]>()
      : consultaVazia<ReservationPaymentRow>(),
    reservaIds.length
      ? supabase
          .from("reservation_extra_services")
          .select("*")
          .eq("tenant_id", tenantId)
          .in("reservation_id", reservaIds)
          .order("created_at", { ascending: true })
          .returns<ReservationExtraServiceRow[]>()
      : consultaVazia<ReservationExtraServiceRow>(),
    reservaIds.length
      ? supabase
          .from("reservation_notes")
          .select("*")
          .eq("tenant_id", tenantId)
          .in("reservation_id", reservaIds)
          .order("created_at", { ascending: true })
          .returns<ReservationNoteRow[]>()
      : consultaVazia<ReservationNoteRow>(),
    carregarLancamentosFinanceiros(tenantId, reservaIds),
  ]);

  registrarErroLeitura("hóspedes da reserva", hospedesResultado.error);
  registrarErroLeitura("histórico da reserva", historicoResultado.error);
  registrarErroLeitura("serviços extras", extrasResultado.error);
  registrarErroLeitura("observações da reserva", observacoesResultado.error);

  registrarErroLeitura("cobrancas da reserva", cobrancasResultado.error);
  registrarErroLeitura("pagamentos da reserva", pagamentosResultado.error);

  const reservas = montarReservas(
    reservasOperacionais,
    propriedades,
    hospedesResultado.data ?? [],
    hospedePerfisResultado.data ?? [],
    historicoResultado.data ?? [],
    cobrancasResultado.data ?? [],
    pagamentosResultado.data ?? [],
    extrasResultado.data ?? [],
    observacoesResultado.data ?? [],
    lancamentosFinanceiros,
  ).filter((reserva) => correspondeFiltrosRelacionados(reserva, filtros));

  return {
    filtros,
    podeGerenciar:
      podeGerenciarReservas(contexto) &&
      !estadoLicenca.isReadOnlyByExpiredLicense,
    podeGerenciarPagamento:
      podeGerenciarPagamentoReservas(contexto) &&
      !estadoLicenca.isReadOnlyByExpiredLicense,
    propriedades,
    reservas,
    resumo: {
      pendentes: reservas.filter((reserva) => reserva.status === "pending").length,
      confirmadas: reservas.filter((reserva) => reserva.status === "confirmed").length,
      hospedadas: reservas.filter((reserva) => reserva.status === "checked_in").length,
      concluidas: reservas.filter((reserva) => reserva.status === "completed").length,
      canceladas: reservas.filter((reserva) => reserva.status === "cancelled").length,
      pagamentosPendentes: reservas.filter((reserva) =>
        ["pending", "partial", "overdue"].includes(reserva.statusPagamento)
      ).length,
      pagamentosRecebidos: reservas.filter((reserva) =>
        ["paid", "received"].includes(reserva.statusPagamento)
      ).length
    }
  };
}

async function criarConsultaReservas(tenantId: string, filtros: FiltrosReservas) {
  const supabase = await criarClienteSupabaseServer();
  let consulta = supabase
    .from("reservations")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (filtros.status && filtros.status !== "todos") {
    consulta = consulta.eq("status", filtros.status);
  }

  if (filtros.propriedadeId) {
    consulta = consulta.eq("property_id", filtros.propriedadeId);
  }

  if (filtros.origem && filtros.origem !== "todos") {
    consulta = consulta.eq("source", filtros.origem);
  }

  // O periodo usa sobreposicao de datas, porque uma reserva pode comecar antes
  // do filtro e ainda ocupar a casa dentro da janela pesquisada.
  if (filtros.dataInicio) {
    consulta = consulta.gt("check_out", filtros.dataInicio);
  }

  if (filtros.dataFim) {
    consulta = consulta.lt("check_in", filtros.dataFim);
  }

  return consulta.returns<ReservationRow[]>();
}

async function carregarLancamentosFinanceiros(tenantId: string, reservaIds: string[]) {
  if (!reservaIds.length) return [];

  const supabase = await criarClienteSupabaseServer();
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("tenant_id", tenantId)
    .in("reservation_id", reservaIds)
    .order("created_at", { ascending: false })
    .returns<TransactionRow[]>();

  registrarErroLeitura("lançamentos financeiros das reservas", error);
  return data ?? [];
}

function consultaVazia<T>() {
  return Promise.resolve({ data: [] as T[], error: null });
}

function montarReservas(
  reservas: ReservationRow[],
  propriedades: PropertyRow[],
  hospedes: ReservationGuestRow[],
  hospedePerfis: Array<Pick<ProfileRow, "avatar_url" | "full_name" | "id">>,
  historico: ReservationStatusHistoryRow[],
  cobrancas: ReservationChargeRow[],
  pagamentos: ReservationPaymentRow[],
  extras: ReservationExtraServiceRow[],
  observacoes: ReservationNoteRow[],
  lancamentos: TransactionRow[]
): ReservaComRelacionamentos[] {
  const hospedesPorReserva = agruparPorReserva(hospedes);
  const perfisPorId = new Map(hospedePerfis.map((perfil) => [perfil.id, perfil]));
  const historicoPorReserva = agruparPorReserva(historico);
  const cobrancasPorReserva = agruparPorReserva(cobrancas);
  const pagamentosPorReserva = agruparPorReserva(pagamentos);
  const extrasPorReserva = agruparPorReserva(extras);
  const observacoesPorReserva = agruparPorReserva(observacoes);
  const lancamentosPorReserva = agruparPorReserva(lancamentos);

  return reservas.map((reserva) => {
    const servicosExtras = (extrasPorReserva.get(reserva.id) ?? []).filter(
      (extra) => extra.status === "active"
    );
    const lancamentosFinanceiros = lancamentosPorReserva.get(reserva.id) ?? [];
    const valorServicosExtras = servicosExtras.reduce(
      (total, extra) => total + Number(extra.total_amount),
      0
    );

    return {
      ...reserva,
      propriedade:
        propriedades.find((propriedade) => propriedade.id === reserva.property_id) ?? null,
      hospedePerfil: reserva.guest_user_id
        ? perfisPorId.get(reserva.guest_user_id) ?? null
        : null,
      hospedes: hospedesPorReserva.get(reserva.id) ?? [],
      historico: historicoPorReserva.get(reserva.id) ?? [],
      cobrancas: cobrancasPorReserva.get(reserva.id) ?? [],
      pagamentos: pagamentosPorReserva.get(reserva.id) ?? [],
      lancamentosFinanceiros,
      statusPagamento: obterStatusPagamentoReserva(reserva, lancamentosFinanceiros),
      servicosExtras,
      observacoes: observacoesPorReserva.get(reserva.id) ?? [],
      valorServicosExtras,
      valorTotalComExtras: Number(reserva.total_amount) + valorServicosExtras
    };
  });
}

function agruparPorReserva<T extends { reservation_id: string | null }>(itens: T[]) {
  const grupos = new Map<string, T[]>();

  itens.forEach((item) => {
    if (!item.reservation_id) return;
    const grupo = grupos.get(item.reservation_id) ?? [];
    grupo.push(item);
    grupos.set(item.reservation_id, grupo);
  });

  return grupos;
}

function correspondeFiltrosRelacionados(
  reserva: ReservaComRelacionamentos,
  filtros: FiltrosReservas
) {
  if (!correspondeBusca(reserva, filtros.busca)) return false;
  if (filtros.pagamento && filtros.pagamento !== "todos") {
    return reserva.statusPagamento === filtros.pagamento;
  }
  return true;
}

function correspondeBusca(reserva: ReservaComRelacionamentos, busca?: string): boolean {
  const termo = busca?.trim().toLowerCase();
  if (!termo) return true;

  const campos = [
    reserva.code,
    reserva.propriedade?.name,
    ...reserva.hospedes.flatMap((hospede) => [
      hospede.full_name,
      hospede.email,
      hospede.phone,
      hospede.document_number
    ])
  ];

  return campos.some((campo) => campo?.toLowerCase().includes(termo));
}

function obterStatusPagamentoReserva(
  reserva: ReservationRow,
  lancamentos: TransactionRow[]
): StatusPagamentoReserva {
  if (reserva.payment_status) return reserva.payment_status;

  const receitas = lancamentos.filter((item) => item.transaction_type === "income");

  // O status financeiro vinculado tem prioridade por ser a fonte rastreavel do Financeiro.
  if (receitas.some((item) => item.status === "paid")) return "received";
  if (receitas.some((item) => item.status === "refunded")) return "refunded";
  if (receitas.some((item) => item.status === "cancelled")) return "cancelled";
  if (receitas.some((item) => item.status === "pending")) return "pending";

  if (reserva.status === "cancelled") return "cancelled";
  if (["confirmed", "checked_in", "checked_out", "completed"].includes(reserva.status)) {
    return "received";
  }
  return "pending";
}

function criarDadosVazios(filtros: FiltrosReservas): DadosModuloReservas {
  return {
    filtros,
    podeGerenciar: false,
    podeGerenciarPagamento: false,
    propriedades: [],
    reservas: [],
    resumo: {
      pendentes: 0,
      confirmadas: 0,
      hospedadas: 0,
      concluidas: 0,
      canceladas: 0,
      pagamentosPendentes: 0,
      pagamentosRecebidos: 0
    }
  };
}

function registrarErroLeitura(modulo: string, erro: { message: string } | null) {
  if (!erro) return;
  console.error(`Erro ao carregar ${modulo} do tenant.`, erro.message);
}
