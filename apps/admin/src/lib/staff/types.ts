import type {
  PermissionCode,
  PermissionRow,
  ProfileRow,
  RoleRow,
  StaffInviteRow,
  TenantMemberRow
} from "@hospedex/types";

export type CargoComPermissoes = {
  permissaoIds: string[];
  permissoes: PermissionCode[];
  role: RoleRow;
};

export type FuncionarioRegistro = {
  cargo: CargoComPermissoes | null;
  convite: StaffInviteRow | null;
  email: string;
  id: string;
  member: TenantMemberRow | null;
  nome: string;
  perfil: ProfileRow | null;
  status: "accepted" | "active" | "disabled" | "invited" | "pending" | "cancelled" | "expired";
  telefone: string | null;
};

export type FiltrosFuncionarios = {
  busca: string;
};

export type DadosModuloFuncionarios = {
  cargos: CargoComPermissoes[];
  filtros: FiltrosFuncionarios;
  funcionarios: FuncionarioRegistro[];
  permissoes: PermissionRow[];
  podeGerenciar: boolean;
};
