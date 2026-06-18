import type {
  ExtraServicePropertyRow,
  ExtraServiceRow,
  ExtraServiceStatus
} from "@hospedex/types";

import type { ContextoAutenticacao } from "../auth/types";
import { criarClienteSupabaseServer } from "../supabase/server";
import type {
  CasaServicoExtra,
  DadosModuloServicosExtras,
  FiltroStatusServicoExtra,
  FiltrosServicosExtras,
  ServicoExtraComCasas
} from "./types";

/**
 * Leitura do catalogo de Servicos Extras.
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
  const [servicosResultado, vinculosResultado, casasResultado] = await Promise.all([
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
      .returns<CasaServicoExtra[]>()
  ]);

  registrarErro("servicos extras", servicosResultado.error);
  registrarErro("vinculos dos servicos extras", vinculosResultado.error);
  registrarErro("casas dos servicos extras", casasResultado.error);

  const casas = casasResultado.data ?? [];
  const servicos = montarServicos(
    servicosResultado.data ?? [],
    vinculosResultado.data ?? [],
    casas
  ).filter((servico) => correspondeFiltro(servico, filtros.status));

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

function montarServicos(
  servicos: ExtraServiceRow[],
  vinculos: ExtraServicePropertyRow[],
  casas: CasaServicoExtra[]
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
        : casas.filter((casa) => idsCasas.has(casa.id))
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

function correspondeFiltro(
  servico: ExtraServiceRow,
  status: ExtraServiceStatus | "todos"
): boolean {
  return status === "todos" || servico.status === status;
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

function registrarErro(label: string, erro: { message: string } | null) {
  if (erro) console.error(`Erro ao carregar ${label}.`, erro.message);
}
