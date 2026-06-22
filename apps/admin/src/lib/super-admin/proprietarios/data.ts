import type {
  AuditLogRow,
  FeatureFlagRow,
  LicenseRow,
  PlanFeatureRow,
  PlanRow,
  ProfileRow,
  SubscriptionRow,
  TenantIntegrationRow,
  TenantFeatureRow,
  TenantRow,
  TransactionRow
} from "@hospedex/types";

import { criarClienteSupabaseServer } from "../../supabase/server";
import type {
  DadosModuloProprietarios,
  FiltrosProprietarios,
  MetricaProprietarios,
  ProprietarioCompleto,
  StatusFiltroProprietario
} from "./types";

/**
 * Leitura real de proprietarios para o Super Admin.
 *
 * A pagina exige super_admin antes de chamar esta camada. As consultas continuam
 * usando a sessao SSR para que RLS e policies sigam como primeira defesa.
 */

const STATUS_FILTRO: StatusFiltroProprietario[] = [
  "todos",
  "trial",
  "active",
  "past_due",
  "suspended",
  "cancelled"
];

export async function carregarDadosProprietarios(
  params: Record<string, string | string[] | undefined>
): Promise<DadosModuloProprietarios> {
  const filtros = normalizarFiltros(params);
  const supabase = await criarClienteSupabaseServer();

  let consultaTenants = supabase
    .from("tenants")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(80);

  if (filtros.status !== "todos") {
    consultaTenants = consultaTenants.eq("status", filtros.status);
  }

  const [
    tenantsResultado,
    planosResultado,
    flagsResultado,
    planFeaturesResultado,
    metricas
  ] = await Promise.all([
    consultaTenants.returns<TenantRow[]>(),
    supabase
      .from("plans")
      .select("*")
      .neq("status", "archived")
      .order("monthly_price", { ascending: true })
      .returns<PlanRow[]>(),
    supabase
      .from("feature_flags")
      .select("*")
      .order("module", { ascending: true })
      .returns<FeatureFlagRow[]>(),
    supabase.from("plan_features").select("*").returns<PlanFeatureRow[]>(),
    carregarMetricas()
  ]);

  const tenants = tenantsResultado.data ?? [];
  if (tenantsResultado.error) {
    throw new Error("Nao foi possivel carregar os proprietarios.");
  }

  const [
    profiles,
    assinaturas,
    licencas,
    tenantFeatures,
    integracoes,
    transacoes,
    auditoria
  ] = await Promise.all([
    carregarProfiles(tenants.map((tenant) => tenant.owner_id)),
    carregarAssinaturas(tenants.map((tenant) => tenant.id)),
    carregarLicencas(tenants.map((tenant) => tenant.id)),
    carregarTenantFeatures(tenants.map((tenant) => tenant.id)),
    carregarIntegracoes(tenants.map((tenant) => tenant.id)),
    carregarTransacoes(tenants.map((tenant) => tenant.id)),
    carregarAuditoria(tenants.map((tenant) => tenant.id))
  ]);

  const planos = planosResultado.data ?? [];
  const planPorId = new Map(planos.map((plano) => [plano.id, plano]));
  const proprietarios = tenants
    .map((tenant) =>
      montarProprietario(
        tenant,
        profiles,
        assinaturas,
        licencas,
        tenantFeatures,
        integracoes,
        transacoes,
        auditoria,
        planPorId
      )
    )
    .filter((proprietario) => filtrarBusca(proprietario, filtros.busca));

  registrarErroLeitura("proprietarios", tenantsResultado.error);
  registrarErroLeitura("planos", planosResultado.error);
  registrarErroLeitura("feature flags", flagsResultado.error);
  registrarErroLeitura("recursos por plano", planFeaturesResultado.error);

  return {
    featureFlags: flagsResultado.data ?? [],
    filtros,
    metricas,
    planFeatures: planFeaturesResultado.data ?? [],
    planos,
    proprietarios
  };
}

