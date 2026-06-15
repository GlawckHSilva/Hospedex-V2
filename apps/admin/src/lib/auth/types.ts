import type {
  PermissionCode,
  ProfileRow,
  TenantMemberRow,
  TenantRow,
  UserRole
} from "@hospedex/types";

/**
 * Representa o contexto autenticado do Admin.
 *
 * Mantemos tenant, usuário, papel, permissões e feature flags em um único contrato
 * para que rotas futuras não espalhem regras multi-tenant pela interface.
 */
export type ContextoAutenticacao = {
  userId: string;
  profile: ProfileRow;
  tenant: TenantRow | null;
  role: UserRole;
  memberships: TenantMemberRow[];
  permissions: PermissionCode[];
  featureFlags: Record<string, boolean>;
};
