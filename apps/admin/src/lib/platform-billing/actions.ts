"use server";

import type {
  LicenseRow,
  PlanRow,
  PlatformSubscriptionBillingCycle,
  PlatformSubscriptionInvoiceRow,
  SubscriptionRow,
} from "@hospedex/types";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";

import { exigirAutenticacao } from "../auth/context";
import { criarClienteSupabaseAdmin } from "../supabase/admin";
import {
  criarPreferenciaAssinaturaHospedex,
  pagamentoOnlinePlataformaConfigurado,
} from "./mercado-pago";

/**
 * Server actions de cobranca da assinatura Hospedex.
 *
 * A mensalidade/anuidade da plataforma e separada das reservas dos hospedes.
 * Por isso esta action usa credenciais globais do Hospedex no servidor e grava
 * somente em platform_subscription_invoices. A licenca so sera renovada em
 * fase futura, quando o webhook confirmar o pagamento.
 */

type ResultadoCheckoutAssinatura =
  | {
      amount: number;
      checkoutUrl: string;
      invoiceId: string;
      ok: true;
      preferenceId: string;
      reused: boolean;
    }
  | {
      error: string;
      ok: false;
    };

type DadosAssinatura = {
  license: LicenseRow | null;
  plan: PlanRow;
  subscription: SubscriptionRow;
};

type ClienteAdmin = ReturnType<typeof criarClienteSupabaseAdmin>;

export async function gerarCheckoutAssinaturaHospedexAction(
  billingCycle: PlatformSubscriptionBillingCycle,
): Promise<ResultadoCheckoutAssinatura> {
  try {
    const contexto = await exigirAutenticacao();
    if (contexto.role !== "owner" || !contexto.tenant) {
      return {
        error:
          "Apenas o proprietario do empreendimento pode regularizar a assinatura.",
        ok: false,
      };
    }
    if (!pagamentoOnlinePlataformaConfigurado()) {
      return {
        error:
          "Pagamento online ainda nao configurado. Entre em contato com o suporte.",
        ok: false,
      };
    }

    const ciclo = validarCiclo(billingCycle);
    const supabaseAdmin = criarClienteSupabaseAdmin();
    const dados = await carregarDadosAssinatura(
      supabaseAdmin,
      contexto.tenant.id,
    );
    const amount = obterValorPlano(dados.plan, ciclo);
    const invoice =
      (await carregarInvoicePendenteValida(
        supabaseAdmin,
        contexto.tenant.id,
        ciclo,
      )) ??
      (await criarInvoicePendente(supabaseAdmin, {
        amount,
        billingCycle: ciclo,
        license: dados.license,
        ownerId: contexto.tenant.owner_id,
        plan: dados.plan,
        subscription: dados.subscription,
        tenantId: contexto.tenant.id,
      }));

    if (invoice.checkout_url && invoice.provider_preference_id) {
      return {
        amount: Number(invoice.amount),
        checkoutUrl: invoice.checkout_url,
        invoiceId: invoice.id,
        ok: true,
        preferenceId: invoice.provider_preference_id,
        reused: true,
      };
    }

    const preferencia = await criarPreferenciaAssinaturaHospedex({
      amount: Number(invoice.amount),
      billingCycle: ciclo,
      description: `Regularizacao ${labelCiclo(ciclo)} do plano ${dados.plan.name}`,
      externalReference: invoice.external_reference,
      invoiceId: invoice.id,
      tenantId: contexto.tenant.id,
    });
    const invoiceAtualizada = await salvarCheckoutInvoice(
      supabaseAdmin,
      invoice,
      preferencia,
    );

    revalidatePath("/configuracoes");

    return {
      amount: Number(invoiceAtualizada.amount),
      checkoutUrl: invoiceAtualizada.checkout_url!,
      invoiceId: invoiceAtualizada.id,
      ok: true,
      preferenceId: invoiceAtualizada.provider_preference_id!,
      reused: invoice.id !== invoiceAtualizada.id ? true : false,
    };
  } catch (erro) {
    console.error("Erro ao gerar checkout da assinatura Hospedex.", {
      mensagem: erro instanceof Error ? erro.message : erro,
    });

    return {
      error:
        erro instanceof Error
          ? traduzirErroCheckout(erro.message)
          : "Nao foi possivel gerar o pagamento da assinatura.",
      ok: false,
    };
  }
}

async function carregarDadosAssinatura(
  supabaseAdmin: ClienteAdmin,
  tenantId: string,
): Promise<DadosAssinatura> {
  const { data: subscription, error: erroAssinatura } = await supabaseAdmin
    .from("subscriptions")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<SubscriptionRow>();

  if (erroAssinatura) throw new Error(erroAssinatura.message);
  if (!subscription) {
    throw new Error("Assinatura do tenant nao encontrada.");
  }

  const [{ data: plan, error: erroPlano }, { data: license, error: erroLicenca }] =
    await Promise.all([
      supabaseAdmin
        .from("plans")
        .select("*")
        .eq("id", subscription.plan_id)
        .maybeSingle<PlanRow>(),
      supabaseAdmin
        .from("licenses")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle<LicenseRow>(),
    ]);

  if (erroPlano) throw new Error(erroPlano.message);
  if (!plan) throw new Error("Plano da assinatura nao encontrado.");
  if (erroLicenca) throw new Error(erroLicenca.message);

  return { license: license ?? null, plan, subscription };
}

