import type { FeatureFlagRow, TenantFeatureRow } from "@hospedex/types";

import type { SuperAdminTone } from "../data";
import type { FeatureFlagControladaConfig } from "./config";

export type FeatureFlagControlada = FeatureFlagControladaConfig & {
  ativaPorPadrao: boolean;
  flag: FeatureFlagRow | null;
  overrides: TenantFeatureRow[];
};

export type MetricaFeatureFlags = {
  detalhe: string;
  label: string;
  tone: SuperAdminTone;
  valor: string;
};

export type DadosModuloFeatureFlags = {
  flags: FeatureFlagControlada[];
  metricas: MetricaFeatureFlags[];
};
