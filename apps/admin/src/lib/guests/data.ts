import type {
  CrmGuestRow,
  PropertyRow,
  ReservationGuestRow,
  ReservationNoteRow,
  ReservationRow,
  ReservationStatusHistoryRow
} from "@hospedex/types";

import type { ContextoAutenticacao } from "../auth/types";
import { criarClienteSupabaseServer } from "../supabase/server";
import { podeGerenciarHospedes, podeLerHospedes } from "./permissions";
import type {
  ChaveHospedeReserva,
  DadosModuloHospedes,
  EventoTimelineHospede,
  FiltrosHospedes,
  HospedeCrmCompleto,
  ReservaHospede
} from "./types";

/**
 * Camada de leitura do CRM.
 *
 * Os calculos de receita, reservas e timeline rodam no servidor para preservar
 * isolamento multi-tenant e evitar que componentes conhecam a estrutura do banco.
 */

export async function carregarDadosModuloHospedes(
  contexto: ContextoAutenticacao,
  filtros: FiltrosHospedes
): Promise<DadosModuloHospedes> {
  const tenantId = contexto.tenant?.id;

  if (!tenantId || !podeLerHospedes(contexto)) {
    return criarDadosVazios(contexto, filtros);
  }

  const supabase = await criarClienteSupabaseServer();
  const [
    hospedesResultado,
    reservasResultado,
    hospedesReservaResultado,
    propriedadesResultado,
    historicoResultado,
    observacoesResultado
  ] = await Promise.all([
    criarConsultaHospedes(tenantId, filtros),
    supabase.from("reservations").select("*").eq("tenant_id", tenantId).returns<ReservationRow[]>(),
    supabase
      .from("reservation_guests")
      .select("*")
      .eq("tenant_id", tenantId)
      .returns<ReservationGuestRow[]>(),
    supabase
      .from("properties")
      .select("*")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .returns<PropertyRow[]>(),
    supabase
      .from("reservation_status_history")
      .select("*")
      .eq("tenant_id", tenantId)
      .returns<ReservationStatusHistoryRow[]>(),
    supabase
      .from("reservation_notes")
      .select("*")
      .eq("tenant_id", tenantId)
      .returns<ReservationNoteRow[]>()
  ]);

  registrarErro("hospedes", hospedesResultado.error);
  registrarErro("reservas", reservasResultado.error);
  registrarErro("hospedes das reservas", hospedesReservaResultado.error);
  registrarErro("propriedades", propriedadesResultado.error);
  registrarErro("historico", historicoResultado.error);
  registrarErro("timeline", observacoesResultado.error);

  const hospedes = (hospedesResultado.data ?? []).map((hospede) =>
    montarHospedeCompleto(
      hospede,
      reservasResultado.data ?? [],
      hospedesReservaResultado.data ?? [],
      propriedadesResultado.data ?? [],
      historicoResultado.data ?? [],
      observacoesResultado.data ?? []
    )
  );

  return {
    filtros,
    hospedes,
    podeGerenciar: podeGerenciarHospedes(contexto),
    resumo: {
      total: hospedes.length,
      ativos: hospedes.filter((hospede) => hospede.status === "active").length,
      atencao: hospedes.filter((hospede) => hospede.internal_rating === "attention").length,
      bloqueados: hospedes.filter((hospede) => hospede.status === "blocked").length
    },
    tenantNome: contexto.tenant?.name ?? "Tenant"
  };
}

async function criarConsultaHospedes(tenantId: string, filtros: FiltrosHospedes) {
  const supabase = await criarClienteSupabaseServer();
  let consulta = supabase
    .from("crm_guests")
    .select("*")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (filtros.status && filtros.status !== "todos") {
    consulta = consulta.eq("status", filtros.status);
  }

  if (filtros.busca) {
    const termo = filtros.busca.replaceAll("%", "").replaceAll(",", " ");
    consulta = consulta.or(
      `full_name.ilike.%${termo}%,email.ilike.%${termo}%,phone.ilike.%${termo}%`
    );
  }

  return consulta.returns<CrmGuestRow[]>();
}