function montarProprietario(
  tenant: TenantRow,
  profiles: Map<string, ProfileRow>,
  assinaturas: Map<string, SubscriptionRow>,
  licencas: Map<string, LicenseRow>,
  tenantFeatures: Map<string, TenantFeatureRow[]>,
  integracoes: Map<string, TenantIntegrationRow[]>,
  transacoes: Map<string, TransactionRow[]>,
  auditoria: Map<string, AuditLogRow[]>,
  planPorId: Map<string, PlanRow>
): ProprietarioCompleto {
  const subscription = assinaturas.get(tenant.id) ?? null;
  const features = tenantFeatures.get(tenant.id) ?? [];

  return {
    auditLogs: auditoria.get(tenant.id) ?? [],
    featureFlagsHabilitadas: features
      .filter((feature) => feature.enabled)
      .map((feature) => feature.feature_flag_id),
    integrations: integracoes.get(tenant.id) ?? [],
    license: licencas.get(tenant.id) ?? null,
    plan: subscription ? planPorId.get(subscription.plan_id) ?? null : null,
    profile: profiles.get(tenant.owner_id) ?? null,
    subscription,
    tenant,
    tenantFeatures: features,
    transactions: transacoes.get(tenant.id) ?? []
  };
}

async function carregarMetricas(): Promise<MetricaProprietarios[]> {
  const supabase = await criarClienteSupabaseServer();
  const [total, ativos, trial, bloqueados] = await Promise.all([
    contar(supabase.from("tenants").select("id", { count: "exact", head: true }).is("deleted_at", null)),
    contar(
      supabase
        .from("tenants")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .is("deleted_at", null)
    ),
    contar(
      supabase
        .from("tenants")
        .select("id", { count: "exact", head: true })
        .eq("status", "trial")
        .is("deleted_at", null)
    ),
    contar(
      supabase
        .from("tenants")
        .select("id", { count: "exact", head: true })
        .in("status", ["suspended", "cancelled"])
        .is("deleted_at", null)
    )
  ]);

  return [
    metrica("Total", total.count ?? 0, "Tenants cadastrados", "info"),
    metrica("Ativos", ativos.count ?? 0, "Operando agora", "success"),
    metrica("Trial", trial.count ?? 0, "Em avaliacao", "warning"),
    metrica("Bloqueados", bloqueados.count ?? 0, "Suspensos ou cancelados", "danger")
  ];
}

async function carregarProfiles(ids: string[]) {
  const unicos = normalizarIds(ids);
  if (!unicos.length) return new Map<string, ProfileRow>();

  const supabase = await criarClienteSupabaseServer();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .in("id", unicos)
    .returns<ProfileRow[]>();

  registrarErroLeitura("profiles dos proprietarios", error);
  return new Map((data ?? []).map((profile) => [profile.id, profile]));
}

async function carregarAssinaturas(idsTenant: string[]) {
  const unicos = normalizarIds(idsTenant);
  if (!unicos.length) return new Map<string, SubscriptionRow>();

  const supabase = await criarClienteSupabaseServer();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .in("tenant_id", unicos)
    .order("created_at", { ascending: false })
    .returns<SubscriptionRow[]>();

  registrarErroLeitura("assinaturas dos proprietarios", error);
  return mapearUltimoPorTenant(data ?? []);
}

async function carregarLicencas(idsTenant: string[]) {
  const unicos = normalizarIds(idsTenant);
  if (!unicos.length) return new Map<string, LicenseRow>();

  const supabase = await criarClienteSupabaseServer();
  const { data, error } = await supabase
    .from("licenses")
    .select("*")
    .in("tenant_id", unicos)
    .order("created_at", { ascending: false })
    .returns<LicenseRow[]>();

  registrarErroLeitura("licencas dos proprietarios", error);
  return mapearUltimoPorTenant(data ?? []);
}

