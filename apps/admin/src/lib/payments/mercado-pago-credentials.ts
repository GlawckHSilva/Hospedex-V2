import "server-only";

import { descriptografarSegredoTenant, criptografarSegredoTenant } from "../security/tenant-secret-crypto";
import { criarClienteSupabaseAdmin } from "../supabase/admin";
import { normalizarVariavelAmbiente } from "../supabase/env";

/**
 * Repositorio server-only das credenciais Mercado Pago do tenant.
 *
 * A UI nunca le o access token. O proprietario informa o token uma vez, o
 * servidor criptografa e grava no schema app_private. As cobrancas buscam o
 * token aqui para garantir que o dinheiro va para a conta Mercado Pago correta.
 */

type AmbienteMercadoPago = "sandbox" | "production";

type CredencialMercadoPagoRow = {
  access_token_encrypted: string;
  access_token_last4: string | null;
  environment: AmbienteMercadoPago;
  public_key: string | null;
  webhook_secret_encrypted: string | null;
  webhook_secret_last4: string | null;
};

export type ResumoCredencialMercadoPago = {
  conectado: boolean;
  last4: string | null;
  webhookSecretConfigurado: boolean;
  webhookSecretLast4: string | null;
};

export async function salvarCredencialMercadoPago({
  accessToken,
  ambiente,
  ownerId,
  publicKey,
  tenantId,
  userId,
  webhookSecret
}: {
  accessToken: string;
  ambiente: AmbienteMercadoPago;
  ownerId: string;
  publicKey: string | null;
  tenantId: string;
  userId: string;
  webhookSecret?: string | null;
}) {
  const token = normalizarTokenMercadoPago(accessToken);
  const webhookSecretNormalizado = webhookSecret
    ? normalizarWebhookSecretMercadoPago(webhookSecret)
    : null;
  const supabase = criarClienteSupabaseAdmin();
  const { error } = await supabase.rpc("admin_upsert_mercado_pago_credential", {
    p_access_token_encrypted: criptografarSegredoTenant(token),
    p_access_token_last4: token.slice(-4),
    p_environment: ambiente,
    p_owner_id: ownerId,
    p_public_key: publicKey,
    p_tenant_id: tenantId,
    p_user_id: userId,
    p_webhook_secret_encrypted: webhookSecretNormalizado
      ? criptografarSegredoTenant(webhookSecretNormalizado)
      : null,
    p_webhook_secret_last4: webhookSecretNormalizado
      ? webhookSecretNormalizado.slice(-4)
      : null
  });

  if (error) {
    throw new Error("Nao foi possivel salvar a credencial Mercado Pago.");
  }
}

export async function salvarWebhookSecretMercadoPago({
  tenantId,
  userId,
  webhookSecret
}: {
  tenantId: string;
  userId: string;
  webhookSecret: string;
}) {
  const secret = normalizarWebhookSecretMercadoPago(webhookSecret);
  const supabase = criarClienteSupabaseAdmin();
  const { error } = await supabase.rpc("admin_update_mercado_pago_webhook_secret", {
    p_tenant_id: tenantId,
    p_user_id: userId,
    p_webhook_secret_encrypted: criptografarSegredoTenant(secret),
    p_webhook_secret_last4: secret.slice(-4)
  });

  if (error) {
    throw new Error("Nao foi possivel salvar o Webhook Secret Mercado Pago.");
  }
}

export async function removerWebhookSecretMercadoPago(tenantId: string) {
  const supabase = criarClienteSupabaseAdmin();
  const { error } = await supabase.rpc("admin_clear_mercado_pago_webhook_secret", {
    p_tenant_id: tenantId
  });

  if (error) {
    throw new Error("Nao foi possivel remover o Webhook Secret Mercado Pago.");
  }
}

export async function removerCredencialMercadoPago(tenantId: string) {
  const supabase = criarClienteSupabaseAdmin();
  const { error } = await supabase.rpc("admin_delete_mercado_pago_credential", {
    p_tenant_id: tenantId
  });

  if (error) {
    throw new Error("Nao foi possivel remover a credencial Mercado Pago.");
  }
}

export async function carregarAccessTokenMercadoPago({
  fallbackSecretName,
  tenantId
}: {
  fallbackSecretName: string | null;
  tenantId: string;
}) {
  const credencial = await carregarCredencialMercadoPago(tenantId);
  if (credencial?.access_token_encrypted) {
    return descriptografarSegredoTenant(credencial.access_token_encrypted);
  }

  const tokenPorEnv = fallbackSecretName
    ? normalizarVariavelAmbiente(process.env[fallbackSecretName])
    : null;
  const tokenGlobal = normalizarVariavelAmbiente(process.env.MERCADO_PAGO_ACCESS_TOKEN);
  const token = tokenPorEnv ?? tokenGlobal;

  if (!token) {
    throw new Error(
      "Mercado Pago nao conectado. Configure a credencial nas Configuracoes do Hospedex."
    );
  }

  return token;
}

export async function carregarWebhookSecretMercadoPago(tenantId: string) {
  const credencial = await carregarCredencialMercadoPago(tenantId);
  if (!credencial?.webhook_secret_encrypted) return null;
  return descriptografarSegredoTenant(credencial.webhook_secret_encrypted);
}

export async function carregarResumoCredencialMercadoPago(
  tenantId: string
): Promise<ResumoCredencialMercadoPago> {
  try {
    const credencial = await carregarCredencialMercadoPago(tenantId);
    return {
      conectado: Boolean(credencial?.access_token_encrypted),
      last4: credencial?.access_token_last4 ?? null,
      webhookSecretConfigurado: Boolean(credencial?.webhook_secret_encrypted),
      webhookSecretLast4: credencial?.webhook_secret_last4 ?? null
    };
  } catch (erro) {
    console.error("Erro ao carregar resumo da credencial Mercado Pago.", erro);
    return {
      conectado: false,
      last4: null,
      webhookSecretConfigurado: false,
      webhookSecretLast4: null
    };
  }
}

async function carregarCredencialMercadoPago(tenantId: string) {
  const supabase = criarClienteSupabaseAdmin();
  const { data, error } = await supabase
    .rpc("admin_get_mercado_pago_credential", { p_tenant_id: tenantId })
    .maybeSingle<CredencialMercadoPagoRow>();

  if (error) throw new Error("Nao foi possivel ler a credencial Mercado Pago.");
  return data;
}

function normalizarTokenMercadoPago(accessToken: string) {
  const token = accessToken.trim();
  if (token.length < 20) {
    throw new Error("Access token Mercado Pago invalido.");
  }
  return token;
}

function normalizarWebhookSecretMercadoPago(webhookSecret: string) {
  const secret = webhookSecret.trim();
  if (secret.length < 16) {
    throw new Error("Webhook Secret Mercado Pago invalido.");
  }
  return secret;
}
