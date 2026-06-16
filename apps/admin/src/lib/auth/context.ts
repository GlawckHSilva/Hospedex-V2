import type {
  PermissionCode,
  ProfileRow,
  TenantMemberRow,
  TenantStatus,
  TenantRow,
  UserRole
} from "@hospedex/types";
import { redirect } from "next/navigation";

import { supabaseEstaConfigurado } from "../supabase/env";
import { criarClienteSupabaseServer } from "../supabase/server";
import type { ContextoAutenticacao } from "./types";

const STATUS_TENANT_OPERACIONAL: TenantStatus[] = ["trial", "active", "past_due"];

/**
 * Carrega o contexto administrativo no servidor.
 *
 * As permissões e feature flags vêm do banco, não do metadata do usuário, porque
 * metadata editável não pode ser fonte de autorização em um SaaS multi-tenant.
 */
export function obterCaminhoInicialPorRole(role: UserRole): string {
  if (role === "super_admin") return "/super-admin";
  if (role === "owner" || role === "staff") return "/";
  return "/sem-acesso";
}

export async function carregarContextoAutenticacao(): Promise<ContextoAutenticacao | null> {
  if (!supabaseEstaConfigurado()) return null;

  const supabase = await criarClienteSupabaseServer();
  const { data: dadosUsuario, error: erroUsuario } = await supabase.auth.getUser();
  const userId = dadosUsuario.user?.id;
  if (erroUsuario || !userId) return null;
  if (!userId) return null;

  const { data: profile, error: erroProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle<ProfileRow>();

  if (erroProfile) {
    console.error("Erro ao carregar profile autenticado.", erroProfile.message);
  }

  if (!profile) return null;

  const { data: membershipsData, error: erroMemberships } = await supabase
    .from("tenant_members")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .returns<TenantMemberRow[]>();

  if (erroMemberships) {
    console.error("Erro ao carregar vínculos do usuário.", erroMemberships.message);
  }

  const memberships = membershipsData ?? [];
  const vinculoAtivo = memberships[0] ?? null;
  const { data: tenantProprio } = !vinculoAtivo
    ? await supabase.from("tenants").select("*").eq("owner_id", userId).maybeSingle<TenantRow>()
    : { data: null };
  const tenantProprioOperacional = tenantEstaOperacional(tenantProprio) ? tenantProprio : null;
  const tenantId = vinculoAtivo?.tenant_id ?? tenantProprioOperacional?.id;

  const { data: tenant } =
    tenantId && !tenantProprioOperacional
      ? await supabase.from("tenants").select("*").eq("id", tenantId).maybeSingle<TenantRow>()
      : { data: tenantProprioOperacional };

  // Tenant suspenso ou cancelado nao gera contexto operacional.
  // Isso permite bloquear o proprietario sem apagar usuario, historico ou licenca.
  const tenantOperacional = tenantEstaOperacional(tenant) ? tenant : null;
  const roleResolvida = resolverRole(profile, vinculoAtivo, tenantProprioOperacional);
  const role =
    roleResolvida === "super_admin" || tenantOperacional ? roleResolvida : "guest";
  const permissions = await carregarPermissoes(vinculoAtivo?.role_id ?? null, role);
  const featureFlags = tenantOperacional?.id
    ? await carregarFeatureFlags(tenantOperacional.id)
    : {};

  return {
    userId,
    profile,
    tenant: tenantOperacional,
    role,
    memberships,
    permissions,
    featureFlags
  };
}

export async function exigirAutenticacao(): Promise<ContextoAutenticacao> {
  const contexto = await carregarContextoAutenticacao();
  if (!contexto) redirect("/login");
  if (contexto.role === "guest") redirect("/sem-acesso");
  return contexto;
}

export async function exigirSuperAdmin(): Promise<ContextoAutenticacao> {
  const contexto = await exigirAutenticacao();
  if (contexto.role !== "super_admin") redirect("/");
  return contexto;
}

function resolverRole(
  profile: ProfileRow,
  membership: TenantMemberRow | null,
  ownedTenant: TenantRow | null
): UserRole {
  if (profile.platform_role === "super_admin") return "super_admin";
  if (ownedTenant) return "owner";
  if (membership?.member_role === "owner") return "owner";
  if (membership?.member_role === "staff") return "staff";
  return "guest";
}

function tenantEstaOperacional(tenant: TenantRow | null): tenant is TenantRow {
  return Boolean(tenant && STATUS_TENANT_OPERACIONAL.includes(tenant.status));
}

async function carregarPermissoes(
  roleId: string | null,
  role: UserRole
): Promise<PermissionCode[]> {
  if (role === "super_admin" || role === "guest" || !roleId) return [];

  const supabase = await criarClienteSupabaseServer();
  const { data } = await supabase
    .from("role_permissions")
    .select("permissions(code)")
    .eq("role_id", roleId)
    .returns<Array<{ permissions: { code: PermissionCode } | null }>>();

  return (data ?? []).flatMap((row) =>
    row.permissions?.code ? [row.permissions.code] : []
  );
}

async function carregarFeatureFlags(tenantId: string): Promise<Record<string, boolean>> {
  const supabase = await criarClienteSupabaseServer();
  const { data: flagsData } = await supabase
    .from("feature_flags")
    .select("*")
    .returns<Array<{ id: string; key: string; default_enabled: boolean }>>();

  const { data: tenantFeaturesData } = await supabase
    .from("tenant_features")
    .select("*")
    .eq("tenant_id", tenantId)
    .returns<Array<{ feature_flag_id: string; enabled: boolean }>>();

  const flags = flagsData ?? [];
  const tenantFeatures = tenantFeaturesData ?? [];

  return Object.fromEntries(
    flags.map((flag) => [
      flag.key,
      tenantFeatures.find((tenantFeature) => tenantFeature.feature_flag_id === flag.id)
        ?.enabled ?? flag.default_enabled
    ])
  );
}
