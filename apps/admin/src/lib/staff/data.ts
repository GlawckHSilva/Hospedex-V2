import type {
  PermissionCode,
  PermissionRow,
  ProfileRow,
  RolePermissionRow,
  RoleRow,
  StaffInviteRow,
  TenantMemberRow
} from "@hospedex/types";

import { criarClienteSupabaseServer } from "../supabase/server";
import { CARGOS_INICIAIS, PERMISSOES_MODULO } from "./catalog";
import type {
  CargoComPermissoes,
  DadosModuloFuncionarios,
  FiltrosFuncionarios,
  FuncionarioRegistro
} from "./types";

type SupabaseServer = Awaited<ReturnType<typeof criarClienteSupabaseServer>>;

export async function carregarDadosFuncionarios(
  tenantId: string,
  params: Record<string, string | string[] | undefined>
): Promise<DadosModuloFuncionarios> {
  const supabase = await criarClienteSupabaseServer();
  await garantirCargosIniciais(supabase, tenantId);

  const filtros = normalizarFiltros(params);
  const [roles, permissoes, rolePermissions, members, convites] = await Promise.all([
    carregarRoles(supabase, tenantId),
    carregarPermissoes(supabase),
    carregarRolePermissions(supabase, tenantId),
    carregarMembers(supabase, tenantId),
    carregarConvites(supabase, tenantId)
  ]);

  const profiles = await carregarProfiles(supabase, members.map((member) => member.user_id));
  const cargos = montarCargos(roles, permissoes, rolePermissions);
  const funcionarios = montarFuncionarios(members, convites, profiles, cargos).filter((registro) =>
    filtrarBusca(registro, filtros.busca)
  );

  return {
    cargos,
    filtros,
    funcionarios,
    permissoes
  };
}

export async function garantirCargosIniciais(supabase: SupabaseServer, tenantId: string) {
  const permissoes = await carregarPermissoes(supabase);
  const permissaoPorCodigo = new Map(permissoes.map((permissao) => [permissao.code, permissao]));

  const { data: roles, error } = await supabase
    .from("roles")
    .upsert(
      CARGOS_INICIAIS.map((cargo) => ({
        code: cargo.code,
        description: cargo.description,
        is_system: true,
        name: cargo.name,
        tenant_id: tenantId
      })),
      { onConflict: "tenant_id,code" }
    )
    .select("*")
    .returns<RoleRow[]>();

  if (error) {
    console.error("Erro ao garantir cargos iniciais.", error.message);
    return;
  }

  const linhas = (roles ?? []).flatMap((role) => {
    const cargo = CARGOS_INICIAIS.find((item) => item.code === role.code);
    if (!cargo) return [];

    return cargo.permissoes.flatMap((codigo) => {
      const permissao = permissaoPorCodigo.get(codigo);
      return permissao ? [{ permission_id: permissao.id, role_id: role.id }] : [];
    });
  });

  if (!linhas.length) return;

  const { error: erroPermissoes } = await supabase
    .from("role_permissions")
    .upsert(linhas, { onConflict: "role_id,permission_id" });

  if (erroPermissoes) {
    console.error("Erro ao vincular permissoes iniciais.", erroPermissoes.message);
  }
}

async function carregarRoles(supabase: SupabaseServer, tenantId: string) {
  const { data, error } = await supabase
    .from("roles")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("is_system", { ascending: false })
    .order("name", { ascending: true })
    .returns<RoleRow[]>();

  if (error) console.error("Erro ao carregar cargos.", error.message);
  return data ?? [];
}

async function carregarPermissoes(supabase: SupabaseServer) {
  const codigos = PERMISSOES_MODULO.map((permissao) => permissao.code);
  const { data, error } = await supabase
    .from("permissions")
    .select("*")
    .in("code", codigos)
    .order("module", { ascending: true })
    .returns<PermissionRow[]>();

  if (error) console.error("Erro ao carregar permissoes.", error.message);
  return data ?? [];
}

