import type {
  PropertyRow,
  ReservationExtraServiceRow,
  ReservationGuestRow,
  ReservationNoteRow,
  ReservationRow,
  ReservationStatusHistoryRow
} from "@hospedex/types";

import type { ContextoAutenticacao } from "../auth/types";
import { criarClienteSupabaseServer } from "../supabase/server";
import type {
  DadosModuloReservas,
  FiltrosReservas,
  ReservaComRelacionamentos
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

export async function carregarDadosModuloReservas(
  contexto: ContextoAutenticacao,
  filtros: FiltrosReservas
): Promise<DadosModuloReservas> {
  const tenantId = contexto.tenant?.id;

  if (!tenantId) {
    return criarDadosVazios(filtros);
  }

  const supabase = await criarClienteSupabaseServer();
  const [
    propriedadesResultado,
    reservasResultado,
    hospedesResultado,
    historicoResultado,
    extrasResultado,
    observacoesResultado
  ] = await Promise.all([
    supabase
      .from("properties")
      .select("*")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .order("name", { ascending: true })
      .returns<PropertyRow[]>(),
    criarConsultaReservas(tenantId, filtros),
    supabase
      .from("reservation_guests")
      .select("*")
      .eq("tenant_id", tenantId)
      .returns<ReservationGuestRow[]>(),
    supabase
      .from("reservation_status_history")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: true })
      .returns<ReservationStatusHistoryRow[]>(),
    supabase
      .from("reservation_extra_services")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: true })
      .returns<ReservationExtraServiceRow[]>(),
    supabase
      .from("reservation_notes")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: true })
      .returns<ReservationNoteRow[]>()
  ]);

  registrarErroLeitura("propriedades", propriedadesResultado.error);
  registrarErroLeitura("reservas", reservasResultado.error);
  registrarErroLeitura("hóspedes da reserva", hospedesResultado.error);
  registrarErroLeitura("histórico da reserva", historicoResultado.error);
  registrarErroLeitura("serviços extras", extrasResultado.error);
  registrarErroLeitura("observações da reserva", observacoesResultado.error);

  const reservas = montarReservas(
    reservasResultado.data ?? [],
    propriedadesResultado.data ?? [],
    hospedesResultado.data ?? [],
    historicoResultado.data ?? [],
    extrasResultado.data ?? [],
    observacoesResultado.data ?? []
  ).filter((reserva) => correspondeBusca(reserva, filtros.busca));

  return {
    filtros,
    podeGerenciar: podeGerenciarReservas(contexto),
    propriedades: propriedadesResultado.data ?? [],
    reservas,
    resumo: {
      pendentes: reservas.filter((reserva) => reserva.status === "pending").length,
      confirmadas: reservas.filter((reserva) => reserva.status === "confirmed").length,
      hospedadas: reservas.filter((reserva) => reserva.status === "checked_in").length,
      canceladas: reservas.filter((reserva) => reserva.status === "cancelled").length
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

function montarReservas(
  reservas: ReservationRow[],
  propriedades: PropertyRow[],
  hospedes: ReservationGuestRow[],
  historico: ReservationStatusHistoryRow[],
  extras: ReservationExtraServiceRow[],
  observacoes: ReservationNoteRow[]
): ReservaComRelacionamentos[] {
  return reservas.map((reserva) => {
    const servicosExtras = extras.filter(
      (extra) => extra.reservation_id === reserva.id && extra.status === "active"
    );
    const valorServicosExtras = servicosExtras.reduce(
      (total, extra) => total + Number(extra.total_amount),
      0
    );

    return {
      ...reserva,
      propriedade:
        propriedades.find((propriedade) => propriedade.id === reserva.property_id) ?? null,
      hospedes: hospedes.filter((hospede) => hospede.reservation_id === reserva.id),
      historico: historico.filter((item) => item.reservation_id === reserva.id),
      servicosExtras,
      observacoes: observacoes.filter((observacao) => observacao.reservation_id === reserva.id),
      valorServicosExtras,
      valorTotalComExtras: Number(reserva.total_amount) + valorServicosExtras
    };
  });
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

function criarDadosVazios(filtros: FiltrosReservas): DadosModuloReservas {
  return {
    filtros,
    podeGerenciar: false,
    propriedades: [],
    reservas: [],
    resumo: {
      pendentes: 0,
      confirmadas: 0,
      hospedadas: 0,
      canceladas: 0
    }
  };
}

function registrarErroLeitura(modulo: string, erro: { message: string } | null) {
  if (!erro) return;
  console.error(`Erro ao carregar ${modulo} do tenant.`, erro.message);
}
