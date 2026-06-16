import type { FeatureFlagRow, PlanFeatureRow, PlanRow, SubscriptionRow } from "@hospedex/types";

import type { SuperAdminTone } from "../data";

export type PlanoCompleto = {
  assinaturas: SubscriptionRow[];
  plan: PlanRow;
  planFeatures: PlanFeatureRow[];
  recursos: FeatureFlagRow[];
};

export type MetricaPlanos = {
  detalhe: string;
  label: string;
  tone: SuperAdminTone;
  valor: string;
};

export type DadosModuloPlanos = {
  featureFlags: FeatureFlagRow[];
  metricas: MetricaPlanos[];
  planos: PlanoCompleto[];
};