async function carregarRolePermissions(supabase: SupabaseServer, tenantId: string) {
  const roles = await carregarRoles(supabase, tenantId);
  if (!roles.length) return [];

  const { data, error } = await supabase
    .from("role_permissions")
    .select("*")
    .in(
      "role_id",
      roles.map((role) => role.id)
    )
    .returns<RolePermissionRow[]>();

  if (error) console.error("Erro ao carregar permissoes dos cargos.", error.message);
  return data ?? [];
}

async function carregarMembers(supabase: SupabaseServer, tenantId: string) {
  const { data, error } = await supabase
    .from("tenant_members")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("member_role", "staff")
    .order("created_at", { ascending: false })
    .returns<TenantMemberRow[]>();

  if (error) console.error("Erro ao carregar funcionarios.", error.message);
  return data ?? [];
}

async function carregarConvites(supabase: SupabaseServer, tenantId: string) {
  const { data, error } = await supabase
    .from("staff_invites")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .returns<StaffInviteRow[]>();

  if (error) console.error("Erro ao carregar convites.", error.message);
  return data ?? [];
}

async function carregarProfiles(supabase: SupabaseServer, ids: string[]) {
  const unicos = [...new Set(ids)].filter(Boolean);
  if (!unicos.length) return new Map<string, ProfileRow>();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .in("id", unicos)
    .returns<ProfileRow[]>();

  if (error) console.error("Erro ao carregar profiles dos funcionarios.", error.message);
  return new Map((data ?? []).map((profile) => [profile.id, profile]));
}

function montarCargos(
  roles: RoleRow[],
  permissoes: PermissionRow[],
  rolePermissions: RolePermissionRow[]
): CargoComPermissoes[] {
  const permissaoPorId = new Map(permissoes.map((permissao) => [permissao.id, permissao]));

  return roles.map((role) => {
    const permissaoIds = rolePermissions
      .filter((rolePermission) => rolePermission.role_id === role.id)
      .map((rolePermission) => rolePermission.permission_id);

    return {
      permissaoIds,
      permissoes: permissaoIds.flatMap((id) => {
        const permissao = permissaoPorId.get(id);
        return permissao ? [permissao.code as PermissionCode] : [];
      }),
      role
    };
  });
}

function montarFuncionarios(
  members: TenantMemberRow[],
  convites: StaffInviteRow[],
  profiles: Map<string, ProfileRow>,
  cargos: CargoComPermissoes[]
): FuncionarioRegistro[] {
  const cargoPorId = new Map(cargos.map((cargo) => [cargo.role.id, cargo]));
  const registrosMember = members.map((member) => {
    const perfil = profiles.get(member.user_id) ?? null;
    const convite = convites.find((item) => item.invited_user_id === member.user_id) ?? null;

    return {
      cargo: member.role_id ? cargoPorId.get(member.role_id) ?? null : null,
      convite,
      email: perfil?.email ?? convite?.email ?? "sem-email",
      id: member.id,
      member,
      nome: perfil?.full_name ?? convite?.full_name ?? "Funcionario sem nome",
      perfil,
      status: member.status,
      telefone: perfil?.phone ?? convite?.phone ?? null
    } satisfies FuncionarioRegistro;
  });

  const idsVinculados = new Set(registrosMember.flatMap((registro) => registro.convite?.id ?? []));
  const registrosConvites = convites
    .filter((convite) => !idsVinculados.has(convite.id))
    .map((convite) => ({
      cargo: convite.role_id ? cargoPorId.get(convite.role_id) ?? null : null,
      convite,
      email: convite.email,
      id: convite.id,
      member: null,
      nome: convite.full_name,
      perfil: null,
      status: convite.status,
      telefone: convite.phone
    }) satisfies FuncionarioRegistro);

  return [...registrosMember, ...registrosConvites];
}

function normalizarFiltros(
  params: Record<string, string | string[] | undefined>
): FiltrosFuncionarios {
  return {
    busca: lerParametro(params, "busca")
  };
}

function filtrarBusca(registro: FuncionarioRegistro, busca: string) {
  if (!busca) return true;
  const alvo = [registro.nome, registro.email, registro.cargo?.role.name]
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
