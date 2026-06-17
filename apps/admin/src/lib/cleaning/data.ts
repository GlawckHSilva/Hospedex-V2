import type {
  CleaningTaskRow,
  ProfileRow,
  PropertyRow,
  ReservationGuestRow,
  ReservationRow,
  TenantMemberRow,
  UnitRow
} from "@hospedex/types";

import type { ContextoAutenticacao } from "../auth/types";
import { criarClienteSupabaseServer } from "../supabase/server";
import {
  moduloLimpezaAtivo,
  podeGerenciarLimpeza,
  podeGerenciarOperacao,
  podeLerLimpeza
} from "./permissions";
import type { DadosModuloLimpeza, ReservaOperacional, TarefaLimpezaCompleta } from "./types";

/**
 * Leitura do fluxo operacional.
 *
 * Check-in/check-out e limpeza compartilham tenant, mas permissoes diferentes.
 * A tela recebe somente o que o usuario pode visualizar dentro do tenant atual.
 */

export async function carregarDadosModuloLimpeza(
  contexto: ContextoAutenticacao
): Promise<DadosModuloLimpeza> {
  const tenantId = contexto.tenant?.id;
  const ownerId = contexto.tenant?.owner_id;
  const hoje = obterHojeSaoPaulo();

  if (!tenantId || !ownerId || !podeLerLimpeza(contexto)) {
    return criarDadosVazios(contexto, hoje);
  }

  const supabase = await criarClienteSupabaseServer();
  const podeVerOperacao =
    contexto.role === "owner" || contexto.permissions.includes("reservations.read");

  const [propriedadesResultado, unidadesResultado, tarefasResultado, reservasResultado] =
    await Promise.all([
      supabase
        .from("properties")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("owner_id", ownerId)
        .is("deleted_at", null)
        .order("name", { ascending: true })
        .returns<PropertyRow[]>(),
      supabase
        .from("units")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("name", { ascending: true })
        .returns<UnitRow[]>(),
      supabase
        .from("cleaning_tasks")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .returns<CleaningTaskRow[]>(),
      podeVerOperacao
        ? supabase
            .from("reservations")
            .select("*")
            .eq("tenant_id", tenantId)
            .eq("owner_id", ownerId)
            .or(`and(check_in.eq.${hoje},status.eq.confirmed),and(check_out.eq.${hoje},status.eq.checked_in)`)
            .returns<ReservationRow[]>()
        : Promise.resolve({ data: [], error: null })
    ]);

  registrarErro("propriedades da limpeza", propriedadesResultado.error);
  registrarErro("unidades da limpeza", unidadesResultado.error);
  registrarErro("tarefas de limpeza", tarefasResultado.error);
  registrarErro("reservas operacionais", reservasResultado.error);

  const propriedades = propriedadesResultado.data ?? [];
  const unidades = unidadesResultado.data ?? [];
  const reservasBase = reservasResultado.data ?? [];
  const tarefasBase = tarefasResultado.data ?? [];
  const hospedes = await carregarHospedes(tenantId, reservasBase.map((reserva) => reserva.id));
  const responsaveis = await carregarResponsaveis(tenantId, ownerId);

  const reservas = montarReservas(reservasBase, propriedades, unidades, hospedes);

  return {
    checkInsHoje: reservas.filter((reserva) => reserva.check_in === hoje),
    checkOutsHoje: reservas.filter((reserva) => reserva.check_out === hoje),
    hoje,
    limpezaAtiva: moduloLimpezaAtivo(contexto),
    podeGerenciarLimpeza: podeGerenciarLimpeza(contexto),
    podeGerenciarOperacao: podeGerenciarOperacao(contexto),
    propriedades,
    responsaveis,
    tarefas: montarTarefas(tarefasBase, propriedades, unidades, reservasBase, responsaveis),
    tenantNome: contexto.tenant?.name ?? "Tenant",
    unidades
  };
}

async function carregarHospedes(tenantId: string, reservaIds: string[]) {
  if (reservaIds.length === 0) return [];

  const supabase = await criarClienteSupabaseServer();
  const { data, error } = await supabase
    .from("reservation_guests")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("is_primary", true)
    .in("reservation_id", reservaIds)
    .returns<ReservationGuestRow[]>();

  registrarErro("hospedes das reservas operacionais", error);
  return data ?? [];
}

async function carregarResponsaveis(tenantId: string, ownerId: string) {
  const supabase = await criarClienteSupabaseServer();
  const { data: membros } = await supabase
    .from("tenant_members")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .returns<TenantMemberRow[]>();

  const ids = Array.from(new Set([ownerId, ...(membros ?? []).map((membro) => membro.user_id)]));
  if (ids.length === 0) return [];

  const { data } = await supabase.from("profiles").select("*").in("id", ids).returns<ProfileRow[]>();
  return data ?? [];
}

function montarReservas(
  reservas: ReservationRow[],
  propriedades: PropertyRow[],
  unidades: UnitRow[],
  hospedes: ReservationGuestRow[]
): ReservaOperacional[] {
  return reservas.map((reserva) => ({
    ...reserva,
    hospedePrincipal:
      hospedes.find((hospede) => hospede.reservation_id === reserva.id) ?? null,
    propriedade:
      propriedades.find((propriedade) => propriedade.id === reserva.property_id) ?? null,
    unidade: unidades.find((unidade) => unidade.id === reserva.unit_id) ?? null
  }));
}

function montarTarefas(
  tarefas: CleaningTaskRow[],
  propriedades: PropertyRow[],
  unidades: UnitRow[],
  reservas: ReservationRow[],
  responsaveis: ProfileRow[]
): TarefaLimpezaCompleta[] {
  return tarefas.map((tarefa) => ({
    ...tarefa,
    propriedade:
      propriedades.find((propriedade) => propriedade.id === tarefa.property_id) ?? null,
    reserva: reservas.find((reserva) => reserva.id === tarefa.reservation_id) ?? null,
    responsavel: responsaveis.find((responsavel) => responsavel.id === tarefa.assigned_to) ?? null,
    unidade: unidades.find((unidade) => unidade.id === tarefa.unit_id) ?? null
  }));
}

function criarDadosVazios(
  contexto: ContextoAutenticacao,
  hoje: string
): DadosModuloLimpeza {
  return {
    checkInsHoje: [],
    checkOutsHoje: [],
    hoje,
    limpezaAtiva: moduloLimpezaAtivo(contexto),
    podeGerenciarLimpeza: false,
    podeGerenciarOperacao: false,
    propriedades: [],
    responsaveis: [],
    tarefas: [],
    tenantNome: contexto.tenant?.name ?? "Tenant",
    unidades: []
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
