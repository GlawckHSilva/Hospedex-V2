import type {
  ExtraServicePropertyRow,
  ExtraServiceRow,
  ReservationExtraServiceRow
} from "@hospedex/types";

import type { ContextoAutenticacao } from "../auth/types";
import { criarClienteSupabaseServer } from "../supabase/server";
import type {
  CasaServicoExtra,
  DadosModuloServicosExtras,
  FiltroObrigatoriedadeServicoExtra,
  FiltroStatusServicoExtra,
  FiltroTipoCobrancaServicoExtra,
  FiltrosServicosExtras,
  ServicoExtraComCasas
} from "./types";

/**
 * Leitura do catálogo de Serviços Extras.
 *
 * O tenant vem do contexto autenticado; IDs vindos da interface nunca definem
 * escopo de consulta. A RLS replica esta regra no banco.
 */

export function podeLerServicosExtras(contexto: ContextoAutenticacao): boolean {
  if (contexto.role === "owner") return true;
  if (contexto.role === "super_admin") return false;

  return contexto.permissions.some((permissao) =>
    ["reservations.read", "reservations.manage", "settings.manage"].includes(permissao)
  );
}

export function podeGerenciarServicosExtras(contexto: ContextoAutenticacao): boolean {
  if (contexto.role === "owner") return true;

  return contexto.permissions.some((permissao) =>
    ["reservations.manage", "settings.manage"].includes(permissao)
  );
}

export async function carregarDadosServicosExtras(
  contexto: ContextoAutenticacao,
  filtros: FiltrosServicosExtras
): Promise<DadosModuloServicosExtras> {
  const tenant = contexto.tenant;

  if (!tenant) return criarDadosVazios(filtros, "Tenant nao encontrado");

  const supabase = await criarClienteSupabaseServer();
  const [servicosResultado, vinculosResultado, casasResultado, usosResultado] = await Promise.all([
    supabase
      .from("extra_services")
      .select("*")
      .eq("tenant_id", tenant.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .returns<ExtraServiceRow[]>(),
    supabase
      .from("extra_service_properties")
      .select("*")
      .eq("tenant_id", tenant.id)
      .returns<ExtraServicePropertyRow[]>(),
    supabase
      .from("properties")
      .select("id,name,status")
      .eq("tenant_id", tenant.id)
      .is("deleted_at", null)
      .order("name", { ascending: true })
      .returns<CasaServicoExtra[]>(),
    supabase
      .from("reservation_extra_services")
      .select("name")
      .eq("tenant_id", tenant.id)
      .returns<Pick<ReservationExtraServiceRow, "name">[]>()
  ]);

  registrarErro("servicos extras", servicosResultado.error);
  registrarErro("vinculos dos servicos extras", vinculosResultado.error);
  registrarErro("casas dos servicos extras", casasResultado.error);
  registrarErro("uso dos servicos extras", usosResultado.error);

  const casas = casasResultado.data ?? [];
  const servicos = montarServicos(
    servicosResultado.data ?? [],
    vinculosResultado.data ?? [],
    casas,
    montarMapaUsos(usosResultado.data ?? [])
  ).filter((servico) => correspondeFiltros(servico, filtros));

  return {
    casas,
    filtros,
    podeGerenciar: podeGerenciarServicosExtras(contexto),
    resumo: montarResumo(servicosResultado.data ?? []),
    servicos,
    tenantNome: tenant.name
  };
}

export function normalizarStatusServicoExtra(
  valor: string | undefined
): FiltroStatusServicoExtra {
  if (valor === "active" || valor === "inactive") return valor;
  return "todos";
}

export function normalizarTipoCobrancaServicoExtra(
  valor: string | undefined
): FiltroTipoCobrancaServicoExtra {
  if (
    valor === "fixed" ||
    valor === "per_guest" ||
    valor === "per_night" ||
    valor === "per_reservation"
  ) {
    return valor;
  }

  return "todos";
}

export function normalizarObrigatoriedadeServicoExtra(
  valor: string | undefined
): FiltroObrigatoriedadeServicoExtra {
  if (valor === "obrigatorios" || valor === "opcionais") return valor;
  return "todos";
}

function montarServicos(
  servicos: ExtraServiceRow[],
  vinculos: ExtraServicePropertyRow[],
  casas: CasaServicoExtra[],
  usosPorNome: Map<string, number>
): ServicoExtraComCasas[] {
  return servicos.map((servico) => {
    const idsCasas = new Set(
      vinculos
        .filter((vinculo) => vinculo.extra_service_id === servico.id)
        .map((vinculo) => vinculo.property_id)
    );

    return {
      ...servico,
      casas: servico.applies_to_all_properties
        ? []
        : casas.filter((casa) => idsCasas.has(casa.id)),
      usadoEmReservas: (usosPorNome.get(normalizarTexto(servico.name)) ?? 0) > 0,
      usosEmReservas: usosPorNome.get(normalizarTexto(servico.name)) ?? 0
    };
  });
}

function montarResumo(servicos: ExtraServiceRow[]) {
  return {
    ativos: servicos.filter((servico) => servico.status === "active").length,
    inativos: servicos.filter((servico) => servico.status === "inactive").length,
    obrigatorios: servicos.filter((servico) => servico.is_required).length,
    total: servicos.length
  };
}

function correspondeFiltros(
  servico: ExtraServiceRow,
  filtros: FiltrosServicosExtras
): boolean {
  if (filtros.status !== "todos" && servico.status !== filtros.status) return false;
  if (filtros.tipoCobranca !== "todos" && servico.charge_type !== filtros.tipoCobranca) {
    return false;
  }
  if (filtros.obrigatoriedade === "obrigatorios" && !servico.is_required) return false;
  if (filtros.obrigatoriedade === "opcionais" && servico.is_required) return false;

  const busca = normalizarTexto(filtros.busca);
  if (!busca) return true;

  return (
    normalizarTexto(servico.name).includes(busca) ||
    normalizarTexto(servico.description ?? "").includes(busca)
  );
}

function criarDadosVazios(
  filtros: FiltrosServicosExtras,
  tenantNome: string
): DadosModuloServicosExtras {
  return {
    casas: [],
    filtros,
    podeGerenciar: false,
    resumo: {
      ativos: 0,
      inativos: 0,
      obrigatorios: 0,
      total: 0
    },
    servicos: [],
    tenantNome
  };
}

function montarMapaUsos(usos: Array<Pick<ReservationExtraServiceRow, "name">>) {
  const mapa = new Map<string, number>();

  for (const uso of usos) {
    const chave = normalizarTexto(uso.name);
    mapa.set(chave, (mapa.get(chave) ?? 0) + 1);
  }

  return mapa;
}

function normalizarTexto(valor: string) {
  return valor
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function registrarErro(label: string, erro: { message: string } | null) {
  if (erro) console.error(`Erro ao carregar ${label}.`, erro.message);
}
