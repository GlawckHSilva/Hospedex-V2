"use server";

import { createHash, randomBytes } from "node:crypto";

import type { PermissionCode, RoleRow, StaffInviteRow, TenantMemberRow } from "@hospedex/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirLicencaPermiteAcoesTenant } from "../license-state";
import { criarClienteSupabaseServer } from "../supabase/server";
import { exigirGestaoFuncionarios } from "./access";
import { PERMISSOES_MODULO } from "./catalog";

const CAMINHO_FUNCIONARIOS = "/funcionarios";

type SupabaseServer = Awaited<ReturnType<typeof criarClienteSupabaseServer>>;

export async function criarFuncionarioAction(formData: FormData) {
  const contexto = await exigirGestaoFuncionarios();
  const tenantId = contexto.tenant?.id;
  if (!tenantId) redirect("/sem-acesso?motivo=tenant-ausente");

  const supabase = await criarClienteSupabaseServer();
  const entrada = obterEntradaFuncionario(formData);

  try {
    await exigirLicencaPermiteAcoesTenant(tenantId);
    const role = await carregarCargo(supabase, tenantId, entrada.roleId);
    await salvarConvite(supabase, tenantId, null, role.id, contexto.userId, entrada);
    await registrarAuditoria(supabase, contexto.userId, tenantId, null, "staff.invited");
    revalidarModulo();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao criar funcionario.");
  }

  redirect(`${CAMINHO_FUNCIONARIOS}?sucesso=funcionario-criado`);
}

export async function atualizarFuncionarioAction(formData: FormData) {
  const contexto = await exigirGestaoFuncionarios();
  const tenantId = contexto.tenant?.id;
  if (!tenantId) redirect("/sem-acesso?motivo=tenant-ausente");

  const supabase = await criarClienteSupabaseServer();
  const memberId = textoOpcional(formData, "memberId");
  const conviteId = textoOpcional(formData, "conviteId");
  const entrada = obterEntradaFuncionario(formData);

  try {
    const role = await carregarCargo(supabase, tenantId, entrada.roleId);

    if (memberId) {
      const member = await carregarMember(supabase, tenantId, memberId);
      await supabase
        .from("profiles")
        .update({ full_name: entrada.nome, phone: entrada.telefone })
        .eq("id", member.user_id);
      await supabase.from("tenant_members").update({ role_id: role.id }).eq("id", member.id);
      await registrarAuditoria(supabase, contexto.userId, tenantId, member.user_id, "staff.updated");
    }

    if (conviteId) {
      await atualizarConvite(supabase, tenantId, conviteId, entrada, role.id);
    }

    revalidarModulo();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao atualizar funcionario.");
  }

  redirect(`${CAMINHO_FUNCIONARIOS}?sucesso=funcionario-atualizado`);
}

export async function alterarStatusFuncionarioAction(formData: FormData) {
  const contexto = await exigirGestaoFuncionarios();
  const tenantId = contexto.tenant?.id;
  if (!tenantId) redirect("/sem-acesso?motivo=tenant-ausente");

  const supabase = await criarClienteSupabaseServer();
  const memberId = textoObrigatorio(formData, "memberId", "funcionario");
  const acao = textoObrigatorio(formData, "acao", "acao");
  const status = acao === "ativar" ? "active" : "disabled";

  try {
    const member = await carregarMember(supabase, tenantId, memberId);
    await supabase.from("tenant_members").update({ status }).eq("id", member.id);
    await registrarAuditoria(supabase, contexto.userId, tenantId, member.user_id, `staff.${acao}`);
    revalidarModulo();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao alterar status do funcionario.");
  }

  redirect(`${CAMINHO_FUNCIONARIOS}?sucesso=status-atualizado`);
}

export async function excluirFuncionarioAction(formData: FormData) {
  const contexto = await exigirGestaoFuncionarios();
  const tenantId = contexto.tenant?.id;
  if (!tenantId) redirect("/sem-acesso?motivo=tenant-ausente");

  const supabase = await criarClienteSupabaseServer();
  const memberId = textoOpcional(formData, "memberId");
  const conviteId = textoOpcional(formData, "conviteId");
  const confirmado = formData.get("confirmar") === "on";
  if (!confirmado) {
    redirect(`${CAMINHO_FUNCIONARIOS}?erro=${encodeURIComponent("Confirme a exclusao.")}`);
  }

  try {
    if (memberId) {
      const member = await carregarMember(supabase, tenantId, memberId);
      await supabase.from("tenant_members").delete().eq("id", member.id);
      await registrarAuditoria(supabase, contexto.userId, tenantId, member.user_id, "staff.deleted");
    }

    if (conviteId) {
      await cancelarConvite(supabase, tenantId, conviteId);
    }

    revalidarModulo();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao excluir funcionario.");
  }

  redirect(`${CAMINHO_FUNCIONARIOS}?sucesso=funcionario-excluido`);
}

