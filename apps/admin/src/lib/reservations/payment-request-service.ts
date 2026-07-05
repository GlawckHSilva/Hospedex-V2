import "server-only";

import type {
  ReservationChargeRow,
  ReservationChargeType,
  ReservationGuestRow,
  ReservationRow,
  TenantSettingRow
} from "@hospedex/types";

import {
  criarPreferenciaMercadoPago,
  type PreferenciaMercadoPagoResposta
} from "../payments/mercado-pago";
import { carregarAccessTokenMercadoPago } from "../payments/mercado-pago-credentials";
import { normalizarVariavelAmbiente } from "../supabase/env";
import type { ClienteSupabaseServer } from "./permissions";

/**
 * Motor central de cobranca da reserva.
 *
 * Marketplace, reserva manual e futuras origens devem chegar aqui apos a
 * aprovacao do proprietario. Isso evita regras duplicadas entre telas.
 */

export type MetodoCobrancaReserva = "default" | "manual" | "mercado_pago";
export type EstrategiaCobrancaReserva =
  | "default"
  | "full"
  | "deposit_percent"
  | "deposit_fixed"
  | "manual_amount";

export type EntradaCobrancaReserva = {
  dueHours: number | null;
  fixedAmount: number | null;
  manualAmount: number | null;
  method: MetodoCobrancaReserva;
  percent: number | null;
  reason: string;
  strategy: EstrategiaCobrancaReserva;
};

export type EscopoCobrancaReserva = {
  ownerId: string;
  tenantId: string;
  userId: string;
};

type DadosCobrancaCalculada = {
  amount: number;
  chargeType: ReservationChargeType;
  dueAt: string;
  method: "manual" | "mercado_pago";
  strategy: Exclude<EstrategiaCobrancaReserva, "default">;
};

export function obterEntradaCobrancaReserva(formData: FormData): EntradaCobrancaReserva {
  return {
    dueHours: numeroDecimalOpcional(formData, "prazoCobrancaHoras"),
    fixedAmount: numeroDecimalOpcional(formData, "valorSinalFixo"),
    manualAmount:
      numeroDecimalOpcional(formData, "valorManualCobranca") ??
      numeroDecimalOpcional(formData, "valorCobranca"),
    method: validarMetodoCobranca(textoOpcional(formData, "metodoCobranca") ?? "default"),
    percent: numeroDecimalOpcional(formData, "percentualSinal"),
    reason:
      textoOpcional(formData, "motivo") ??
      textoOpcional(formData, "observacao") ??
      "Reserva aprovada e cobranca criada pelo gerenciamento.",
    strategy: validarEstrategiaCobranca(
      textoOpcional(formData, "estrategiaCobranca") ?? "default"
    )
  };
}

export async function aprovarReservaComMotorDeCobranca({
  entrada,
  escopo,
  reserva,
  supabase
}: {
  entrada: EntradaCobrancaReserva;
  escopo: EscopoCobrancaReserva;
  reserva: ReservationRow;
  supabase: ClienteSupabaseServer;
}) {
  const [configuracao, hospede] = await Promise.all([
    carregarConfiguracaoPagamento(supabase, escopo),
    carregarHospedePrincipal(supabase, escopo, reserva.id)
  ]);
  const cobranca = calcularCobranca(reserva, configuracao, entrada);
  let preferencia: PreferenciaMercadoPagoResposta | null = null;
  const referenciaGateway = criarReferenciaGateway(reserva.id);

  if (cobranca.method === "mercado_pago") {
    validarContatoGateway(hospede);
    const accessToken = await carregarAccessTokenMercadoPago({
      fallbackSecretName: configuracao.mercado_pago_access_token_secret_name,
      tenantId: escopo.tenantId
    });
    preferencia = await criarPreferenciaMercadoPago({
      accessToken,
      amount: cobranca.amount,
      currency: reserva.currency,
      description: `Cobranca da reserva ${reserva.code}`,
      expiresAt: cobranca.dueAt,
      externalReference: referenciaGateway,
      notificationUrl: montarWebhookUrl(escopo.tenantId),
      payerEmail: hospede?.email ?? null,
      payerName: hospede?.full_name ?? null,
      payerPhone: hospede?.phone ?? null,
      reservationCode: reserva.code
    });
  }

  const { error } = await supabase.rpc("approve_reservation_charge_operational", {
    p_charge_amount: cobranca.amount,
    p_charge_type: cobranca.chargeType,
    p_due_at: cobranca.dueAt,
    p_owner_id: escopo.ownerId,
    p_reason: entrada.reason,
    p_reservation_id: reserva.id,
    p_tenant_id: escopo.tenantId,
    p_user_id: escopo.userId
  });

  if (error) {
    throw new Error(error.message);
  }

  const charge = await carregarUltimaCobranca(supabase, escopo, reserva.id);
  const metadata = {
    metodoSolicitado: entrada.method,
    origemMotorCobranca: "hospedex_v2",
    strategy: cobranca.strategy
  };

  if (cobranca.method === "mercado_pago" && preferencia) {
    const paymentLink =
      configuracao.mercado_pago_environment === "sandbox" && preferencia.sandboxInitPoint
        ? preferencia.sandboxInitPoint
        : preferencia.initPoint;

    await atualizarCobrancaMercadoPago(supabase, charge, {
      metadata,
      paymentLink,
      preferenceId: preferencia.id,
      providerExternalReference: referenciaGateway
    });
    await registrarNotaCobranca(
      supabase,
      escopo,
      reserva.id,
      "Cobranca Mercado Pago gerada. O link esta disponivel nos detalhes da reserva."
    );
    return { chargeId: charge.id, method: "mercado_pago" as const, paymentLink };
  }

  await atualizarCobrancaManual(supabase, charge, {
    instructions: montarInstrucoesManuais(configuracao, reserva),
    metadata
  });
  await registrarNotaCobranca(
    supabase,
    escopo,
    reserva.id,
    "Cobranca manual gerada com as instrucoes configuradas pelo proprietario."
  );

  return { chargeId: charge.id, method: "manual" as const, paymentLink: null };
}

