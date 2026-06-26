import type {
  AuditLogRow,
  FeatureFlagRow,
  LicenseRow,
  PlanRow,
  ProfileRow,
  ReservationGuestRow,
  TenantFeatureRow,
  TenantRow,
  TransactionRow
} from "@hospedex/types";

import type { ContextoAutenticacao } from "../auth/types";
import { criarClienteSupabaseServer } from "../supabase/server";
import { contarSuperAdmin, lerDadosSuperAdmin } from "./query";

export type SuperAdminTone = "success" | "warning" | "danger" | "info" | "neutral";

export type SuperAdminMetrica = {
  label: string;
  valor: string;
  detalhe: string;
  tone: SuperAdminTone;
};

export type SuperAdminRegistro = {
  detalhe: string;
  id: string;
  meta: string;
  status: string;
  statusTone: SuperAdminTone;
  titulo: string;
};

export type SuperAdminModuloDados = {
  descricao: string;
  estadoVazio: string;
  metricas: SuperAdminMetrica[];
  registros: SuperAdminRegistro[];
  titulo: string;
};

export type SuperAdminModulo =
  | "auditoria"
  | "configuracoes"
  | "feature-flags"
  | "hospedes"
  | "licencas"
  | "planos"
  | "proprietarios";

type ResultadoContagem = { count: number | null; error: { message: string } | null };

const LIMITE_REGISTROS = 8;

/**
 * As consultas usam a sessao SSR do usuario autenticado.
 * A visao global depende das policies e da role super_admin no banco.
 */
export async function carregarDashboardSuperAdmin(contexto: ContextoAutenticacao) {
  const supabase = await criarClienteSupabaseServer();
  const [
    proprietariosAtivos,
    proprietariosBloqueados,
    hospedes,
    reservas,
    receitaTotal,
    planosAtivos
  ] = await Promise.all([
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
        .in("status", ["suspended", "cancelled"])
        .is("deleted_at", null)
    ),
    contar(supabase.from("reservation_guests").select("id", { count: "exact", head: true })),
    contar(supabase.from("reservations").select("id", { count: "exact", head: true })),
    carregarReceitaTotal(),
    contar(
      supabase
        .from("plans")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
    )
  ]);

  return {
    contextoGlobal: {
      email: contexto.profile.email,
      nome: contexto.profile.full_name ?? contexto.profile.email,
      role: contexto.role
    },
    metricas: [
      metrica("Proprietarios ativos", proprietariosAtivos, "Tenants liberados para operar", "success"),
      metrica("Proprietarios bloqueados", proprietariosBloqueados, "Suspensos ou cancelados", "danger"),
      metrica("Hospedes cadastrados", hospedes, "Contatos vindos de reservas", "info"),
      metrica("Reservas totais", reservas, "Reservas da plataforma", "warning"),
      metricaTexto("Receita total", formatarMoeda(receitaTotal), "Transacoes pagas de receita", "success"),
      metrica("Planos ativos", planosAtivos, "Catalogo comercial ativo", "neutral")
    ],
    recentes: await carregarAuditoriaRecente()
  };
}

export async function carregarModuloSuperAdmin(modulo: SuperAdminModulo) {
  switch (modulo) {
    case "proprietarios":
      return carregarProprietarios();
    case "hospedes":
      return carregarHospedes();
    case "planos":
      return carregarPlanos();
    case "licencas":
      return carregarLicencas();
    case "feature-flags":
      return carregarFeatureFlags();
    case "auditoria":
      return carregarAuditoria();
    case "configuracoes":
      return carregarConfiguracoes();
  }
}

async function carregarReceitaTotal() {
  const supabase = await criarClienteSupabaseServer();
  const transacoes = await lerDadosSuperAdmin<TransactionRow[]>(
    supabase
      .from("transactions")
      .select("amount")
      .eq("transaction_type", "income")
      .eq("status", "paid")
      .returns<TransactionRow[]>(),
    "receita total",
    []
  );

  return transacoes.reduce((total, transacao) => total + Number(transacao.amount ?? 0), 0);
}

