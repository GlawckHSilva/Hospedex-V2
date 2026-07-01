import type {
  PropertyReviewRow,
  ReservationGuestRow,
  ReservationRow
} from "@hospedex/types";

import type { ContextoAutenticacao } from "../auth/types";
import { filtrarPorPropriedadesAtivas } from "../properties/active-filter";
import { criarClienteSupabaseServer } from "../supabase/server";
import type {
  AvaliacaoComRelacionamentos,
  CasaAvaliacao,
  DadosModuloAvaliacoes,
  FiltroNotaAvaliacao,
  FiltroStatusAvaliacao,
  FiltrosAvaliacoes,
  NotaAvaliacao
} from "./types";
import { NOTAS_AVALIACAO } from "./types";

/**
 * Leitura das Avaliacoes internas.
 *
 * Tenant, owner e permissoes saem do contexto autenticado. Filtros da URL nunca
 * ampliam escopo; eles apenas reduzem a consulta ja protegida por RLS.
 */

export function podeLerAvaliacoes(contexto: ContextoAutenticacao): boolean {
  if (contexto.role === "owner") return true;
  if (contexto.role === "super_admin") return false;

  return contexto.permissions.includes("reviews.read");
}

export function podeGerenciarAvaliacoes(contexto: ContextoAutenticacao): boolean {
  if (contexto.role === "owner") return true;
  if (contexto.role === "super_admin") return false;

  return contexto.permissions.includes("reviews.manage");
}

export async function carregarDadosAvaliacoes(
  contexto: ContextoAutenticacao,
  filtros: FiltrosAvaliacoes
): Promise<DadosModuloAvaliacoes> {
  const tenant = contexto.tenant;

  if (!tenant) return criarDadosVazios(filtros, "Tenant nao encontrado");

  const supabase = await criarClienteSupabaseServer();
  const [propriedadesResultado, avaliacoesResultado] = await Promise.all([
    supabase
      .from("properties")
      .select("id,name,status,deleted_at")
      .eq("tenant_id", tenant.id)
      .is("deleted_at", null)
      .order("name", { ascending: true })
      .returns<CasaAvaliacao[]>(),
    criarConsultaAvaliacoes(tenant.id, filtros)
  ]);

  registrarErro("casas das avaliacoes", propriedadesResultado.error);
  registrarErro("avaliacoes", avaliacoesResultado.error);

  const propriedades = propriedadesResultado.data ?? [];
  const avaliacoesBase = filtrarPorPropriedadesAtivas(
    avaliacoesResultado.data ?? [],
    propriedades
  );
  const [reservas, hospedes] = await Promise.all([
    carregarReservasDasAvaliacoes(tenant.id, avaliacoesBase),
    carregarHospedesDasAvaliacoes(tenant.id, avaliacoesBase)
  ]);
  const avaliacoes = montarAvaliacoes(avaliacoesBase, propriedades, reservas, hospedes);

  return {
    avaliacoes,
    filtros,
    podeGerenciar: podeGerenciarAvaliacoes(contexto),
    propriedades,
    resumo: montarResumo(avaliacoes),
    tenantNome: tenant.name
  };
}

export function normalizarStatusAvaliacao(
  valor: string | undefined
): FiltroStatusAvaliacao {
  if (valor === "pending" || valor === "approved" || valor === "hidden") return valor;
  return "todos";
}

export function normalizarNotaAvaliacao(valor: string | undefined): FiltroNotaAvaliacao {
  const nota = Number.parseInt(valor ?? "", 10);
  if (NOTAS_AVALIACAO.includes(nota as NotaAvaliacao)) return nota as NotaAvaliacao;
  return "todos";
}

async function criarConsultaAvaliacoes(tenantId: string, filtros: FiltrosAvaliacoes) {
  const supabase = await criarClienteSupabaseServer();
  let consulta = supabase
    .from("property_reviews")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("reviewed_at", { ascending: false });

  if (filtros.propriedadeId) {
    consulta = consulta.eq("property_id", filtros.propriedadeId);
  }

  if (filtros.nota !== "todos") {
    consulta = consulta.eq("rating", filtros.nota);
  }

  if (filtros.status !== "todos") {
    consulta = consulta.eq("status", filtros.status);
  }

  if (filtros.dataInicio) {
    consulta = consulta.gte("reviewed_at", `${filtros.dataInicio}T00:00:00.000Z`);
  }

  if (filtros.dataFim) {
    consulta = consulta.lte("reviewed_at", `${filtros.dataFim}T23:59:59.999Z`);
  }

  return consulta.returns<PropertyReviewRow[]>();
}