function calcularCobranca(
  reserva: ReservationRow,
  configuracao: TenantSettingRow,
  entrada: EntradaCobrancaReserva
): DadosCobrancaCalculada {
  const metodo = resolverMetodo(configuracao, entrada.method);
  const strategy = resolverEstrategia(configuracao, entrada.strategy);
  const total = Number(reserva.total_amount);
  const amount = arredondarMoeda(
    strategy === "full"
      ? total
      : strategy === "deposit_percent"
        ? total * ((entrada.percent ?? configuracao.mercado_pago_default_deposit_percent ?? 30) / 100)
        : strategy === "deposit_fixed"
          ? entrada.fixedAmount ?? configuracao.mercado_pago_default_deposit_fixed ?? total
          : entrada.manualAmount ?? total
  );

  if (amount <= 0 || amount > total) {
    throw new Error("Valor da cobranca invalido para esta reserva.");
  }

  const prazoHoras =
    entrada.dueHours ??
    (metodo === "mercado_pago"
      ? configuracao.mercado_pago_default_deadline_hours
      : configuracao.manual_payment_deadline_hours);

  return {
    amount,
    chargeType: amount >= total ? "full" : "deposit",
    dueAt: new Date(Date.now() + prazoHoras * 60 * 60 * 1000).toISOString(),
    method: metodo,
    strategy
  };
}

function resolverMetodo(configuracao: TenantSettingRow, metodo: MetodoCobrancaReserva) {
  if (metodo === "manual") return "manual";
  if (metodo === "mercado_pago") {
    if (!configuracao.mercado_pago_enabled) {
      throw new Error("Mercado Pago nao esta ativo nas configuracoes do proprietario.");
    }
    return "mercado_pago";
  }

  return configuracao.payment_collection_method === "mercado_pago" &&
    configuracao.mercado_pago_enabled
    ? "mercado_pago"
    : "manual";
}

function resolverEstrategia(
  configuracao: TenantSettingRow,
  strategy: EstrategiaCobrancaReserva
): Exclude<EstrategiaCobrancaReserva, "default"> {
  if (strategy !== "default") return strategy;
  return configuracao.mercado_pago_default_charge_strategy;
}

async function carregarConfiguracaoPagamento(
  supabase: ClienteSupabaseServer,
  escopo: EscopoCobrancaReserva
) {
  const { data, error } = await supabase
    .from("tenant_settings")
    .select("*")
    .eq("tenant_id", escopo.tenantId)
    .eq("owner_id", escopo.ownerId)
    .maybeSingle<TenantSettingRow>();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Configuracoes de pagamento do tenant nao encontradas.");
  return data;
}

async function carregarHospedePrincipal(
  supabase: ClienteSupabaseServer,
  escopo: EscopoCobrancaReserva,
  reservationId: string
) {
  const { data, error } = await supabase
    .from("reservation_guests")
    .select("*")
    .eq("tenant_id", escopo.tenantId)
    .eq("reservation_id", reservationId)
    .eq("is_primary", true)
    .maybeSingle<ReservationGuestRow>();

  if (error) throw new Error(error.message);
  return data;
}

