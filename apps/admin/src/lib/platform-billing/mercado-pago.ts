import "server-only";

import { normalizarVariavelAmbiente } from "../supabase/env";

/**
 * Cliente Mercado Pago da assinatura Hospedex.
 *
 * Esta camada usa somente a conta global da plataforma. Ela nao deve reutilizar
 * credenciais dos proprietarios, pois a mensalidade Hospedex nao pertence ao
 * fluxo financeiro das reservas nem ao Mercado Pago configurado por tenant.
 */

const API_BASE_PADRAO = "https://api.mercadopago.com";

type PreferenciaAssinaturaEntrada = {
  amount: number;
  billingCycle: "monthly" | "annual";
  description: string;
  externalReference: string;
  invoiceId: string;
  tenantId: string;
};

type PreferenciaAssinaturaResposta = {
  checkoutUrl: string;
  preferenceId: string;
};

export async function criarPreferenciaAssinaturaHospedex(
  entrada: PreferenciaAssinaturaEntrada,
): Promise<PreferenciaAssinaturaResposta> {
  const token = obterAccessTokenPlataforma();
  const backUrls = obterBackUrlsAssinatura();
  const body = {
    ...(backUrls ? { auto_return: "approved", back_urls: backUrls } : {}),
    external_reference: entrada.externalReference,
    items: [
      {
        currency_id: "BRL",
        description: entrada.description,
        quantity: 1,
        title:
          entrada.billingCycle === "annual"
            ? "Regularizacao anual Hospedex"
            : "Regularizacao mensal Hospedex",
        unit_price: entrada.amount,
      },
    ],
    metadata: {
      billing_cycle: entrada.billingCycle,
      invoice_id: entrada.invoiceId,
      origem: "hospedex_platform_subscription",
      tenant_id: entrada.tenantId,
    },
  };

  const resposta = await fetch(
    `${obterBaseApiMercadoPago()}/checkout/preferences`,
    {
      body: JSON.stringify(body),
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  );

  const payload = (await resposta.json().catch(() => null)) as
    | {
        id?: string;
        init_point?: string;
        message?: string;
        sandbox_init_point?: string;
      }
    | null;
  const checkoutUrl = payload?.init_point ?? payload?.sandbox_init_point;

  if (!resposta.ok || !payload?.id || !checkoutUrl) {
    throw new Error(
      payload?.message ??
        "Nao foi possivel gerar o checkout da assinatura Hospedex.",
    );
  }

  return {
    checkoutUrl,
    preferenceId: payload.id,
  };
}

export function pagamentoOnlinePlataformaConfigurado() {
  return Boolean(obterAccessTokenPlataformaOpcional());
}

function obterAccessTokenPlataforma() {
  const token = obterAccessTokenPlataformaOpcional();

  if (!token) {
    throw new Error(
      "Pagamento online ainda nao configurado. Entre em contato com o suporte.",
    );
  }

  return token;
}

function obterAccessTokenPlataformaOpcional() {
  return normalizarVariavelAmbiente(
    process.env.HOSPEDEX_MERCADO_PAGO_ACCESS_TOKEN,
  );
}

function obterBaseApiMercadoPago() {
  return (
    normalizarVariavelAmbiente(process.env.MERCADO_PAGO_API_BASE_URL) ??
    API_BASE_PADRAO
  );
}

function obterBackUrlsAssinatura() {
  const base = obterAppUrlSeguro();
  if (!base) return null;

  return {
    failure: `${base}/configuracoes?erro=${encodeURIComponent(
      "Pagamento nao concluido.",
    )}`,
    pending: `${base}/configuracoes?sucesso=assinatura-pendente`,
    success: `${base}/configuracoes?sucesso=assinatura-checkout`,
  };
}

function obterAppUrlSeguro() {
  const urlConfigurada =
    normalizarVariavelAmbiente(process.env.HOSPEDEX_APP_URL) ??
    normalizarVariavelAmbiente(process.env.APP_PUBLIC_URL) ??
    normalizarVariavelAmbiente(process.env.NEXT_PUBLIC_APP_URL);

  if (urlConfigurada) return urlConfigurada.replace(/\/$/, "");

  const vercelUrl =
    normalizarVariavelAmbiente(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
    normalizarVariavelAmbiente(process.env.VERCEL_URL);

  if (!vercelUrl) return null;

  return `https://${vercelUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
}
