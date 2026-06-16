import type { LicenseRow, PlanRow, ProfileRow, SubscriptionRow, TenantRow } from "@hospedex/types";

import { criarClienteSupabaseServer } from "../../supabase/server";
import { contarSuperAdmin, lerDadosSuperAdmin } from "../query";
import type {
  DadosModuloLicencas,
  FiltrosLicencas,
  LicencaCompleta,
  MetricaLicencas,
  StatusFiltroLicenca
} from "./types";

const STATUS_FILTRO: StatusFiltroLicenca[] = [
  "todos",
  "trial",
  "active",
  "expired",
  "suspended",
  "cancelled"
];

/**
 * Leitura global de licencas.
 *
 * Licenca controla acesso operacional do tenant, por isso esta tela tambem
 * carrega tenant, owner, assinatura e plano vinculados.
 */
export async function carregarDadosLicencas(
  params: Record<string, string | string[] | undefined>
): Promise<DadosModuloLicencas> {
  const filtros = normalizarFiltros(params);
  const supabase = await criarClienteSupabaseServer();

  let consulta = supabase
    .from("licenses")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (filtros.status !== "todos") {
    consulta = consulta.eq("status", filtros.status);
  }

  const [licencas, total, ativas, bloqueadas] = await Promise.all([
    lerDadosSuperAdmin<LicenseRow[]>(consulta.returns<LicenseRow[]>(), "licencas", []),
    contarSuperAdmin(supabase.from("licenses").select("id", { count: "exact", head: true }), "licencas"),
    contarSuperAdmin(
      supabase.from("licenses").select("id", { count: "exact", head: true }).eq("status", "active"),
      "licencas ativas"
    ),
    contarSuperAdmin(
      supabase
        .from("licenses")
        .select("id", { count: "exact", head: true })
        .in("status", ["expired", "suspended"]),
      "licencas bloqueadas"
    )
  ]);

  const [tenants, owners, assinaturas] = await Promise.all([
    carregarTenants(licencas.map((licenca) => licenca.tenant_id)),
    carregarProfiles(licencas.map((licenca) => licenca.owner_id)),
    carregarAssinaturas(licencas.map((licenca) => licenca.tenant_id))
  ]);
  const planos = await carregarPlanos([...assinaturas.values()].map((assinatura) => assinatura.plan_id));

  const licencasCompletas = licencas.map((licenca) =>
    montarLicenca(licenca, tenants, owners, assinaturas, planos)
  );

  return {
    filtros,
    licencas: licencasCompletas,
    metricas: [
      metrica("Licencas", total, "Total emitido", "info"),
      metrica("Ativas", ativas, "Operando agora", "success"),
      metrica("Bloqueadas", bloqueadas, "Expiradas ou suspensas", "danger")
    ]
  };
}

function montarLicenca(
  licenca: LicenseRow,
  tenants: Map<string, TenantRow>,
  owners: Map<string, ProfileRow>,
  assinaturas: Map<string, SubscriptionRow>,
  planos: Map<string, PlanRow>
): LicencaCompleta {
  const subscription = assinaturas.get(licenca.tenant_id) ?? null;

  return {
    diasRestantes: calcularDiasRestantes(licenca.expires_at),
    licenca,
    owner: owners.get(licenca.owner_id) ?? null,
    plan: subscription ? planos.get(subscription.plan_id) ?? null : null,
    subscription,
    tenant: tenants.get(licenca.tenant_id) ?? null
  };
}

async function carregarTenants(ids: string[]) {
  const unicos = normalizarIds(ids);
  if (!unicos.length) return new Map<string, TenantRow>();

  const supabase = await criarClienteSupabaseServer();
  const data = await lerDadosSuperAdmin<TenantRow[]>(
    supabase.from("tenants").select("*").in("id", unicos).returns<TenantRow[]>(),
    "tenants das licencas",
    []
  );
  return new Map(data.map((tenant) => [tenant.id, tenant]));
}

async function carregarProfiles(ids: string[]) {
  const unicos = normalizarIds(ids);
  if (!unicos.length) return new Map<string, ProfileRow>();

  const supabase = await criarClienteSupabaseServer();
  const data = await lerDadosSuperAdmin<ProfileRow[]>(
    supabase.from("profiles").select("*").in("id", unicos).returns<ProfileRow[]>(),
    "owners das licencas",
    []
  );
  return new Map(data.map((profile) => [profile.id, profile]));
}

async function carregarAssinaturas(idsTenant: string[]) {
  const unicos = normalizarIds(idsTenant);
  if (!unicos.length) return new Map<string, SubscriptionRow>();

  const supabase = await criarClienteSupabaseServer();
  const data = await lerDadosSuperAdmin<SubscriptionRow[]>(
    supabase
      .from("subscriptions")
      .select("*")
      .in("tenant_id", unicos)
      .order("created_at", { ascending: false })
      .returns<SubscriptionRow[]>(),
    "assinaturas das licencas",
    []
  );

  return mapearUltimoPorTenant(data);
}

async function carregarPlanos(ids: string[]) {
  const unicos = normalizarIds(ids);
  if (!unicos.length) return new Map<string, PlanRow>();

  const supabase = await criarClienteSupabaseServer();
  const data = await lerDadosSuperAdmin<PlanRow[]>(
    supabase.from("plans").select("*").in("id", unicos).returns<PlanRow[]>(),
    "planos das licencas",
    []
  );
  return new Map(data.map((plano) => [plano.id, plano]));
}

function mapearUltimoPorTenant<T extends { tenant_id: string }>(linhas: T[]) {
  const mapa = new Map<string, T>();
  linhas.forEach((linha) => {
    if (!mapa.has(linha.tenant_id)) mapa.set(linha.tenant_id, linha);
  });
  return mapa;
}

function normalizarFiltros(
  params: Record<string, string | string[] | undefined>
): FiltrosLicencas {
  const status = lerParametro(params, "status");
  return {
    status: STATUS_FILTRO.includes(status as StatusFiltroLicenca)
      ? (status as StatusFiltroLicenca)
      : "todos"
  };
}

function calcularDiasRestantes(data: string | null) {
  if (!data) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const destino = new Date(`${data}T00:00:00`);
  return Math.ceil((destino.getTime() - hoje.getTime()) / 86_400_000);
}

function lerParametro(
  params: Record<string, string | string[] | undefined>,
  chave: string
): string {
  const valor = params[chave];
  return (Array.isArray(valor) ? valor[0] : valor)?.trim() ?? "";
}

function normalizarIds(ids: string[]) {
  return [...new Set(ids)].filter(Boolean);
}

function metrica(
  label: string,
  valor: number,
  detalhe: string,
  tone: MetricaLicencas["tone"]
): MetricaLicencas {
  return {
    detalhe,
    label,
    tone,
    valor: Intl.NumberFormat("pt-BR").format(valor)
  };
}