export async function reenviarConviteAction(formData: FormData) {
  const contexto = await exigirGestaoFuncionarios();
  const tenantId = contexto.tenant?.id;
  if (!tenantId) redirect("/sem-acesso?motivo=tenant-ausente");

  const supabase = await criarClienteSupabaseServer();
  const conviteId = textoObrigatorio(formData, "conviteId", "convite");

  try {
    const convite = await carregarConvite(supabase, tenantId, conviteId);
    await supabase
      .from("staff_invites")
      .update({
        expires_at: expirarEmSeteDias(),
        last_sent_at: new Date().toISOString(),
        sent_count: convite.sent_count + 1,
        status: "pending",
        token_hash: gerarTokenHash()
      })
      .eq("id", convite.id);
    await registrarAuditoria(supabase, contexto.userId, tenantId, convite.invited_user_id, "staff.invite.resent");
    revalidarModulo();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao reenviar convite.");
  }

  redirect(`${CAMINHO_FUNCIONARIOS}?sucesso=convite-reenviado`);
}

export async function criarCargoAction(formData: FormData) {
  const contexto = await exigirGestaoFuncionarios();
  const tenantId = contexto.tenant?.id;
  if (!tenantId) redirect("/sem-acesso?motivo=tenant-ausente");

  const supabase = await criarClienteSupabaseServer();
  const nome = textoObrigatorio(formData, "nomeCargo", "nome do cargo");
  const permissoes = obterPermissoesSelecionadas(formData);

  try {
    const { data, error } = await supabase
      .from("roles")
      .insert({
        code: gerarCodigo(nome),
        description: textoOpcional(formData, "descricaoCargo"),
        is_system: false,
        name: nome,
        tenant_id: tenantId
      })
      .select("*")
      .single<RoleRow>();

    if (error || !data) throw new Error(error?.message ?? "Cargo nao criado.");

    await salvarPermissoesCargo(supabase, data.id, permissoes);
    revalidarModulo();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao criar cargo.");
  }

  redirect(`${CAMINHO_FUNCIONARIOS}?sucesso=cargo-criado`);
}

export async function atualizarCargoPermissoesAction(formData: FormData) {
  await exigirGestaoFuncionarios();
  const supabase = await criarClienteSupabaseServer();
  const roleId = textoObrigatorio(formData, "roleId", "cargo");
  const permissoes = obterPermissoesSelecionadas(formData);

  try {
    await salvarPermissoesCargo(supabase, roleId, permissoes);
    revalidarModulo();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao atualizar permissoes do cargo.");
  }

  redirect(`${CAMINHO_FUNCIONARIOS}?sucesso=permissoes-atualizadas`);
}

async function carregarCargo(supabase: SupabaseServer, tenantId: string, roleId: string): Promise<RoleRow> {
  const { data, error } = await supabase
    .from("roles")
    .select("*")
    .eq("id", roleId)
    .eq("tenant_id", tenantId)
    .maybeSingle<RoleRow>();

  if (error || !data) throw new ErroRegraFuncionario("Cargo nao encontrado.");
  return data;
}

async function carregarMember(
  supabase: SupabaseServer,
  tenantId: string,
  memberId: string
): Promise<TenantMemberRow> {
  const { data, error } = await supabase
    .from("tenant_members")
    .select("*")
    .eq("id", memberId)
    .eq("tenant_id", tenantId)
    .eq("member_role", "staff")
    .maybeSingle<TenantMemberRow>();

  if (error || !data) throw new ErroRegraFuncionario("Funcionario nao encontrado.");
  return data;
}

async function carregarConvite(
  supabase: SupabaseServer,
  tenantId: string,
  conviteId: string
): Promise<StaffInviteRow> {
  const { data, error } = await supabase
    .from("staff_invites")
    .select("*")
    .eq("id", conviteId)
    .eq("tenant_id", tenantId)
    .maybeSingle<StaffInviteRow>();

  if (error || !data) throw new ErroRegraFuncionario("Convite nao encontrado.");
  return data;
}

async function salvarConvite(
  supabase: SupabaseServer,
  tenantId: string,
  userId: string | null,
  roleId: string,
  invitedBy: string,
  entrada: EntradaFuncionario
) {
  const { data: existente } = await supabase
    .from("staff_invites")
    .select("id, sent_count")
    .eq("tenant_id", tenantId)
    .eq("email", entrada.email)
    .eq("status", "pending")
    .maybeSingle<{ id: string; sent_count: number }>();

  const payload = {
    email: entrada.email,
    expires_at: expirarEmSeteDias(),
    full_name: entrada.nome,
    invited_by: invitedBy,
    invited_user_id: userId,
    last_sent_at: new Date().toISOString(),
    phone: entrada.telefone,
    role_id: roleId,
    status: "pending",
    token_hash: gerarTokenHash()
  };

  const query = existente
    ? supabase
        .from("staff_invites")
        .update({ ...payload, sent_count: existente.sent_count + 1 })
        .eq("id", existente.id)
    : supabase.from("staff_invites").insert(payload);

  const { error } = await query;
  if (error) throw new Error(error.message);
}

