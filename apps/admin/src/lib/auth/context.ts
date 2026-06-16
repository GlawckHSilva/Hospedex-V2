import type {
  PermissionCode,
  ProfileRow,
  TenantMemberRow,
  TenantStatus,
  TenantRow,
  UserRole,
} from "@hospedex/types";
import { redirect } from "next/navigation";

import { supabaseEstaConfigurado } from "../supabase/env";
import { criarClienteSupabaseServer } from "../supabase/server";
import type { ContextoAutenticacao } from "./types";

const STATUS_TENANT_OPERACIONAL: TenantStatus[] = [
  "trial",
  "active",
  "past_due",
];
const TEMPO_LIMITE_CONTEXTO_MS = 10000;

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

  try {
    const supabase = await criarClienteSupabaseServer();
    const { data: dadosUsuario, error: erroUsuario } = await comTempoLimite(
      supabase.auth.getUser(),
      "Tempo limite ao carregar sessao autenticada.",
    );
    const userId = dadosUsuario.user?.id;
    if (erroUsuario || !userId) {
      if (erroUsuario)
        console.error(
          "Falha ao carregar sessao autenticada.",
          erroUsuario.message,
        );
      return null;
    }

    const { data: profile, error: erroProfile } = await comTempoLimite(
      supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle<ProfileRow>(),
      "Tempo limite ao carregar profile autenticado.",
    );

    if (erroProfile) {
      console.error(
        "Erro ao carregar profile autenticado.",
        erroProfile.message,
      );
    }

    if (!profile) {
      console.error("Profile nao encontrado para usuario autenticado.", userId);
      return null;
    }

    const { data: membershipsData, error: erroMemberships } =
      await comTempoLimite(
        supabase
          .from("tenant_members")
          .select("*")
          .eq("user_id", userId)
          .eq("status", "active")
          .returns<TenantMemberRow[]>(),
        "Tempo limite ao carregar vinculos do usuario.",
      );

    if (erroMemberships) {
      console.error(
        "Erro ao carregar vínculos do usuário.",
        erroMemberships.message,
      );
    }

    const memberships = membershipsData ?? [];
    const vinculoAtivo = memberships[0] ?? null;
    const { data: tenantProprio } = !vinculoAtivo
      ? await comTempoLimite(
          supabase
            .from("tenants")
            .select("*")
            .eq("owner_id", userId)
            .maybeSingle<TenantRow>(),
          "Tempo limite ao carregar tenant do proprietario.",
        )
      : { data: null };
    const tenantProprioOperacional = tenantEstaOperacional(tenantProprio)
      ? tenantProprio
      : null;
    const tenantId = vinculoAtivo?.tenant_id ?? tenantProprioOperacional?.id;

    const { data: tenant } =
      tenantId && !tenantProprioOperacional
        ? await comTempoLimite(
            supabase
              .from("tenants")
              .select("*")
              .eq("id", tenantId)
              .maybeSingle<TenantRow>(),
            "Tempo limite ao carregar tenant ativo.",
          )
        : { data: tenantProprioOperacional };

    // Tenant suspenso ou cancelado nao gera contexto operacional.
    // Isso permite bloquear o proprietario sem apagar usuario, historico ou licenca.
    const tenantOperacional = tenantEstaOperacional(tenant) ? tenant : null;
    const roleResolvida = resolverRole(
      profile,
      vinculoAtivo,
      tenantProprioOperacional,
    );
    const role =
      roleResolvida === "super_admin" || tenantOperacional
        ? roleResolvida
        : "guest";
    const permissions = await carregarPermissoes(
      vinculoAtivo?.role_id ?? null,
      role,
    );
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
      featureFlags,
    };
  } catch (erro) {
    console.error("Falha ao carregar contexto autenticado.", erro);
    return null;
  }
}

export async function exigirAutenticacao(): Promise<ContextoAutenticacao> {
  const contexto = await carregarContextoAutenticacao();
  if (!contexto) redirect("/login?message=Falha ao carregar sessao.");
  if (contexto.role === "guest")
    redirect("/sem-acesso?motivo=role-nao-vinculada");
  return contexto;
}

export async function exigirSuperAdmin(): Promise<ContextoAutenticacao> {
  const contexto = await exigirAutenticacao();
  if (contexto.role !== "super_admin")
    redirect("/sem-acesso?motivo=permissao-insuficiente");
  return contexto;
}

function resolverRole(
  profile: ProfileRow,
  membership: TenantMemberRow | null,
  ownedTenant: TenantRow | null,
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
  role: UserRole,
): Promise<PermissionCode[]> {
  if (role === "super_admin" || role === "guest" || !roleId) return [];

  const supabase = await criarClienteSupabaseServer();
  const { data } = await comTempoLimite(
    supabase
      .from("role_permissions")
      .select("permissions(code)")
      .eq("role_id", roleId)
      .returns<Array<{ permissions: { code: PermissionCode } | null }>>(),
    "Tempo limite ao carregar permissoes.",
  );

  return (data ?? []).flatMap((row) =>
    row.permissions?.code ? [row.permissions.code] : [],
  );
}

async function carregarFeatureFlags(
  tenantId: string,
): Promise<Record<string, boolean>> {
  const supabase = await criarClienteSupabaseServer();
  const { data: flagsData } = await comTempoLimite(
    supabase
      .from("feature_flags")
      .select("*")
      .returns<Array<{ id: string; key: string; default_enabled: boolean }>>(),
    "Tempo limite ao carregar feature flags.",
  );

  const { data: tenantFeaturesData } = await comTempoLimite(
    supabase
      .from("tenant_features")
      .select("*")
      .eq("tenant_id", tenantId)
      .returns<Array<{ feature_flag_id: string; enabled: boolean }>>(),
    "Tempo limite ao carregar feature flags do tenant.",
  );

  const flags = flagsData ?? [];
  const tenantFeatures = tenantFeaturesData ?? [];

  return Object.fromEntries(
    flags.map((flag) => [
      flag.key,
      tenantFeatures.find(
        (tenantFeature) => tenantFeature.feature_flag_id === flag.id,
      )?.enabled ?? flag.default_enabled,
    ]),
  );
}

function comTempoLimite<T>(
  consulta: PromiseLike<T>,
  mensagem: string,
): Promise<T> {
  // Evita loading infinito quando Supabase, rede ou RLS travam uma consulta do contexto.
  const timeout = new Promise<never>((_, rejeitar) => {
    globalThis.setTimeout(
      () => rejeitar(new Error(mensagem)),
      TEMPO_LIMITE_CONTEXTO_MS,
    );
  });

  return Promise.race([consulta, timeout]);
}
