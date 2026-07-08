"use server";

import type { IntegrationProvider, TenantStatus } from "@hospedex/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirSuperAdmin } from "../../auth/context";
import {
  obterDefinicaoIntegracao,
  providerIntegracaoValido
} from "../../integrations/catalog";
import { criarClienteSupabaseAdmin } from "../../supabase/admin";

/**
 * Server actions do Super Admin > Proprietarios.
 *
 * O fluxo usa service role apenas no servidor porque precisa criar Auth user,
 * tenant, vinculos, licenca e flags em uma operacao administrativa unica.
 */

const CAMINHO_PROPRIETARIOS = "/super-admin/proprietarios";
const CAMINHO_EMPREENDIMENTOS = "/super-admin/empreendimentos";
const STATUS_TENANT: TenantStatus[] = [
  "trial",
  "active",
  "past_due",
  "suspended",
  "cancelled"
];

type EntradaProprietario = {
  email: string;
  expiraEm: string | null;
  featureFlagIds: string[];
  limitePropriedades: number;
  nome: string;
  planoId: string;
  senha: string | null;
  status: TenantStatus;
  telefone: string | null;
  tenantNome: string;
};

export async function criarProprietarioAction(formData: FormData) {
  const contexto = await exigirSuperAdmin();
  const supabase = criarClienteSupabaseAdmin();
  const entrada = obterEntradaProprietario(formData, true);
  let authUserId: string | null = null;

  try {
    const senha = entrada.senha;
    if (!senha) {
      throw new ErroRegraProprietario("Informe uma senha com pelo menos 8 caracteres.");
    }

    const { data: authData, error: erroAuth } = await supabase.auth.admin.createUser({
      email: entrada.email,
      email_confirm: true,
      password: senha,
      user_metadata: {
        full_name: entrada.nome,
        phone: entrada.telefone
      }
    });

    if (erroAuth || !authData.user) {
      throw new ErroRegraProprietario(
        mensagemErroAuth(erroAuth?.message ?? "Usuario Auth nao retornado pelo Supabase.")
      );
    }

    authUserId = authData.user.id;

    await provisionarProprietarioNoBanco(supabase, contexto.userId, authUserId, entrada);
  } catch (erro) {
    await desfazerUsuarioAuthCriado(supabase, authUserId);
    redirecionarComErro(erro, "Erro ao criar proprietario.");
  }

  revalidarModulo();
  redirect(`${CAMINHO_PROPRIETARIOS}?sucesso=proprietario-criado`);
}

export async function atualizarProprietarioAction(formData: FormData) {
  const contexto = await exigirSuperAdmin();
  const supabase = criarClienteSupabaseAdmin();
  const tenantId = textoObrigatorio(formData, "tenantId", "tenant");
  const ownerId = textoObrigatorio(formData, "ownerId", "proprietario");
  const entrada = obterEntradaProprietario(formData, false);

  try {
    // Atualizar proprietario envolve tabelas de tenant, licenca, assinatura e
    // modulos. A RPC garante que tudo seja salvo junto ou nada seja alterado.
    const { error } = await supabase.rpc("super_admin_update_owner_tenant", {
      p_actor_id: contexto.userId,
      p_email: entrada.email,
      p_expira_em: entrada.expiraEm,
      p_feature_flag_ids: entrada.featureFlagIds,
      p_limite_propriedades: entrada.limitePropriedades,
      p_nome: entrada.nome,
      p_owner_id: ownerId,
      p_plano_id: entrada.planoId,
      p_status: entrada.status,
      p_telefone: entrada.telefone,
      p_tenant_id: tenantId,
      p_tenant_nome: entrada.tenantNome
    });
    if (error) throw new ErroRegraProprietario(error.message);
    revalidarModulo();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao atualizar proprietario.");
  }

  redirect(`${CAMINHO_PROPRIETARIOS}?sucesso=proprietario-atualizado`);
}

export async function alterarStatusProprietarioAction(formData: FormData) {
  const contexto = await exigirSuperAdmin();
  const supabase = criarClienteSupabaseAdmin();
  const retorno = obterCaminhoRetorno(formData);
  const tenantId = textoObrigatorio(formData, "tenantId", "tenant");
  const ownerId = textoObrigatorio(formData, "ownerId", "proprietario");
  const acao = textoObrigatorio(formData, "acao", "acao");

  try {
    // Bloqueio e reativacao precisam ficar consistentes entre tenant,
    // membership, licenca e assinatura para nao deixar login parcialmente ativo.
    const { error } = await supabase.rpc("super_admin_set_owner_status", {
      p_acao: acao,
      p_actor_id: contexto.userId,
      p_owner_id: ownerId,
      p_tenant_id: tenantId
    });
    if (error) throw new ErroRegraProprietario(error.message);
    revalidarModulo();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao alterar status do proprietario.", retorno);
  }

  redirect(`${retorno}?sucesso=status-proprietario`);
}

