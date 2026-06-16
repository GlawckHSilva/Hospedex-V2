import type { FeatureFlagRow, PlanFeatureRow, PlanRow, SubscriptionRow } from "@hospedex/types";

import { criarClienteSupabaseServer } from "../../supabase/server";
import { contarSuperAdmin, lerDadosSuperAdmin } from "../query";
import type { DadosModuloPlanos, MetricaPlanos, PlanoCompleto } from "./types";

/**
 * Leitura global de planos.
 *
 * O Super Admin nao depende de tenant atual aqui; a autorizacao vem da pagina
 * via exigirSuperAdmin e das policies globais do banco.
 */

export async function carregarDadosPlanos(): Promise<DadosModuloPlanos> {
  const supabase = await criarClienteSupabaseServer();

  const [plans, featureFlags, planFeatures, assinaturas, total, ativos, rascunhos] =
    await Promise.all([
      lerDadosSuperAdmin<PlanRow[]>(
        supabase.from("plans").select("*").order("monthly_price", { ascending: true }).returns<PlanRow[]>(),
        "planos",
        []
      ),
      lerDadosSuperAdmin<FeatureFlagRow[]>(
        supabase
          .from("feature_flags")
          .select("*")
          .order("module", { ascending: true })
          .order("key", { ascending: true })
          .returns<FeatureFlagRow[]>(),
        "feature flags de planos",
        []
      ),
      lerDadosSuperAdmin<PlanFeatureRow[]>(
        supabase.from("plan_features").select("*").returns<PlanFeatureRow[]>(),
        "recursos por plano",
        []
      ),
      lerDadosSuperAdmin<SubscriptionRow[]>(
        supabase.from("subscriptions").select("*").returns<SubscriptionRow[]>(),
        "assinaturas por plano",
        []
      ),
      contarSuperAdmin(supabase.from("plans").select("id", { count: "exact", head: true }), "planos"),
      contarSuperAdmin(
        supabase.from("plans").select("id", { count: "exact", head: true }).eq("status", "active"),
        "planos ativos"
      ),
      contarSuperAdmin(
        supabase.from("plans").select("id", { count: "exact", head: true }).eq("status", "draft"),
        "planos em rascunho"
      )
    ]);

  return {
    featureFlags,
    metricas: [
      metrica("Planos", total, "Catalogo total", "info"),
      metrica("Ativos", ativos, "Disponiveis comercialmente", "success"),
      metrica("Rascunhos", rascunhos, "Ainda nao publicados", "warning")
    ],
    planos: montarPlanos(plans, featureFlags, planFeatures, assinaturas)
  };
}

function montarPlanos(
  plans: PlanRow[],
  featureFlags: FeatureFlagRow[],
  planFeatures: PlanFeatureRow[],
  assinaturas: SubscriptionRow[]
): PlanoCompleto[] {
  return plans.map((plan) => {
    const recursosDoPlano = planFeatures.filter(
      (feature) => feature.plan_id === plan.id && feature.enabled
    );
    const idsRecursos = new Set(recursosDoPlano.map((feature) => feature.feature_flag_id));

    return {
      assinaturas: assinaturas.filter((assinatura) => assinatura.plan_id === plan.id),
      plan,
      planFeatures: planFeatures.filter((feature) => feature.plan_id === plan.id),
      recursos: featureFlags.filter((flag) => idsRecursos.has(flag.id))
    };
  });
}

function metrica(
  label: string,
  valor: number,
  detalhe: string,
  tone: MetricaPlanos["tone"]
): MetricaPlanos {
  return {
    detalhe,
    label,
    tone,
    valor: Intl.NumberFormat("pt-BR").format(valor)
  };
}