async function carregarReservasDasAvaliacoes(
  tenantId: string,
  avaliacoes: PropertyReviewRow[]
) {
  const ids = idsUnicos(avaliacoes.flatMap((avaliacao) => avaliacao.reservation_id ?? []));
  if (ids.length === 0) return [];

  const supabase = await criarClienteSupabaseServer();
  const { data, error } = await supabase
    .from("reservations")
    .select("id,code,check_in,check_out,status")
    .eq("tenant_id", tenantId)
    .in("id", ids)
    .returns<ReservationRow[]>();

  registrarErro("reservas das avaliacoes", error);
  return data ?? [];
}

async function carregarHospedesDasAvaliacoes(
  tenantId: string,
  avaliacoes: PropertyReviewRow[]
) {
  const idsReservas = idsUnicos(
    avaliacoes.flatMap((avaliacao) => avaliacao.reservation_id ?? [])
  );
  if (idsReservas.length === 0) return [];

  const supabase = await criarClienteSupabaseServer();
  const { data, error } = await supabase
    .from("reservation_guests")
    .select("full_name,email,phone,is_primary,reservation_id")
    .eq("tenant_id", tenantId)
    .in("reservation_id", idsReservas)
    .returns<Array<ReservationGuestRow & { reservation_id: string }>>();

  registrarErro("hospedes das avaliacoes", error);
  return data ?? [];
}

function montarAvaliacoes(
  avaliacoes: PropertyReviewRow[],
  propriedades: CasaAvaliacao[],
  reservas: ReservationRow[],
  hospedes: Array<ReservationGuestRow & { reservation_id: string }>
): AvaliacaoComRelacionamentos[] {
  return avaliacoes.map((avaliacao) => {
    const hospedesDaReserva = hospedes.filter(
      (hospede) => hospede.reservation_id === avaliacao.reservation_id
    );

    return {
      ...avaliacao,
      hospedePrincipal:
        hospedesDaReserva.find((hospede) => hospede.is_primary) ??
        hospedesDaReserva[0] ??
        null,
      propriedade:
        propriedades.find((propriedade) => propriedade.id === avaliacao.property_id) ?? null,
      reserva:
        reservas.find((reserva) => reserva.id === avaliacao.reservation_id) ?? null
    };
  });
}

function montarResumo(avaliacoes: AvaliacaoComRelacionamentos[]) {
  const total = avaliacoes.length;
  const somaNotas = avaliacoes.reduce((totalNotas, avaliacao) => totalNotas + avaliacao.rating, 0);
  const notaMedia = total > 0 ? somaNotas / total : 0;

  return {
    aprovadas: avaliacoes.filter((avaliacao) => avaliacao.status === "approved").length,
    distribuicao: NOTAS_AVALIACAO.map((nota) => ({
      nota,
      quantidade: avaliacoes.filter((avaliacao) => avaliacao.rating === nota).length
    })),
    notaMedia,
    ocultas: avaliacoes.filter((avaliacao) => avaliacao.status === "hidden").length,
    pendentes: avaliacoes.filter((avaliacao) => avaliacao.status === "pending").length,
    total,
    ultimas: avaliacoes.slice(0, 4)
  };
}

function idsUnicos(ids: string[]): string[] {
  return Array.from(new Set(ids.filter((id) => id.length > 0)));
}

function criarDadosVazios(
  filtros: FiltrosAvaliacoes,
  tenantNome: string
): DadosModuloAvaliacoes {
  return {
    avaliacoes: [],
    filtros,
    podeGerenciar: false,
    propriedades: [],
    resumo: {
      aprovadas: 0,
      distribuicao: NOTAS_AVALIACAO.map((nota) => ({ nota, quantidade: 0 })),
      notaMedia: 0,
      ocultas: 0,
      pendentes: 0,
      total: 0,
      ultimas: []
    },
    tenantNome
  };
}

function registrarErro(label: string, erro: { message: string } | null) {
  if (erro) console.error(`Erro ao carregar ${label}.`, erro.message);
}