async function carregarUltimaCobranca(
  supabase: ClienteSupabaseServer,
  escopo: EscopoCobrancaReserva,
  reservationId: string
) {
  const { data, error } = await supabase
    .from("reservation_charges")
    .select("*")
    .eq("tenant_id", escopo.tenantId)
    .eq("reservation_id", reservationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<ReservationChargeRow>();

  if (error || !data) {
    throw new Error(error?.message ?? "Cobranca criada nao foi encontrada.");
  }

  return data;
}

async function atualizarCobrancaMercadoPago(
  supabase: ClienteSupabaseServer,
  charge: ReservationChargeRow,
  entrada: {
    metadata: Record<string, unknown>;
    paymentLink: string;
    preferenceId: string;
    providerExternalReference: string;
  }
) {
  const { error } = await supabase
    .from("reservation_charges")
    .update({
      manual_instructions: "Pagamento automatico via link seguro do Mercado Pago.",
      metadata: entrada.metadata,
      payment_link: entrada.paymentLink,
      payment_link_sent_at: new Date().toISOString(),
      payment_provider: "gateway",
      provider_external_reference: entrada.providerExternalReference,
      provider_name: "mercado_pago",
      provider_preference_id: entrada.preferenceId
    })
    .eq("id", charge.id)
    .eq("tenant_id", charge.tenant_id);

  if (error) throw new Error(error.message);
}

async function atualizarCobrancaManual(
  supabase: ClienteSupabaseServer,
  charge: ReservationChargeRow,
  entrada: { instructions: string; metadata: Record<string, unknown> }
) {
  const { error } = await supabase
    .from("reservation_charges")
    .update({
      manual_instructions: entrada.instructions,
      metadata: entrada.metadata,
      payment_provider: "manual",
      provider_name: "manual"
    })
    .eq("id", charge.id)
    .eq("tenant_id", charge.tenant_id);

  if (error) throw new Error(error.message);
}

async function registrarNotaCobranca(
  supabase: ClienteSupabaseServer,
  escopo: EscopoCobrancaReserva,
  reservationId: string,
  content: string
) {
  const { error } = await supabase.from("reservation_notes").insert({
    content,
    created_by: escopo.userId,
    note_type: "system",
    reservation_id: reservationId,
    tenant_id: escopo.tenantId
  });

  if (error) throw new Error(error.message);
}

function montarWebhookUrl(tenantId: string) {
  const base = normalizarVariavelAmbiente(process.env.APP_PUBLIC_URL);
  if (!base) {
    throw new Error("APP_PUBLIC_URL nao configurada para montar webhook do Mercado Pago.");
  }
  return `${base.replace(/\/$/, "")}/api/webhooks/mercado-pago?tenant=${encodeURIComponent(tenantId)}`;
}

function montarInstrucoesManuais(configuracao: TenantSettingRow, reserva: ReservationRow) {
  const linhas = [
    "Sua reserva foi aprovada pelo proprietario.",
    "Para concluir a confirmacao, realize o pagamento usando as instrucoes abaixo.",
    configuracao.pix_key ? `Pix: ${configuracao.pix_key}` : null,
    configuracao.pix_receiver_name ? `Recebedor: ${configuracao.pix_receiver_name}` : null,
    configuracao.payment_receiver_document
      ? `Documento: ${configuracao.payment_receiver_document}`
      : null,
    configuracao.pix_bank_name ? `Banco: ${configuracao.pix_bank_name}` : null,
    configuracao.pix_payment_note,
    configuracao.bank_transfer_payment_instructions,
    `Reserva: ${reserva.code}`
  ].filter(Boolean);

  return linhas.join("\n");
}

function validarContatoGateway(hospede: ReservationGuestRow | null) {
  if (hospede?.email || hospede?.phone) return;
  throw new Error("Informe e-mail ou WhatsApp do hospede para enviar a cobranca.");
}

function criarReferenciaGateway(reservationId: string) {
  return `hpx_${reservationId}_${Date.now().toString(36)}`;
}

function arredondarMoeda(valor: number) {
  return Math.round(valor * 100) / 100;
}

function validarMetodoCobranca(valor: string): MetodoCobrancaReserva {
  if (["default", "manual", "mercado_pago"].includes(valor)) {
    return valor as MetodoCobrancaReserva;
  }
  throw new Error("Metodo de cobranca invalido.");
}

function validarEstrategiaCobranca(valor: string): EstrategiaCobrancaReserva {
  if (["default", "full", "deposit_percent", "deposit_fixed", "manual_amount"].includes(valor)) {
    return valor as EstrategiaCobrancaReserva;
  }
  throw new Error("Tipo de cobranca invalido.");
}

function numeroDecimalOpcional(formData: FormData, chave: string): number | null {
  const valor = formData.get(chave)?.toString().replace(",", ".").trim();
  if (!valor) return null;
  const numero = Number(valor);
  if (!Number.isFinite(numero)) throw new Error("Informe um valor numerico valido.");
  return numero;
}

function textoOpcional(formData: FormData, chave: string): string | null {
  const valor = formData.get(chave)?.toString().trim();
  return valor ? valor : null;
}
