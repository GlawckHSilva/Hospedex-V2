import type { JsonValue, LicenseRow, PlanRow, SubscriptionRow } from "@hospedex/types";

import { criarClienteSupabaseServer } from "./supabase/server";

const DIAS_TOLERANCIA_LICENCA = 5;
const LIMITE_PADRAO_PROPRIEDADES = 1;
const MENSAGEM_BLOQUEIO_LICENCA =
  "Licenca vencida. Regularize o pagamento para continuar usando esta funcao.";

type LicencaConsulta = Pick<LicenseRow, "expires_at" | "limits" | "status">;
type AssinaturaConsulta = Pick<SubscriptionRow, "plan_id" | "status">;
type PlanoConsulta = Pick<PlanRow, "max_properties" | "name">;

export type EstadoLicencaTenant = {
  canUseNormally: boolean;
  daysUntilGraceEnds: number | null;
  effectiveMaxProperties: number;
  isInGracePeriod: boolean;
  isReadOnlyByExpiredLicense: boolean;
  licenseMessage: string | null;
  status: "active" | "trialing" | "grace_period" | "expired_readonly" | "blocked" | "missing";
};

/**
 * Centraliza a regra comercial de licenca.
 *
 * A licenca vencida por ate 5 dias continua operacional para nao interromper o
 * proprietario imediatamente. Depois disso, o tenant fica somente leitura.
 */
export async function carregarEstadoLicencaTenant(tenantId: string): Promise<EstadoLicencaTenant> {
  const supabase = await criarClienteSupabaseServer();
  const hoje = dataLocalHoje();
  const [{ data: licenca }, { data: assinatura }] = await Promise.all([
    supabase
      .from("licenses")
      .select("status,expires_at,limits")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<LicencaConsulta>(),
    supabase
      .from("subscriptions")
      .select("plan_id,status")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<AssinaturaConsulta>(),
  ]);

  const plano = assinatura?.plan_id ? await carregarPlano(assinatura.plan_id) : null;
  const limiteLicenca = obterLimitePropriedadesLicenca(licenca?.limits);
  const estado = calcularEstadoLicenca(licenca, hoje);

  return {
    ...estado,
    effectiveMaxProperties:
      limiteLicenca ?? plano?.max_properties ?? LIMITE_PADRAO_PROPRIEDADES,
  };
}

export async function exigirLicencaPermiteAcoesTenant(tenantId: string) {
  const estado = await carregarEstadoLicencaTenant(tenantId);
  if (estado.isReadOnlyByExpiredLicense) {
    throw new Error(estado.licenseMessage ?? MENSAGEM_BLOQUEIO_LICENCA);
  }
}

export function obterLimitePropriedadesLicenca(limits: JsonValue | undefined): number | null {
  if (!limits || typeof limits !== "object" || Array.isArray(limits)) return null;
  const limite = limits.max_properties;
  return typeof limite === "number" && Number.isFinite(limite)
    ? Math.max(1, Math.trunc(limite))
    : null;
}

async function carregarPlano(planId: string): Promise<PlanoConsulta | null> {
  const supabase = await criarClienteSupabaseServer();
  const { data } = await supabase
    .from("plans")
    .select("name,max_properties")
    .eq("id", planId)
    .maybeSingle<PlanoConsulta>();
  return data ?? null;
}

function calcularEstadoLicenca(
  licenca: LicencaConsulta | null,
  hoje: string,
): Omit<EstadoLicencaTenant, "effectiveMaxProperties"> {
  if (!licenca) {
    return estadoBloqueado("Licenca nao encontrada. Regularize o acesso para criar novas acoes.", "missing");
  }

  if (licenca.status === "suspended" || licenca.status === "cancelled") {
    return estadoBloqueado("Licenca bloqueada. Regularize o acesso para continuar.", "blocked");
  }

  if (!licenca.expires_at || licenca.expires_at >= hoje) {
    return {
      canUseNormally: true,
      daysUntilGraceEnds: null,
      isInGracePeriod: false,
      isReadOnlyByExpiredLicense: false,
      licenseMessage: null,
      status: licenca.status === "trial" ? "trialing" : "active",
    };
  }

  const diasVencida = diferencaDias(licenca.expires_at, hoje);
  if (diasVencida <= DIAS_TOLERANCIA_LICENCA) {
    const restantes = DIAS_TOLERANCIA_LICENCA - diasVencida;
    return {
      canUseNormally: true,
      daysUntilGraceEnds: restantes,
      isInGracePeriod: true,
      isReadOnlyByExpiredLicense: false,
      licenseMessage: `Sua licenca venceu. Voce esta dentro do periodo de tolerancia de 5 dias. Regularize o pagamento para evitar bloqueios.${restantes > 0 ? ` Restam ${restantes} dia(s).` : ""}`,
      status: "grace_period",
    };
  }

  return estadoBloqueado(
    "Sua licenca esta vencida. Voce ainda pode visualizar seus dados, mas novas acoes estao bloqueadas ate a regularizacao.",
    "expired_readonly",
  );
}

function estadoBloqueado(
  mensagem: string,
  status: EstadoLicencaTenant["status"],
): Omit<EstadoLicencaTenant, "effectiveMaxProperties"> {
  return {
    canUseNormally: false,
    daysUntilGraceEnds: null,
    isInGracePeriod: false,
    isReadOnlyByExpiredLicense: true,
    licenseMessage: mensagem,
    status,
  };
}

function diferencaDias(inicio: string, fim: string) {
  const inicioUtc = Date.UTC(Number(inicio.slice(0, 4)), Number(inicio.slice(5, 7)) - 1, Number(inicio.slice(8, 10)));
  const fimUtc = Date.UTC(Number(fim.slice(0, 4)), Number(fim.slice(5, 7)) - 1, Number(fim.slice(8, 10)));
  return Math.max(0, Math.floor((fimUtc - inicioUtc) / 86_400_000));
}

function dataLocalHoje() {
  return new Date().toISOString().slice(0, 10);
}
