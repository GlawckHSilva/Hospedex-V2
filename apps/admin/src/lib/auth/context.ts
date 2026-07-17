import type {
  LicenseRow,
  PermissionCode,
  PlanFeatureRow,
  SubscriptionRow,
  TenantStatus,
  UserRole,
} from "@hospedex/types";
import { redirect } from "next/navigation";
import { cache } from "react";

import { supabaseEstaConfigurado } from "../supabase/env";
import { criarClienteSupabaseServer } from "../supabase/server";
import type {
  ContextoAutenticacao,
  PerfilContextoAutenticacao,
  TenantContextoAutenticacao,
  VinculoContextoAutenticacao,
} from "./types";

const STATUS_TENANT_COM_ACESSO_GERENCIAMENTO: TenantStatus[] = [
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

async function carregarContextoAutenticacaoSemCache(): Promise<ContextoAutenticacao | null> {
  if (!supabaseEstaConfigurado()) return null;

  try {
    const supabase = await criarClienteSupabaseServer();
    const { data: dadosUsuario, error: erroUsuario } = await comTempoLimite(
      supabase.auth.getUser(),
      "Tempo limite ao carregar sessao autenticada.",
    );
    const userId = dadosUsuario.user?.id;
    if (erroUsuario || !userId) {
      if (erroUsuario && !erroEhSessaoAusente(erroUsuario.message))
        console.error(
          "Falha ao carregar sessao autenticada.",
          erroUsuario.message,
        );
      return null;
    }

    const [profileResultado, membershipsResultado] = await Promise.all([
      comTempoLimite(
        supabase
          .from("profiles")
          .select("id,email,full_name,avatar_url,platform_role")
          .eq("id", userId)
          .maybeSingle<PerfilContextoAutenticacao>(),
        "Tempo limite ao carregar profile autenticado.",
      ),
      comTempoLimite(
        supabase
          .from("tenant_members")
          .select("id,tenant_id,user_id,role_id,member_role,status,property_scope")
          .eq("user_id", userId)
          .eq("status", "active")
          .returns<VinculoContextoAutenticacao[]>(),
        "Tempo limite ao carregar vinculos do usuario.",
      ),
    ]);
    const { data: profile, error: erroProfile } = profileResultado;

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

    const { data: membershipsData, error: erroMemberships } = membershipsResultado;

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
            .select("id,owner_id,name,status,deleted_at")
            .eq("owner_id", userId)
            .maybeSingle<TenantContextoAutenticacao>(),
          "Tempo limite ao carregar tenant do proprietario.",
        )
      : { data: null };
    const tenantProprioAcessivel = tenantPermiteAcessoGerenciamento(tenantProprio)
      ? tenantProprio
      : null;
    const tenantId = vinculoAtivo?.tenant_id ?? tenantProprioAcessivel?.id;

    const { data: tenant } =
      tenantId && !tenantProprioAcessivel
        ? await comTempoLimite(
            supabase
              .from("tenants")
              .select("id,owner_id,name,status,deleted_at")
              .eq("id", tenantId)
              .maybeSingle<TenantContextoAutenticacao>(),
            "Tempo limite ao carregar tenant ativo.",
          )
        : { data: tenantProprioAcessivel };

    // Licenca vencida nao apaga contexto: ela apenas torna o Gerenciamento
    // somente leitura. Quem bloqueia novas acoes e a camada de license-state.
    // Aqui negamos acesso apenas para tenant inexistente, deletado ou bloqueado.
    const tenantAcessivel = tenantPermiteAcessoGerenciamento(tenant)
      ? tenant
      : null;
    const roleResolvida = resolverRole(
      profile,
      vinculoAtivo,
      tenantProprioAcessivel,
    );
    const role =
      roleResolvida === "super_admin" || tenantAcessivel
        ? roleResolvida
        : "guest";
    const [permissions, featureFlags] = await Promise.all([
      carregarPermissoes(vinculoAtivo?.role_id ?? null, role),
      tenantAcessivel ? carregarFeatureFlags(tenantAcessivel) : {},
    ]);

    return {
      userId,
      profile,
      tenant: tenantAcessivel,
      role,
      memberships,
      permissions,
      featureFlags,
    };
  } catch (erro) {
    if (erroEhDinamicoDoNext(erro)) throw erro;

    console.error("Falha ao carregar contexto autenticado.", erro);
    return null;
  }
}

// Layout e pagina podem validar o mesmo usuario na mesma renderizacao.
// O cache por requisicao evita repetir consultas sem compartilhar sessoes entre usuarios.
export const carregarContextoAutenticacao = cache(carregarContextoAutenticacaoSemCache);

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
  profile: PerfilContextoAutenticacao,
  membership: VinculoContextoAutenticacao | null,
  ownedTenant: TenantContextoAutenticacao | null,
): UserRole {
  if (profile.platform_role === "super_admin") return "super_admin";
  if (ownedTenant) return "owner";
  if (membership?.member_role === "owner") return "owner";
  if (membership?.member_role === "staff") return "staff";
  return "guest";
}

