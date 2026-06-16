import type { FeatureFlagRow, TenantFeatureRow } from "@hospedex/types";

import { criarClienteSupabaseServer } from "../../supabase/server";
import { lerDadosSuperAdmin } from "../query";
import { FEATURE_FLAGS_CONTROLADAS } from "./config";
import type {
  DadosModuloFeatureFlags,
  FeatureFlagControlada,
  MetricaFeatureFlags
} from "./types";

/**
 * Leitura das feature flags globais administradas na V2.
 *
 * A tela mostra tambem flags ainda nao criadas; ao alternar, a action faz
 * upsert seguro pela chave unica.
 */
export async function carregarDadosFeatureFlags(): Promise<DadosModuloFeatureFlags> {
  const supabase = await criarClienteSupabaseServer();
  const [featureFlags, tenantFeatures] = await Promise.all([
    lerDadosSuperAdmin<FeatureFlagRow[]>(
      supabase
        .from("feature_flags")
        .select("*")
        .order("module", { ascending: true })
        .order("key", { ascending: true })
        .returns<FeatureFlagRow[]>(),
      "feature flags",
      []
    ),
    lerDadosSuperAdmin<TenantFeatureRow[]>(
      supabase.from("tenant_features").select("*").returns<TenantFeatureRow[]>(),
      "overrides de feature flags",
      []
    )
  ]);

  const flags = montarFlags(featureFlags, tenantFeatures);
  const ativas = flags.filter((flag) => flag.ativaPorPadrao).length;
  const criadas = flags.filter((flag) => Boolean(flag.flag)).length;
  const overrides = flags.reduce((total, flag) => total + flag.overrides.length, 0);

  return {
    flags,
    metricas: [
      metrica("Controladas", flags.length, "Recursos no Super Admin", "info"),
      metrica("Ativas", ativas, "Ativas por padrao", "success"),
      metrica("Overrides", overrides, `${criadas} cadastradas no banco`, "warning")
    ]
  };
}

function montarFlags(
  featureFlags: FeatureFlagRow[],
  tenantFeatures: TenantFeatureRow[]
): FeatureFlagControlada[] {
  const porKey = new Map(featureFlags.map((flag) => [flag.key, flag]));

  return FEATURE_FLAGS_CONTROLADAS.map((config) => {
    const flag = porKey.get(config.key) ?? null;

    return {
      ...config,
      ativaPorPadrao: Boolean(flag?.default_enabled),
      flag,
      overrides: flag
        ? tenantFeatures.filter((tenantFeature) => tenantFeature.feature_flag_id === flag.id)
        : []
    };
  });
}

function metrica(
  label: string,
  valor: number,
  detalhe: string,
  tone: MetricaFeatureFlags["tone"]
): MetricaFeatureFlags {
  return {
    detalhe,
    label,
    tone,
    valor: Intl.NumberFormat("pt-BR").format(valor)
  };
}
