import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import type { TenantSettingRow } from "@hospedex/types";

import {
  buscarPagamentoMercadoPago,
  obterWebhookSecretMercadoPago,
  validarAssinaturaMercadoPago
} from "../../../../lib/payments/mercado-pago";
import {
  carregarAccessTokenMercadoPago,
  carregarWebhookSecretMercadoPago
} from "../../../../lib/payments/mercado-pago-credentials";
import { criarClienteSupabaseAdmin } from "../../../../lib/supabase/admin";

/**
 * Webhook Mercado Pago.
 *
 * O endpoint usa service_role apenas no servidor para processar evento externo.
 * A baixa real passa por RPC idempotente e sempre localiza a cobranca por
 * external_reference, preservando tenant/property/reservation.
 */

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { action?: string; data?: { id?: string }; type?: string }
    | null;
  const paymentId = request.nextUrl.searchParams.get("data.id") ?? body?.data?.id ?? null;
  const tenantId = request.nextUrl.searchParams.get("tenant");

  if (!paymentId || !tenantId) {
    return NextResponse.json({ error: "Evento Mercado Pago incompleto." }, { status: 400 });
  }

  const supabase = criarClienteSupabaseAdmin();
  const { data: configuracao, error: erroConfig } = await supabase
    .from("tenant_settings")
    .select("*")
    .eq("tenant_id", tenantId)
    .maybeSingle<TenantSettingRow>();

  if (erroConfig || !configuracao) {
    return NextResponse.json(
      { error: "Configuracao Mercado Pago do tenant nao encontrada." },
      { status: 404 }
    );
  }

  const webhookSecretTenant = await carregarWebhookSecretMercadoPago(tenantId);
  const webhookSecretGlobal = obterWebhookSecretMercadoPago();
  const webhookSecret = webhookSecretTenant ?? webhookSecretGlobal;

  /*
    O padrão correto da V2 é validar a assinatura com o secret do tenant.
    O secret global fica apenas como fallback local/teste para não travar o MVP
    antes de todos os proprietários cadastrarem o segredo individual.
  */
  if (!webhookSecretTenant && process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Webhook secret Mercado Pago nao configurado para este tenant." },
      { status: 401 }
    );
  }

  if (!webhookSecretTenant) {
    console.warn("Webhook Mercado Pago usando fallback global temporario.");
  }

  const signatureOk = validarAssinaturaMercadoPago({
    dataId: paymentId,
    requestId: request.headers.get("x-request-id"),
    secret: webhookSecret,
    signature: request.headers.get("x-signature")
  });

  if (!signatureOk) {
    return NextResponse.json({ error: "Assinatura Mercado Pago invalida." }, { status: 401 });
  }

  const accessToken = await carregarAccessTokenMercadoPago({
    fallbackSecretName: configuracao.mercado_pago_access_token_secret_name,
    tenantId
  });
  const pagamento = await buscarPagamentoMercadoPago(
    accessToken,
    configuracao.mercado_pago_access_token_secret_name,
    paymentId
  );

  if (pagamento.status !== "approved") {
    return NextResponse.json({ ignored: true, status: pagamento.status });
  }

  if (!pagamento.externalReference) {
    return NextResponse.json(
      { error: "Pagamento Mercado Pago sem referencia externa." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase.rpc("confirm_gateway_reservation_payment", {
    p_amount: pagamento.grossAmount,
    p_external_reference: pagamento.externalReference,
    p_gross_amount: pagamento.grossAmount,
    p_metadata: pagamento.metadata,
    p_net_amount: pagamento.netAmount,
    p_paid_at: pagamento.approvedAt,
    p_payment_method: pagamento.paymentMethod,
    p_provider_fee_amount: pagamento.feeAmount,
    p_provider_name: "mercado_pago",
    p_provider_payment_id: pagamento.id,
    p_provider_preference_id: pagamento.preferenceId,
    p_tenant_id: tenantId
  });

  if (error) {
    console.error("Erro ao confirmar pagamento Mercado Pago.", error.message);
    return NextResponse.json(
      { error: "Nao foi possivel confirmar o pagamento Mercado Pago." },
      { status: 500 }
    );
  }

  revalidatePath("/pendencias");
  revalidatePath("/reservas");
  revalidatePath("/financeiro");
  revalidatePath("/calendario");

  return NextResponse.json({ ok: true, result: data });
}