async function carregarTenantFeatures(idsTenant: string[]) {
  const unicos = normalizarIds(idsTenant);
  if (!unicos.length) return new Map<string, TenantFeatureRow[]>();

  const supabase = await criarClienteSupabaseServer();
  const { data, error } = await supabase
    .from("tenant_features")
    .select("*")
    .in("tenant_id", unicos)
    .returns<TenantFeatureRow[]>();

  registrarErroLeitura("feature flags por tenant", error);

  return (data ?? []).reduce((mapa, feature) => {
    const lista = mapa.get(feature.tenant_id) ?? [];
    lista.push(feature);
    mapa.set(feature.tenant_id, lista);
    return mapa;
  }, new Map<string, TenantFeatureRow[]>());
}

async function carregarIntegracoes(idsTenant: string[]) {
  const unicos = normalizarIds(idsTenant);
  if (!unicos.length) return new Map<string, TenantIntegrationRow[]>();

  const supabase = await criarClienteSupabaseServer();
  const { data, error } = await supabase
    .from("tenant_integrations")
    .select("*")
    .in("tenant_id", unicos)
    .order("provider", { ascending: true })
    .returns<TenantIntegrationRow[]>();

  registrarErroLeitura("integracoes dos proprietarios", error);
  return agruparPorTenant<TenantIntegrationRow>(data ?? []);
}

async function carregarTransacoes(idsTenant: string[]) {
  const unicos = normalizarIds(idsTenant);
  if (!unicos.length) return new Map<string, TransactionRow[]>();

  const supabase = await criarClienteSupabaseServer();
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .in("tenant_id", unicos)
    .order("created_at", { ascending: false })
    .limit(1000)
    .returns<TransactionRow[]>();

  registrarErroLeitura("financeiro dos proprietarios", error);
  return agruparPorTenant<TransactionRow>(data ?? []);
}

async function carregarAuditoria(idsTenant: string[]) {
  const unicos = normalizarIds(idsTenant);
  if (!unicos.length) return new Map<string, AuditLogRow[]>();

  const supabase = await criarClienteSupabaseServer();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .in("tenant_id", unicos)
    .order("created_at", { ascending: false })
    .limit(500)
    .returns<AuditLogRow[]>();

  registrarErroLeitura("logs administrativos dos proprietarios", error);
  return agruparPorTenant<AuditLogRow>(data ?? []);
}

function agruparPorTenant<T extends { tenant_id: string | null }>(linhas: T[]) {
  return linhas.reduce((mapa, linha) => {
    if (!linha.tenant_id) return mapa;
    const lista = mapa.get(linha.tenant_id) ?? [];
    lista.push(linha);
    mapa.set(linha.tenant_id, lista);
    return mapa;
  }, new Map<string, T[]>());
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
): FiltrosProprietarios {
  const status = lerParametro(params, "status");

  return {
    busca: lerParametro(params, "busca"),
    status: STATUS_FILTRO.includes(status as StatusFiltroProprietario)
      ? (status as StatusFiltroProprietario)
      : "todos"
  };
}

function filtrarBusca(proprietario: ProprietarioCompleto, busca: string): boolean {
  if (!busca) return true;
  const alvo = [
    proprietario.tenant.name,
    proprietario.profile?.email,
    proprietario.profile?.full_name,
    proprietario.plan?.name
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return alvo.includes(busca.toLowerCase());
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

async function contar(query: PromiseLike<{ count: number | null }>) {
  return query;
}

function metrica(
  label: string,
  valor: number,
  detalhe: string,
  tone: MetricaProprietarios["tone"]
): MetricaProprietarios {
  return {
    detalhe,
    label,
    tone,
    valor: Intl.NumberFormat("pt-BR").format(valor)
  };
}

function registrarErroLeitura(modulo: string, erro: { message: string } | null) {
  if (!erro) return;
  console.error(`Erro ao carregar ${modulo}.`, erro.message);
}