function montarHospedeCompleto(
  hospede: CrmGuestRow,
  reservas: ReservationRow[],
  hospedesReserva: ReservationGuestRow[],
  propriedades: PropertyRow[],
  historico: ReservationStatusHistoryRow[],
  observacoes: ReservationNoteRow[]
): HospedeCrmCompleto {
  const reservasDoHospede = reservas
    .filter((reserva) =>
      hospedesReserva.some(
        (hospedeReserva) =>
          hospedeReserva.reservation_id === reserva.id && correspondeHospede(hospede, hospedeReserva)
      )
    )
    .map<ReservaHospede>((reserva) => ({
      ...reserva,
      historico: historico.filter((item) => item.reservation_id === reserva.id),
      observacoes: observacoes.filter((item) => item.reservation_id === reserva.id),
      propriedade:
        propriedades.find((propriedade) => propriedade.id === reserva.property_id) ?? null
    }))
    .sort((a, b) => b.check_in.localeCompare(a.check_in));

  const hoje = new Date().toISOString().slice(0, 10);
  const hospedagensPassadas = reservasDoHospede.filter((reserva) => reserva.check_out <= hoje);
  const hospedagensFuturas = reservasDoHospede.filter((reserva) => reserva.check_in >= hoje);

  return {
    ...hospede,
    metricas: {
      cancelamentos: reservasDoHospede.filter((reserva) => reserva.status === "cancelled").length,
      checkIns: reservasDoHospede.filter((reserva) => reserva.checked_in_at).length,
      checkOuts: reservasDoHospede.filter((reserva) => reserva.checked_out_at).length,
      proximaHospedagem: hospedagensFuturas.at(-1)?.check_in ?? null,
      quantidadeReservas: reservasDoHospede.length,
      ultimaHospedagem: hospedagensPassadas[0]?.check_out ?? null,
      valorTotalGasto: reservasDoHospede
        .filter((reserva) => reserva.status !== "cancelled")
        .reduce((total, reserva) => total + Number(reserva.total_amount), 0)
    },
    reservas: reservasDoHospede,
    timeline: montarTimeline(reservasDoHospede)
  };
}

function correspondeHospede(hospede: CrmGuestRow, chave: ChaveHospedeReserva): boolean {
  return Boolean(
    (hospede.email && chave.email && hospede.email.toLowerCase() === chave.email.toLowerCase()) ||
      (hospede.phone && chave.phone && hospede.phone === chave.phone) ||
      (hospede.document_number &&
        chave.document_number &&
        hospede.document_number === chave.document_number) ||
      (!hospede.email &&
        !hospede.phone &&
        !hospede.document_number &&
        hospede.full_name.toLowerCase() === chave.full_name.toLowerCase())
  );
}

function montarTimeline(reservas: ReservaHospede[]): EventoTimelineHospede[] {
  return reservas
    .flatMap((reserva) => [
      {
        data: reserva.created_at,
        detalhe: reserva.propriedade?.name ?? "Reserva manual",
        id: `reserva-${reserva.id}`,
        titulo: `Reserva ${reserva.code}`
      },
      ...reserva.historico.map((item) => ({
        data: item.created_at,
        detalhe: item.reason ?? "Alteracao de status",
        id: `status-${item.id}`,
        titulo: `Status ${item.to_status}`
      })),
      ...reserva.observacoes.map((item) => ({
        data: item.created_at,
        detalhe: item.content,
        id: `nota-${item.id}`,
        titulo: "Timeline da reserva"
      }))
    ])
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
}

function criarDadosVazios(
  contexto: ContextoAutenticacao,
  filtros: FiltrosHospedes
): DadosModuloHospedes {
  return {
    filtros,
    hospedes: [],
    podeGerenciar: false,
    resumo: {
      ativos: 0,
      atencao: 0,
      bloqueados: 0,
      total: 0
    },
    tenantNome: contexto.tenant?.name ?? "Tenant"
  };
}

function registrarErro(modulo: string, erro: { message: string } | null) {
  if (!erro) return;
  throw new Error(`Erro ao carregar ${modulo}: ${erro.message}`);
}