async function carregarInvoicePendenteValida(
  supabaseAdmin: ClienteAdmin,
  tenantId: string,
  billingCycle: PlatformSubscriptionBillingCycle,
) {
  const { data, error } = await supabaseAdmin
    .from("platform_subscription_invoices")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("billing_cycle", billingCycle)
    .eq("status", "pending")
    .gte("due_date", formatarData(new Date()))
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<PlatformSubscriptionInvoiceRow>();

  if (error) throw new Error(error.message);
  return data ?? null;
}

async function criarInvoicePendente(
  supabaseAdmin: ClienteAdmin,
  entrada: {
    amount: number;
    billingCycle: PlatformSubscriptionBillingCycle;
    license: LicenseRow | null;
    ownerId: string;
    plan: PlanRow;
    subscription: SubscriptionRow;
    tenantId: string;
  },
) {
  const invoiceId = randomUUID();
  const hoje = new Date();
  const periodStart = formatarData(hoje);
  const periodEnd = formatarData(
    entrada.billingCycle === "annual"
      ? adicionarAnos(hoje, 1)
      : adicionarMeses(hoje, 1),
  );
  const dueDate = formatarData(adicionarDias(hoje, 3));

  const { data, error } = await supabaseAdmin
    .from("platform_subscription_invoices")
    .insert({
      amount: entrada.amount,
      billing_cycle: entrada.billingCycle,
      currency: "BRL",
      due_date: dueDate,
      external_reference: `hpx_platform_invoice_${invoiceId}`,
      id: invoiceId,
      license_id: entrada.license?.id ?? null,
      metadata: {
        license_expires_at: entrada.license?.expires_at ?? null,
        origem: "regularizacao_licenca",
      },
      owner_id: entrada.ownerId,
      period_end: periodEnd,
      period_start: periodStart,
      plan_id: entrada.plan.id,
      status: "pending",
      subscription_id: entrada.subscription.id,
      tenant_id: entrada.tenantId,
    })
    .select("*")
    .single<PlatformSubscriptionInvoiceRow>();

  if (error || !data) {
    throw new Error(error?.message ?? "Nao foi possivel criar a invoice.");
  }

  return data;
}

async function salvarCheckoutInvoice(
  supabaseAdmin: ClienteAdmin,
  invoice: PlatformSubscriptionInvoiceRow,
  preferencia: { checkoutUrl: string; preferenceId: string },
) {
  const { data, error } = await supabaseAdmin
    .from("platform_subscription_invoices")
    .update({
      checkout_url: preferencia.checkoutUrl,
      metadata: {
        ...(typeof invoice.metadata === "object" && invoice.metadata
          ? invoice.metadata
          : {}),
        checkout_generated_at: new Date().toISOString(),
      },
      provider: "mercado_pago",
      provider_preference_id: preferencia.preferenceId,
    })
    .eq("id", invoice.id)
    .select("*")
    .single<PlatformSubscriptionInvoiceRow>();

  if (error || !data) {
    throw new Error(error?.message ?? "Nao foi possivel salvar o checkout.");
  }

  return data;
}

function validarCiclo(
  valor: PlatformSubscriptionBillingCycle,
): PlatformSubscriptionBillingCycle {
  if (valor === "monthly" || valor === "annual") return valor;
  throw new Error("Ciclo de cobranca invalido.");
}

function obterValorPlano(
  plan: PlanRow,
  billingCycle: PlatformSubscriptionBillingCycle,
) {
  const amount =
    billingCycle === "annual" ? Number(plan.annual_price) : Number(plan.monthly_price);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Valor do plano nao configurado.");
  }

  return amount;
}

function labelCiclo(billingCycle: PlatformSubscriptionBillingCycle) {
  return billingCycle === "annual" ? "anual" : "mensal";
}

function traduzirErroCheckout(mensagem: string) {
  const texto = mensagem.toLowerCase();
  if (texto.includes("access token") || texto.includes("pagamento online")) {
    return "Pagamento online ainda nao configurado. Entre em contato com o suporte.";
  }
  if (texto.includes("assinatura")) {
    return "Assinatura do tenant nao encontrada. Entre em contato com o suporte.";
  }
  if (texto.includes("plano") || texto.includes("valor")) {
    return "Plano da assinatura incompleto. Entre em contato com o suporte.";
  }
  if (texto.includes("mercado pago") || texto.includes("checkout")) {
    return "Nao foi possivel gerar o checkout no Mercado Pago. Tente novamente em instantes.";
  }

  return "Nao foi possivel gerar o pagamento da assinatura.";
}

function adicionarDias(data: Date, dias: number) {
  const resultado = new Date(data);
  resultado.setDate(resultado.getDate() + dias);
  return resultado;
}

function adicionarMeses(data: Date, meses: number) {
  const resultado = new Date(data);
  resultado.setMonth(resultado.getMonth() + meses);
  return resultado;
}

function adicionarAnos(data: Date, anos: number) {
  const resultado = new Date(data);
  resultado.setFullYear(resultado.getFullYear() + anos);
  return resultado;
}

function formatarData(data: Date) {
  return data.toISOString().slice(0, 10);
}