async function atualizarConvite(
  supabase: SupabaseServer,
  tenantId: string,
  conviteId: string,
  entrada: EntradaFuncionario,
  roleId: string
) {
  const convite = await carregarConvite(supabase, tenantId, conviteId);
  const { error } = await supabase
    .from("staff_invites")
    .update({
      email: entrada.email,
      full_name: entrada.nome,
      phone: entrada.telefone,
      role_id: roleId
    })
    .eq("id", convite.id);

  if (error) throw new Error(error.message);
}

async function cancelarConvite(supabase: SupabaseServer, tenantId: string, conviteId: string) {
  const convite = await carregarConvite(supabase, tenantId, conviteId);
  const { error } = await supabase
    .from("staff_invites")
    .update({
      revoked_at: new Date().toISOString(),
      status: "cancelled"
    })
    .eq("id", convite.id);

  if (error) throw new Error(error.message);
}

async function salvarPermissoesCargo(
  supabase: SupabaseServer,
  roleId: string,
  permissoes: PermissionCode[]
) {
  const codigosValidos = new Set(PERMISSOES_MODULO.map((permissao) => permissao.code));
  if (permissoes.some((permissao) => !codigosValidos.has(permissao))) {
    throw new ErroRegraFuncionario("Permissao invalida para cargo.");
  }

  const { data, error } = await supabase
    .from("permissions")
    .select("id, code")
    .in("code", permissoes.length ? permissoes : ["dashboard.read"])
    .returns<Array<{ id: string; code: PermissionCode }>>();

  if (error) throw new Error(error.message);

  await supabase.from("role_permissions").delete().eq("role_id", roleId);

  const linhas = (data ?? [])
    .filter((permissao) => permissoes.includes(permissao.code))
    .map((permissao) => ({ permission_id: permissao.id, role_id: roleId }));

  if (!linhas.length) return;

  const { error: erroInsert } = await supabase.from("role_permissions").insert(linhas);
  if (erroInsert) throw new Error(erroInsert.message);
}

async function registrarAuditoria(
  supabase: SupabaseServer,
  actorId: string,
  tenantId: string,
  entityId: string | null,
  action: string
) {
  const { error } = await supabase.from("audit_logs").insert({
    action,
    actor_id: actorId,
    entity_id: entityId,
    entity_table: "tenant_members",
    metadata: {},
    tenant_id: tenantId
  });

  if (error) console.error("Erro ao registrar auditoria de funcionario.", error.message);
}

type EntradaFuncionario = {
  email: string;
  nome: string;
  roleId: string;
  telefone: string | null;
};

function obterEntradaFuncionario(formData: FormData): EntradaFuncionario {
  return {
    email: emailObrigatorio(formData, "email"),
    nome: textoObrigatorio(formData, "nome", "nome"),
    roleId: textoObrigatorio(formData, "roleId", "cargo"),
    telefone: textoOpcional(formData, "telefone")
  };
}

function obterPermissoesSelecionadas(formData: FormData): PermissionCode[] {
  return formData.getAll("permissoes").map((valor) => valor.toString() as PermissionCode);
}

function textoObrigatorio(formData: FormData, chave: string, label: string): string {
  const valor = formData.get(chave)?.toString().trim();
  if (!valor) throw new ErroRegraFuncionario(`Informe ${label}.`);
  return valor;
}

function textoOpcional(formData: FormData, chave: string): string | null {
  const valor = formData.get(chave)?.toString().trim();
  return valor ? valor : null;
}

function emailObrigatorio(formData: FormData, chave: string): string {
  const valor = textoObrigatorio(formData, chave, "email").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)) {
    throw new ErroRegraFuncionario("Informe um email valido.");
  }
  return valor;
}

function gerarCodigo(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function gerarTokenHash() {
  return createHash("sha256").update(randomBytes(32)).digest("hex");
}

function expirarEmSeteDias() {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
}

function redirecionarComErro(erro: unknown, mensagemLog: string): never {
  const mensagem =
    erro instanceof ErroRegraFuncionario
      ? erro.message
      : "Nao foi possivel concluir a operacao de funcionarios.";

  if (!(erro instanceof ErroRegraFuncionario)) {
    console.error(mensagemLog, erro);
  }

  redirect(`${CAMINHO_FUNCIONARIOS}?erro=${encodeURIComponent(mensagem)}`);
}

function revalidarModulo() {
  revalidatePath(CAMINHO_FUNCIONARIOS);
  revalidatePath("/");
}

class ErroRegraFuncionario extends Error {}
