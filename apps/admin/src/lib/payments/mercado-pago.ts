import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { normalizarVariavelAmbiente } from "../supabase/env";

/**
 * Cliente server-side mínimo do Mercado Pago.
 *
 * A V2 nao usa SDK no navegador: o access token do proprietario e resolvido
 * apenas no servidor. O token pode vir do cofre por tenant ou do fallback por
 * variavel de ambiente enquanto a migracao operacional e concluida.
 */

const API_BASE_PADRAO = "https://api.mercadopago.com";

export type PreferenciaMercadoPagoEntrada = {
  accessToken: string | null;
  accessTokenSecretName?: string | null;
  amount: number;
  currency: string;
  description: string;
  expiresAt: string | null;
  externalReference: string;
  notificationUrl: string;
  payerEmail: string | null;
  payerName: string | null;
  payerPhone: string | null;
  reservationCode: string;
};

export type PreferenciaMercadoPagoResposta = {
  id: string;
  initPoint: string;
  sandboxInitPoint: string | null;
};

export type PagamentoMercadoPago = {
  approvedAt: string | null;
  externalReference: string | null;
  feeAmount: number | null;
  grossAmount: number;
  id: string;
  metadata: Record<string, unknown>;
  netAmount: number | null;
  paymentMethod: string | null;
  preferenceId: string | null;
  status: string | null;
};

export async function criarPreferenciaMercadoPago(
  entrada: PreferenciaMercadoPagoEntrada
): Promise<PreferenciaMercadoPagoResposta> {
  const token = obterAccessTokenMercadoPago(
    entrada.accessToken,
    entrada.accessTokenSecretName ?? null
  );
  const body = {
    auto_return: "approved",
    back_urls: obterBackUrls(),
    expires: Boolean(entrada.expiresAt),
    expiration_date_to: entrada.expiresAt ?? undefined,
    external_reference: entrada.externalReference,
    items: [
      {
        currency_id: entrada.currency,
        description: entrada.description,
        quantity: 1,
        title: `Reserva ${entrada.reservationCode}`,
        unit_price: entrada.amount
      }
    ],
    metadata: {
      origem: "hospedex_v2",
      reservation_code: entrada.reservationCode
    },
    notification_url: entrada.notificationUrl,
    payer: {
      email: entrada.payerEmail ?? undefined,
      name: entrada.payerName ?? undefined,
      phone: entrada.payerPhone ? { number: entrada.payerPhone } : undefined
    }
  };

  const resposta = await fetch(`${obterBaseApiMercadoPago()}/checkout/preferences`, {
    body: JSON.stringify(body),
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  const payload = (await resposta.json().catch(() => null)) as
    | { id?: string; init_point?: string; message?: string; sandbox_init_point?: string }
    | null;

  if (!resposta.ok || !payload?.id || !payload.init_point) {
    throw new Error(payload?.message ?? "Nao foi possivel criar a cobranca no Mercado Pago.");
  }

  return {
    id: payload.id,
    initPoint: payload.init_point,
    sandboxInitPoint: payload.sandbox_init_point ?? null
  };
}

export async function buscarPagamentoMercadoPago(
  tenantAccessToken: string | null,
  tenantAccessTokenSecretName: string | null,
  paymentId: string
): Promise<PagamentoMercadoPago> {
  const token = obterAccessTokenMercadoPago(tenantAccessToken, tenantAccessTokenSecretName);
  const resposta = await fetch(`${obterBaseApiMercadoPago()}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const payload = (await resposta.json().catch(() => null)) as Record<string, unknown> | null;

  if (!resposta.ok || !payload) {
    throw new Error("Nao foi possivel consultar o pagamento no Mercado Pago.");
  }

  return {
    approvedAt: textoOuNulo(payload.date_approved),
    externalReference: textoOuNulo(payload.external_reference),
    feeAmount: somarTaxas(payload.fee_details),
    grossAmount: numeroOuZero(payload.transaction_amount),
    id: String(payload.id),
    metadata: payload,
    netAmount: numeroOuNulo((payload.transaction_details as Record<string, unknown> | undefined)?.net_received_amount),
    paymentMethod: mapearFormaPagamento(payload.payment_method_id, payload.payment_type_id),
    preferenceId: textoOuNulo((payload.order as Record<string, unknown> | undefined)?.id),
    status: textoOuNulo(payload.status)
  };
}

export function validarAssinaturaMercadoPago({
  dataId,
  requestId,
  secret,
  signature
}: {
  dataId: string | null;
  requestId: string | null;
  secret: string | null;
  signature: string | null;
}) {
  if (!secret) return process.env.NODE_ENV !== "production";
  if (!signature || !requestId || !dataId) return false;

  const partes = Object.fromEntries(
    signature.split(",").map((parte) => {
      const [chave, valor] = parte.split("=");
      return [chave?.trim(), valor?.trim()];
    })
  );
  const ts = partes.ts;
  const assinatura = partes.v1;
  if (!ts || !assinatura) return false;

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const esperado = createHmac("sha256", secret).update(manifest).digest("hex");
  const recebido = Buffer.from(assinatura, "hex");
  const calculado = Buffer.from(esperado, "hex");

  return recebido.length === calculado.length && timingSafeEqual(recebido, calculado);
}

export function obterWebhookSecretMercadoPago() {
  return normalizarVariavelAmbiente(process.env.MERCADO_PAGO_WEBHOOK_SECRET) ?? null;
}

function obterAccessTokenMercadoPago(accessToken: string | null, secretName: string | null) {
  if (accessToken) return accessToken;

  const tokenPorTenant = secretName
    ? normalizarVariavelAmbiente(process.env[secretName])
    : null;
  const tokenGlobal = normalizarVariavelAmbiente(process.env.MERCADO_PAGO_ACCESS_TOKEN);
  const token = tokenPorTenant ?? tokenGlobal;

  if (!token) {
    throw new Error(
      "Access token do Mercado Pago nao configurado no servidor para este tenant."
    );
  }

  return token;
}

function obterBaseApiMercadoPago() {
  return normalizarVariavelAmbiente(process.env.MERCADO_PAGO_API_BASE_URL) ?? API_BASE_PADRAO;
}

function obterBackUrls() {
  const base = normalizarVariavelAmbiente(process.env.APP_PUBLIC_URL);
  if (!base) return undefined;

  return {
    failure: `${base}/reservas`,
    pending: `${base}/reservas`,
    success: `${base}/reservas`
  };
}

function mapearFormaPagamento(method: unknown, type: unknown) {
  const metodo = textoOuNulo(method);
  const tipo = textoOuNulo(type);
  if (metodo === "pix") return "pix";
  if (tipo === "debit_card") return "debit_card";
  if (tipo === "credit_card") return "credit_card";
  if (tipo === "bank_transfer") return "bank_transfer";
  return "credit_card";
}

function numeroOuZero(valor: unknown) {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : 0;
}

function numeroOuNulo(valor: unknown) {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : null;
}

function somarTaxas(valor: unknown) {
  if (!Array.isArray(valor)) return null;
  const total = valor.reduce((soma, taxa) => {
    const amount = (taxa as { amount?: unknown }).amount;
    return soma + numeroOuZero(amount);
  }, 0);
  return total > 0 ? total : null;
}

function textoOuNulo(valor: unknown) {
  return typeof valor === "string" && valor.trim() ? valor.trim() : null;
}
