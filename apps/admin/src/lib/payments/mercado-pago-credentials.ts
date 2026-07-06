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
  const credencial: Record<string, string | null> = {
    access_token_encrypted: criptografarSegredoTenant(token),
    access_token_last4: token.slice(-4),
    connected_at: new Date().toISOString(),
    created_by: userId,
    environment: ambiente,
    owner_id: ownerId,
    provider: "mercado_pago",
    public_key: publicKey,
    tenant_id: tenantId,
    updated_by: userId
  };
  if (webhookSecretNormalizado) {
    credencial.webhook_secret_encrypted = criptografarSegredoTenant(webhookSecretNormalizado);
    credencial.webhook_secret_last4 = webhookSecretNormalizado.slice(-4);
  }

  const supabase = criarClienteSupabaseAdmin();
  const { error } = await supabase.schema("app_private").from("tenant_payment_provider_credentials").upsert(
    credencial,
    { onConflict: "tenant_id,provider" }
  );

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
  const { error } = await supabase
    .schema("app_private")
    .from("tenant_payment_provider_credentials")
    .update({
      updated_by: userId,
      webhook_secret_encrypted: criptografarSegredoTenant(secret),
      webhook_secret_last4: secret.slice(-4)
    })
    .eq("tenant_id", tenantId)
    .eq("provider", "mercado_pago");

  if (error) {
    throw new Error("Nao foi possivel salvar o Webhook Secret Mercado Pago.");
  }
}

export async function removerWebhookSecretMercadoPago(tenantId: string) {
  const supabase = criarClienteSupabaseAdmin();
  const { error } = await supabase
    .schema("app_private")
    .from("tenant_payment_provider_credentials")
    .update({
      webhook_secret_encrypted: null,
      webhook_secret_last4: null
    })
    .eq("tenant_id", tenantId)
    .eq("provider", "mercado_pago");

  if (error) {
    throw new Error("Nao foi possivel remover o Webhook Secret Mercado Pago.");
  }
}

export async function removerCredencialMercadoPago(tenantId: string) {
  const supabase = criarClienteSupabaseAdmin();
  const { error } = await supabase
    .schema("app_private")
    .from("tenant_payment_provider_credentials")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("provider", "mercado_pago");

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
    .schema("app_private")
    .from("tenant_payment_provider_credentials")
    .select(
      "access_token_encrypted, access_token_last4, environment, public_key, webhook_secret_encrypted, webhook_secret_last4"
    )
    .eq("tenant_id", tenantId)
    .eq("provider", "mercado_pago")
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
