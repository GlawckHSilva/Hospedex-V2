"use server";

import type { LicenseRow } from "@hospedex/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirSuperAdmin } from "../../auth/context";
import { criarClienteSupabaseServer } from "../../supabase/server";

const CAMINHO_LICENCAS = "/super-admin/licencas";

type SupabaseServer = Awaited<ReturnType<typeof criarClienteSupabaseServer>>;

export async function renovarLicencaAction(formData: FormData) {
  const contexto = await exigirSuperAdmin();
  const supabase = await criarClienteSupabaseServer();
  const licencaId = textoObrigatorio(formData, "licencaId", "licenca");
  const meses = numeroInteiro(formData, "meses", "meses de renovacao", 1, 36);

  try {
    const licenca = await carregarLicenca(supabase, licencaId);
    const expiraEm = calcularRenovacao(licenca.expires_at, meses);

    await atualizarLicenca(supabase, licenca, {
      expires_at: expiraEm,
      status: "active"
    });
    await atualizarTenant(supabase, licenca.tenant_id, "active");
    await atualizarAssinatura(supabase, licenca.tenant_id, "active", expiraEm);
    await registrarAuditoria(supabase, contexto.userId, licenca, "super_admin.license.renewed");
    revalidarModulo();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao renovar licenca.");
  }

  redirect(`${CAMINHO_LICENCAS}?sucesso=licenca-renovada`);
}

export async function bloquearInadimplenciaAction(formData: FormData) {
  const contexto = await exigirSuperAdmin();
  const supabase = await criarClienteSupabaseServer();
  const licencaId = textoObrigatorio(formData, "licencaId", "licenca");

  try {
    const licenca = await carregarLicenca(supabase, licencaId);

    await atualizarLicenca(supabase, licenca, { status: "suspended" });
    await atualizarTenant(supabase, licenca.tenant_id, "suspended");
    await atualizarAssinatura(supabase, licenca.tenant_id, "past_due", licenca.expires_at);
    await registrarAuditoria(supabase, contexto.userId, licenca, "super_admin.license.suspended");
    revalidarModulo();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao bloquear licenca.");
  }

  redirect(`${CAMINHO_LICENCAS}?sucesso=licenca-bloqueada`);
}

export async function reativarLicencaAction(formData: FormData) {
  const contexto = await exigirSuperAdmin();
  const supabase = await criarClienteSupabaseServer();
  const licencaId = textoObrigatorio(formData, "licencaId", "licenca");

  try {
    const licenca = await carregarLicenca(supabase, licencaId);

    await atualizarLicenca(supabase, licenca, { status: "active" });
    await atualizarTenant(supabase, licenca.tenant_id, "active");
    await atualizarAssinatura(supabase, licenca.tenant_id, "active", licenca.expires_at);
    await registrarAuditoria(supabase, contexto.userId, licenca, "super_admin.license.reactivated");
    revalidarModulo();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao reativar licenca.");
  }

  redirect(`${CAMINHO_LICENCAS}?sucesso=licenca-reativada`);
}

async function carregarLicenca(supabase: SupabaseServer, licencaId: string): Promise<LicenseRow> {
  const { data, error } = await supabase
    .from("licenses")
    .select("*")
    .eq("id", licencaId)
    .maybeSingle<LicenseRow>();

  if (error || !data) throw new ErroRegraLicenca("Licenca nao encontrada.");
  return data;
}

async function atualizarLicenca(
  supabase: SupabaseServer,
  licenca: LicenseRow,
  payload: Partial<Pick<LicenseRow, "expires_at" | "status">>
) {
  const { error } = await supabase.from("licenses").update(payload).eq("id", licenca.id);
  if (error) throw new Error(error.message);
}

async function atualizarTenant(
  supabase: SupabaseServer,
  tenantId: string,
  status: "active" | "suspended"
) {
  const { error } = await supabase.from("tenants").update({ status }).eq("id", tenantId);
  if (error) throw new Error(error.message);
}

async function atualizarAssinatura(
  supabase: SupabaseServer,
  tenantId: string,
  status: "active" | "past_due",
  expiraEm: string | null
) {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (error || !data) return;

  const { error: erroUpdate } = await supabase
    .from("subscriptions")
    .update({
      current_period_end: expiraEm ? `${expiraEm}T23:59:59.000Z` : null,
      current_period_start: new Date().toISOString(),
      status
    })
    .eq("id", data.id);

  if (erroUpdate) throw new Error(erroUpdate.message);
}

async function registrarAuditoria(
  supabase: SupabaseServer,
  actorId: string,
  licenca: LicenseRow,
  action: string
) {
  const { error } = await supabase.from("audit_logs").insert({
    action,
    actor_id: actorId,
    entity_id: licenca.id,
    entity_table: "licenses",
    metadata: {},
    tenant_id: licenca.tenant_id
  });

  if (error) console.error("Erro ao registrar auditoria de licenca.", error.message);
}

function calcularRenovacao(expiracaoAtual: string | null, meses: number) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const base =
    expiracaoAtual && new Date(`${expiracaoAtual}T00:00:00`).getTime() > hoje.getTime()
      ? new Date(`${expiracaoAtual}T00:00:00`)
      : hoje;

  base.setMonth(base.getMonth() + meses);
  return base.toISOString().slice(0, 10);
}

function textoObrigatorio(formData: FormData, chave: string, label: string): string {
  const valor = formData.get(chave)?.toString().trim();
  if (!valor) throw new ErroRegraLicenca(`Informe ${label}.`);
  return valor;
}

function numeroInteiro(
  formData: FormData,
  chave: string,
  label: string,
  minimo: number,
  maximo: number
) {
  const valor = Number.parseInt(textoObrigatorio(formData, chave, label), 10);
  if (Number.isNaN(valor) || valor < minimo || valor > maximo) {
    throw new ErroRegraLicenca(`Informe ${label} valido.`);
  }

  return valor;
}

function redirecionarComErro(erro: unknown, mensagemLog: string): never {
  const mensagem =
    erro instanceof ErroRegraLicenca
      ? erro.message
      : "Nao foi possivel concluir a operacao da licenca.";

  if (!(erro instanceof ErroRegraLicenca)) {
    console.error(mensagemLog, erro);
  }

  redirect(`${CAMINHO_LICENCAS}?erro=${encodeURIComponent(mensagem)}`);
}

function revalidarModulo() {
  revalidatePath(CAMINHO_LICENCAS);
  revalidatePath("/super-admin");
}

class ErroRegraLicenca extends Error {}