async function carregarProprietarios(): Promise<SuperAdminModuloDados> {
  const supabase = await criarClienteSupabaseServer();
  const { data: tenants } = await supabase
    .from("tenants")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(LIMITE_REGISTROS)
    .returns<TenantRow[]>();
  const tenantRows = tenants ?? [];
  const owners = await carregarProfilesPorId(tenantRows.map((tenant) => tenant.owner_id));
  const licencas = await carregarLicencasPorTenant(tenantRows.map((tenant) => tenant.id));

  return {
    titulo: "Proprietarios",
    descricao: "Visao global de clientes da plataforma, sem aplicar contexto de dono de imovel.",
    estadoVazio: "Nenhum proprietario ou tenant encontrado.",
    metricas: [
      await metricaDeTabela("Tenants", "tenants", "Clientes cadastrados", "info"),
      metrica(
        "Ativos",
        await contar(
          supabase
            .from("tenants")
            .select("id", { count: "exact", head: true })
            .eq("status", "active")
            .is("deleted_at", null)
        ),
        "Tenants em operacao",
        "success"
      ),
      metrica(
        "Trial",
        await contar(
          supabase
            .from("tenants")
            .select("id", { count: "exact", head: true })
            .eq("status", "trial")
            .is("deleted_at", null)
        ),
        "Clientes em teste",
        "warning"
      )
    ],
    registros: tenantRows.map((tenant) => {
      const owner = owners.get(tenant.owner_id);
      const licenca = licencas.get(tenant.id);
      return registro(
        tenant.id,
        tenant.name,
        owner?.email ?? "owner nao encontrado",
        `Licenca: ${licenca?.status ?? "sem licenca"}`,
        tenant.status,
        toneTenant(tenant.status)
      );
    })
  };
}

