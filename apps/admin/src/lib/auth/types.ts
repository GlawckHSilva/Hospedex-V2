import type {
  PermissionCode,
  ProfileRow,
  TenantMemberRow,
  TenantRow,
  UserRole
} from "@hospedex/types";

export type PerfilContextoAutenticacao = Pick<
  ProfileRow,
  "avatar_url" | "email" | "full_name" | "id" | "platform_role"
>;

export type TenantContextoAutenticacao = Pick<
  TenantRow,
  "deleted_at" | "id" | "name" | "owner_id" | "status"
>;

export type VinculoContextoAutenticacao = Pick<
  TenantMemberRow,
  "id" | "member_role" | "property_scope" | "role_id" | "status" | "tenant_id" | "user_id"
>;

/**
 * Representa o contexto autenticado do Admin.
 *
 * Mantemos tenant, usuário, papel, permissões e feature flags em um único contrato
 * para que rotas futuras não espalhem regras multi-tenant pela interface.
 */
export type ContextoAutenticacao = {
  userId: string;
  profile: PerfilContextoAutenticacao;
  tenant: TenantContextoAutenticacao | null;
  role: UserRole;
  memberships: VinculoContextoAutenticacao[];
  permissions: PermissionCode[];
  featureFlags: Record<string, boolean>;
};