export async function alternarModuloProprietarioAction(formData: FormData) {
  const contexto = await exigirSuperAdmin();
  const supabase = criarClienteSupabaseAdmin();
  const retorno = obterCaminhoRetorno(formData);
  const tenantId = textoObrigatorio(formData, "tenantId", "tenant");
  const ownerId = textoObrigatorio(formData, "ownerId", "proprietario");
  const featureFlagId = textoObrigatorio(formData, "featureFlagId", "modulo");
  const habilitar = textoObrigatorio(formData, "habilitar", "estado") === "true";

  try {
    // tenant_features e a fonte de liberacao de modulos. So o Super Admin pode
    // alterar esta matriz para impedir que o owner libere recursos pagos sozinho.
    const { error } = await supabase.rpc("super_admin_set_tenant_feature", {
      p_actor_id: contexto.userId,
      p_enabled: habilitar,
      p_feature_flag_id: featureFlagId,
      p_owner_id: ownerId,
      p_tenant_id: tenantId
    });
    if (error) throw new ErroRegraProprietario(error.message);
    revalidarModulo();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao alterar modulo do proprietario.", retorno);
  }

  redirect(`${retorno}?sucesso=modulo-proprietario`);
}

export async function alternarIntegracaoProprietarioAction(formData: FormData) {
  const contexto = await exigirSuperAdmin();
  const supabase = criarClienteSupabaseAdmin();
  const retorno = obterCaminhoRetorno(formData);
  const tenantId = textoObrigatorio(formData, "tenantId", "tenant");
  const ownerId = textoObrigatorio(formData, "ownerId", "proprietario");
  const providerRecebido = textoObrigatorio(formData, "provider", "integracao");
  const habilitar = textoObrigatorio(formData, "habilitar", "estado") === "true";

  try {
    await carregarTenantDoOwner(supabase, tenantId, ownerId);
    if (!providerIntegracaoValido(providerRecebido)) {
      throw new ErroRegraProprietario("Integracao invalida para este tenant.");
    }

    const provider: IntegrationProvider = providerRecebido;
    if (obterDefinicaoIntegracao(provider).futura) {
      throw new ErroRegraProprietario("Esta integracao permanece reservada para uma etapa futura.");
    }

    // Nenhuma credencial e gravada nesta etapa. O Super Admin controla apenas
    // a disponibilidade estrutural; secrets permanecem no backend/ambiente.
    const { error } = await supabase.from("tenant_integrations").upsert(
      {
        configured_by: contexto.userId,
        enabled: habilitar,
        provider,
        status: habilitar ? "pending_backend" : "disabled",
        tenant_id: tenantId
      },
      { onConflict: "tenant_id,provider" }
    );
    if (error) throw new Error(error.message);

    await registrarAuditoria(
      supabase,
      contexto.userId,
      tenantId,
      habilitar ? "super_admin.integration.enabled" : "super_admin.integration.disabled",
      { enabled: habilitar, provider }
    );
    revalidarModulo();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao alterar integracao do proprietario.", retorno);
  }

  redirect(`${retorno}?sucesso=integracao-proprietario`);
}

async function provisionarProprietarioNoBanco(
  supabase: ReturnType<typeof criarClienteSupabaseAdmin>,
  superAdminId: string,
  userId: string,
  entrada: EntradaProprietario
) {
  // A RPC executa a parte relacional em transacao unica. Se qualquer insert
  // falhar, o Postgres desfaz tudo e a action remove o Auth user criado.
  const { error } = await supabase.rpc("super_admin_provision_owner_tenant", {
    p_actor_id: superAdminId,
    p_auth_user_id: userId,
    p_email: entrada.email,
    p_expira_em: entrada.expiraEm,
    p_feature_flag_ids: entrada.featureFlagIds,
    p_license_key: gerarChaveLicenca(),
    p_limite_propriedades: entrada.limitePropriedades,
    p_nome: entrada.nome,
    p_plano_id: entrada.planoId,
    p_status: entrada.status,
    p_telefone: entrada.telefone,
    p_tenant_nome: entrada.tenantNome,
    p_tenant_slug: gerarSlug(entrada.tenantNome)
  });

  if (error) {
    throw new ErroRegraProprietario(error.message);
  }
}

async function carregarTenantDoOwner(
  supabase: ReturnType<typeof criarClienteSupabaseAdmin>,
  tenantId: string,
  ownerId: string
) {
  const { data, error } = await supabase
    .from("tenants")
    .select("id")
    .eq("id", tenantId)
    .eq("owner_id", ownerId)
    .is("deleted_at", null)
    .maybeSingle<{ id: string }>();

  if (error || !data) {
    throw new ErroRegraProprietario("Tenant do proprietario nao encontrado.");
  }

  return data;
}