async function carregarHospedes(): Promise<SuperAdminModuloDados> {
  const supabase = await criarClienteSupabaseServer();
  const { data } = await supabase
    .from("reservation_guests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(LIMITE_REGISTROS)
    .returns<ReservationGuestRow[]>();

  return {
    titulo: "Hospedes",
    descricao: "Leitura global de hospedes registrados em reservas existentes.",
    estadoVazio: "Nenhum hospede registrado ainda.",
    metricas: [
      await metricaDeTabela("Hospedes", "reservation_guests", "Contatos em reservas", "info"),
      await metricaDeTabela("Reservas", "reservations", "Base operacional", "warning"),
      await metricaDeTabela("Tenants", "tenants", "Origem dos dados", "neutral")
    ],
    registros: (data ?? []).map((guest) =>
      registro(
        guest.id,
        guest.full_name,
        guest.email ?? "sem email",
        guest.phone ?? "sem telefone",
        guest.is_primary ? "principal" : "adicional",
        guest.is_primary ? "success" : "neutral"
      )
    )
  };
}

async function carregarPlanos(): Promise<SuperAdminModuloDados> {
  const supabase = await criarClienteSupabaseServer();
  const { data } = await supabase
    .from("plans")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(LIMITE_REGISTROS)
    .returns<PlanRow[]>();

  return {
    titulo: "Planos",
    descricao: "Catalogo comercial global usado por assinaturas e licencas.",
    estadoVazio: "Nenhum plano cadastrado.",
    metricas: [
      await metricaDeTabela("Planos", "plans", "Catalogo total", "info"),
      metrica(
        "Ativos",
        await contar(supabase.from("plans").select("id", { count: "exact", head: true }).eq("status", "active")),
        "Disponiveis comercialmente",
        "success"
      ),
      await metricaDeTabela("Licencas", "licenses", "Vinculos emitidos", "warning")
    ],
    registros: (data ?? []).map((plan) =>
      registro(
        plan.id,
        plan.name,
        `${formatarMoeda(plan.monthly_price)} / mes`,
        `${plan.max_properties} casas`,
        plan.status,
        toneStatusBasico(plan.status)
      )
    )
  };
}

async function carregarLicencas(): Promise<SuperAdminModuloDados> {
  const supabase = await criarClienteSupabaseServer();
  const { data } = await supabase
    .from("licenses")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(LIMITE_REGISTROS)
    .returns<LicenseRow[]>();
  const licencas = data ?? [];
  const tenants = await carregarTenantsPorId(licencas.map((licenca) => licenca.tenant_id));
  const owners = await carregarProfilesPorId(licencas.map((licenca) => licenca.owner_id));

  return {
    titulo: "Licencas",
    descricao: "Visao global de licencas por tenant, status e proprietario responsavel.",
    estadoVazio: "Nenhuma licenca emitida.",
    metricas: [
      await metricaDeTabela("Licencas", "licenses", "Total emitido", "info"),
      metrica(
        "Ativas",
        await contar(supabase.from("licenses").select("id", { count: "exact", head: true }).eq("status", "active")),
        "Operando agora",
        "success"
      ),
      metrica(
        "Suspensas",
        await contar(supabase.from("licenses").select("id", { count: "exact", head: true }).eq("status", "suspended")),
        "Exigem atencao",
        "danger"
      )
    ],
    registros: licencas.map((licenca) =>
      registro(
        licenca.id,
        tenants.get(licenca.tenant_id)?.name ?? "Tenant nao encontrado",
        owners.get(licenca.owner_id)?.email ?? "owner nao encontrado",
        licenca.expires_at ? `Expira em ${formatarData(licenca.expires_at)}` : "sem expiracao definida",
        licenca.status,
        toneLicenca(licenca.status)
      )
    )
  };
}

async function carregarFeatureFlags(): Promise<SuperAdminModuloDados> {
  const supabase = await criarClienteSupabaseServer();
  const { data } = await supabase
    .from("feature_flags")
    .select("*")
    .order("module", { ascending: true })
    .limit(LIMITE_REGISTROS)
    .returns<FeatureFlagRow[]>();
  const flags = data ?? [];
  const { data: tenantFeatures } = await supabase
    .from("tenant_features")
    .select("*")
    .returns<TenantFeatureRow[]>();

  return {
    titulo: "Feature Flags",
    descricao: "Controle global dos recursos preparados para ativacao por tenant.",
    estadoVazio: "Nenhuma feature flag cadastrada.",
    metricas: [
      await metricaDeTabela("Flags", "feature_flags", "Recursos globais", "info"),
      metricaValor(
        "Padrao ativo",
        flags.filter((flag) => flag.default_enabled).length,
        "Ativas por padrao",
        "success"
      ),
      metricaValor(
        "Overrides",
        tenantFeatures?.length ?? 0,
        "Configuracoes por tenant",
        "warning"
      )
    ],
    registros: flags.map((flag) =>
      registro(
        flag.id,
        flag.key,
        flag.module,
        flag.owner_configurable ? "Configuravel pelo proprietario" : "Somente plataforma",
        flag.default_enabled ? "ativa" : "desligada",
        flag.default_enabled ? "success" : "neutral"
      )
    )
  };
}

async function carregarAuditoria(): Promise<SuperAdminModuloDados> {
  return {
    titulo: "Auditoria",
    descricao: "Eventos globais registrados para rastreabilidade administrativa.",
    estadoVazio: "Nenhum evento de auditoria registrado.",
    metricas: [
      await metricaDeTabela("Eventos", "audit_logs", "Total registrado", "info"),
      await metricaDeTabela("Tenants", "tenants", "Possiveis escopos", "neutral"),
      await metricaDeTabela("Profiles", "profiles", "Atores possiveis", "success")
    ],
    registros: await carregarAuditoriaRecente()
  };
}

async function carregarConfiguracoes(): Promise<SuperAdminModuloDados> {
  return {
    titulo: "Configuracoes",
    descricao: "Base de configuracoes globais para seguranca, modulos e operacao da plataforma.",
    estadoVazio: "Nenhuma configuracao global persistida ainda.",
    metricas: [
      await metricaDeTabela("Permissoes", "permissions", "Catalogo de regras", "info"),
      await metricaDeTabela("Roles", "roles", "Papeis globais e por tenant", "neutral"),
      await metricaDeTabela("Flags", "feature_flags", "Modulos controlaveis", "warning")
    ],
    registros: [
      registro("auth", "Acesso Super Admin", "profiles.platform_role", "Validado no servidor", "ativo", "success"),
      registro("rls", "RLS multi-tenant", "app_private.is_super_admin()", "Visao global apenas por role", "ativo", "success"),
      registro("tenant", "Contexto global", "sem tenant operacional", "Nao mistura dados de proprietario", "global", "info")
    ]
  };
}

async function carregarAuditoriaRecente(): Promise<SuperAdminRegistro[]> {
  const supabase = await criarClienteSupabaseServer();
  const logs = await lerDadosSuperAdmin<AuditLogRow[]>(
    supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(LIMITE_REGISTROS)
      .returns<AuditLogRow[]>(),
    "auditoria recente do Super Admin",
    []
  );
  const tenants = await carregarTenantsPorId(logs.flatMap((log) => (log.tenant_id ? [log.tenant_id] : [])));
  const atores = await carregarProfilesPorId(logs.flatMap((log) => (log.actor_id ? [log.actor_id] : [])));

  return logs.map((log) =>
    registro(
      log.id,
      log.action,
      log.entity_table ?? "plataforma",
      `${atores.get(log.actor_id ?? "")?.email ?? "sistema"} - ${tenants.get(log.tenant_id ?? "")?.name ?? "global"}`,
      formatarData(log.created_at),
      "neutral"
    )
  );
}

async function metricaDeTabela(
  label: string,
  tabela: string,
  detalhe: string,
  tone: SuperAdminTone
) {
  const supabase = await criarClienteSupabaseServer();
  return metrica(
    label,
    await contar(supabase.from(tabela).select("id", { count: "exact", head: true })),
    detalhe,
    tone
  );
}

function metrica(
  label: string,
  resultado: ResultadoContagem,
  detalhe: string,
  tone: SuperAdminTone
): SuperAdminMetrica {
  if (resultado.error) {
    return metricaValor(label, 0, "Sem leitura no momento", "warning");
  }

  return metricaValor(label, resultado.count ?? 0, detalhe, tone);
}

function metricaValor(
  label: string,
  valor: number,
  detalhe: string,
  tone: SuperAdminTone
): SuperAdminMetrica {
  return { detalhe, label, tone, valor: Intl.NumberFormat("pt-BR").format(valor) };
}

function metricaTexto(
  label: string,
  valor: string,
  detalhe: string,
  tone: SuperAdminTone
): SuperAdminMetrica {
  return { detalhe, label, tone, valor };
}

function registro(
  id: string,
  titulo: string,
  detalhe: string,
  meta: string,
  status: string,
  statusTone: SuperAdminTone
): SuperAdminRegistro {
  return { detalhe, id, meta, status, statusTone, titulo };
}

async function contar(query: PromiseLike<ResultadoContagem>): Promise<ResultadoContagem> {
  const count = await contarSuperAdmin(query, "indicador global");
  return { count, error: null };
}

async function carregarProfilesPorId(ids: string[]) {
  const unicos = [...new Set(ids)].filter(Boolean);
  if (!unicos.length) return new Map<string, ProfileRow>();

  const supabase = await criarClienteSupabaseServer();
  const data = await lerDadosSuperAdmin<ProfileRow[]>(
    supabase.from("profiles").select("*").in("id", unicos).returns<ProfileRow[]>(),
    "profiles relacionados ao Super Admin",
    []
  );
  return new Map(data.map((profile) => [profile.id, profile]));
}

async function carregarTenantsPorId(ids: string[]) {
  const unicos = [...new Set(ids)].filter(Boolean);
  if (!unicos.length) return new Map<string, TenantRow>();

  const supabase = await criarClienteSupabaseServer();
  const data = await lerDadosSuperAdmin<TenantRow[]>(
    supabase.from("tenants").select("*").in("id", unicos).returns<TenantRow[]>(),
    "tenants relacionados ao Super Admin",
    []
  );
  return new Map(data.map((tenant) => [tenant.id, tenant]));
}

async function carregarLicencasPorTenant(ids: string[]) {
  const unicos = [...new Set(ids)].filter(Boolean);
  if (!unicos.length) return new Map<string, LicenseRow>();

  const supabase = await criarClienteSupabaseServer();
  const data = await lerDadosSuperAdmin<LicenseRow[]>(
    supabase.from("licenses").select("*").in("tenant_id", unicos).returns<LicenseRow[]>(),
    "licencas relacionadas ao Super Admin",
    []
  );
  return new Map(data.map((licenca) => [licenca.tenant_id, licenca]));
}

function toneTenant(status: TenantRow["status"]): SuperAdminTone {
  if (status === "active") return "success";
  if (status === "trial" || status === "past_due") return "warning";
  if (status === "suspended" || status === "cancelled") return "danger";
  return "neutral";
}

function toneLicenca(status: LicenseRow["status"]): SuperAdminTone {
  if (status === "active") return "success";
  if (status === "trial") return "warning";
  if (status === "expired" || status === "suspended" || status === "cancelled") {
    return "danger";
  }

  return "neutral";
}

function toneStatusBasico(status: string): SuperAdminTone {
  if (status === "active") return "success";
  if (status === "draft" || status === "trial") return "warning";
  if (status === "archived" || status === "cancelled") return "danger";
  return "neutral";
}

function formatarData(data: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(data));
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" }).format(valor);
}