function tenantPermiteAcessoGerenciamento(
  tenant: TenantContextoAutenticacao | null,
): tenant is TenantContextoAutenticacao {
  return Boolean(
    tenant &&
      !tenant.deleted_at &&
      STATUS_TENANT_COM_ACESSO_GERENCIAMENTO.includes(tenant.status),
  );
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
  tenant: TenantContextoAutenticacao,
): Promise<Record<string, boolean>> {
  const supabase = await criarClienteSupabaseServer();
  const [{ data: flagsData }, { data: tenantFeaturesData }, { data: assinatura }, { data: licenca }] =
    await Promise.all([
      comTempoLimite(
        supabase
          .from("feature_flags")
          .select("id,key,default_enabled")
          .returns<Array<{ id: string; key: string; default_enabled: boolean }>>(),
        "Tempo limite ao carregar feature flags.",
      ),
      comTempoLimite(
        supabase
          .from("tenant_features")
          .select("feature_flag_id,enabled")
          .eq("tenant_id", tenant.id)
          .returns<Array<{ feature_flag_id: string; enabled: boolean }>>(),
        "Tempo limite ao carregar feature flags do tenant.",
      ),
      comTempoLimite(
        supabase
          .from("subscriptions")
          .select("plan_id,status")
          .eq("tenant_id", tenant.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle<Pick<SubscriptionRow, "plan_id" | "status">>(),
        "Tempo limite ao carregar assinatura do tenant.",
      ),
      comTempoLimite(
        supabase
          .from("licenses")
          .select("status,expires_at")
          .eq("tenant_id", tenant.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle<Pick<LicenseRow, "status" | "expires_at">>(),
        "Tempo limite ao carregar licenca do tenant.",
      ),
    ]);

  const flags = flagsData ?? [];
  const tenantFeatures = tenantFeaturesData ?? [];
  const { data: planFeaturesData } = assinatura?.plan_id
    ? await comTempoLimite(
        supabase
          .from("plan_features")
          .select("feature_flag_id,enabled")
          .eq("plan_id", assinatura.plan_id)
          .returns<Array<Pick<PlanFeatureRow, "feature_flag_id" | "enabled">>>(),
        "Tempo limite ao carregar modulos do plano.",
      )
    : { data: null };
  const planFeatures = planFeaturesData ?? [];
  const trialAtivo = tenantEstaEmTrialAtivo(tenant, licenca, assinatura);

  return Object.fromEntries(
    flags.map((flag) => {
      // O trial entrega a experiencia completa; fora dele, o override do tenant
      // prevalece sobre o plano e permite ao Super Admin liberar extras ou bloquear modulos.
      if (trialAtivo) return [flag.key, true];

      const overrideTenant = tenantFeatures.find(
        (tenantFeature) => tenantFeature.feature_flag_id === flag.id,
      );
      const recursoPlano = planFeatures.find(
        (planFeature) => planFeature.feature_flag_id === flag.id,
      );

      return [
        flag.key,
        overrideTenant?.enabled ?? recursoPlano?.enabled ?? flag.default_enabled,
      ];
    }),
  );
}

function tenantEstaEmTrialAtivo(
  tenant: TenantContextoAutenticacao,
  licenca: Pick<LicenseRow, "status" | "expires_at"> | null,
  assinatura: Pick<SubscriptionRow, "status"> | null,
): boolean {
  const possuiTrial =
    tenant.status === "trial" ||
    licenca?.status === "trial" ||
    assinatura?.status === "trialing";

  // O vencimento encerra o acesso amplo do trial; a tolerancia da licenca
  // continua sendo calculada separadamente e nunca libera modulos pagos.
  return Boolean(
    possuiTrial && licenca?.expires_at && licenca.expires_at >= dataLocalHoje(),
  );
}

function dataLocalHoje(): string {
  return new Date().toISOString().slice(0, 10);
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

function erroEhDinamicoDoNext(erro: unknown): boolean {
  // O Next usa esta excecao internamente para promover rotas com cookies para SSR.
  // Nao podemos capturar isso como erro de auth, senao o build registra falso alerta.
  const digest =
    typeof erro === "object" && erro && "digest" in erro
      ? String((erro as { digest?: unknown }).digest)
      : "";
  const mensagem = erro instanceof Error ? erro.message : "";

  return (
    digest.includes("DYNAMIC_SERVER_USAGE") ||
    mensagem.includes("Dynamic server usage")
  );
}

function erroEhSessaoAusente(mensagem: string): boolean {
  // Visitantes anonimos acessam /login sem cookie; isso nao e falha operacional.
  return mensagem.includes("Auth session missing");
}