async function registrarAuditoria(
  supabase: ReturnType<typeof criarClienteSupabaseAdmin>,
  actorId: string,
  tenantId: string,
  action: string,
  metadata: Record<string, unknown> = {}
) {
  const { error } = await supabase.from("audit_logs").insert({
    action,
    actor_id: actorId,
    entity_id: tenantId,
    entity_table: "tenants",
    metadata,
    tenant_id: tenantId
  });

  if (error) console.error("Erro ao registrar auditoria de proprietario.", error.message);
}

async function desfazerUsuarioAuthCriado(
  supabase: ReturnType<typeof criarClienteSupabaseAdmin>,
  authUserId: string | null
) {
  if (authUserId) {
    const { error } = await supabase.auth.admin.deleteUser(authUserId);
    if (error) {
      console.error("Erro ao remover usuario Auth apos falha no provisionamento.", error.message);
    }
  }
}

function obterEntradaProprietario(formData: FormData, exigirSenha: boolean): EntradaProprietario {
  const planoId = textoObrigatorio(formData, "planoId", "plano");
  const senha = textoOpcional(formData, "senha");

  if (exigirSenha && (!senha || senha.length < 8)) {
    throw new ErroRegraProprietario("Informe uma senha com pelo menos 8 caracteres.");
  }

  return {
    email: emailObrigatorio(formData, "email"),
    expiraEm: dataOpcional(formData, "expiraEm"),
    featureFlagIds: formData.getAll("featureFlags").map((valor) => valor.toString()),
    limitePropriedades: numeroInteiro(formData, "limitePropriedades", "limite de propriedades", 1),
    nome: textoObrigatorio(formData, "nome", "nome"),
    planoId,
    senha,
    status: validarStatusTenant(textoObrigatorio(formData, "status", "status")),
    telefone: textoOpcional(formData, "telefone"),
    tenantNome: textoObrigatorio(formData, "tenantNome", "nome do tenant")
  };
}

function validarStatusTenant(valor: string): TenantStatus {
  if (STATUS_TENANT.includes(valor as TenantStatus)) return valor as TenantStatus;
  throw new ErroRegraProprietario("Status do proprietario invalido.");
}

function textoObrigatorio(formData: FormData, chave: string, label: string): string {
  const valor = formData.get(chave)?.toString().trim();
  if (!valor) throw new ErroRegraProprietario(`Informe ${label}.`);
  return valor;
}

function textoOpcional(formData: FormData, chave: string): string | null {
  const valor = formData.get(chave)?.toString().trim();
  return valor ? valor : null;
}

function emailObrigatorio(formData: FormData, chave: string): string {
  const valor = textoObrigatorio(formData, chave, "email").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)) {
    throw new ErroRegraProprietario("Informe um email valido.");
  }
  return valor;
}

function numeroInteiro(formData: FormData, chave: string, label: string, minimo: number) {
  const valor = Number.parseInt(textoObrigatorio(formData, chave, label), 10);
  if (Number.isNaN(valor) || valor < minimo) {
    throw new ErroRegraProprietario(`Informe ${label} valido.`);
  }
  return valor;
}

function dataOpcional(formData: FormData, chave: string) {
  const valor = textoOpcional(formData, chave);
  if (!valor) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    throw new ErroRegraProprietario("Informe data de expiracao valida.");
  }
  return valor;
}

function mensagemErroAuth(mensagem: string) {
  const normalizada = mensagem.toLowerCase();
  if (normalizada.includes("already") || normalizada.includes("registered")) {
    return "Ja existe um usuario cadastrado com este email.";
  }
  if (normalizada.includes("password")) {
    return "A senha do proprietario nao atende aos criterios do Supabase Auth.";
  }
  return mensagem;
}

function gerarSlug(valor: string) {
  const base = valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 42);

  return `${base || "tenant"}-${Date.now().toString(36)}`;
}

function gerarChaveLicenca() {
  return `HSPX-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

function obterCaminhoRetorno(formData: FormData) {
  const retorno = textoOpcional(formData, "retorno");
  return retorno === CAMINHO_EMPREENDIMENTOS ? CAMINHO_EMPREENDIMENTOS : CAMINHO_PROPRIETARIOS;
}

function redirecionarComErro(
  erro: unknown,
  mensagemLog: string,
  caminho = CAMINHO_PROPRIETARIOS
): never {
  const mensagem =
    erro instanceof ErroRegraProprietario
      ? erro.message
      : "Nao foi possivel concluir a operacao do proprietario.";

  if (!(erro instanceof ErroRegraProprietario)) {
    console.error(mensagemLog, erro);
  }

  redirect(`${caminho}?erro=${encodeURIComponent(mensagem)}`);
}

function revalidarModulo() {
  revalidatePath(CAMINHO_PROPRIETARIOS);
  revalidatePath(CAMINHO_EMPREENDIMENTOS);
  revalidatePath("/super-admin");
  // O limite de casas salvo na licenca impacta diretamente o Gerenciamento.
  // Revalidar a rota evita que o proprietario veja contador antigo apos ajuste do Super Admin.
  revalidatePath("/propriedades");
}

class ErroRegraProprietario extends Error {}
