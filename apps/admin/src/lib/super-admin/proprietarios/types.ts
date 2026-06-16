import type {
  FeatureFlagRow,
  LicenseRow,
  PlanFeatureRow,
  PlanRow,
  ProfileRow,
  SubscriptionRow,
  TenantFeatureRow,
  TenantRow,
  TenantStatus
} from "@hospedex/types";

/**
 * Contratos do modulo Super Admin > Proprietarios.
 *
 * Centraliza os dados necessarios para criar e manter o primeiro dono de cada
 * tenant sem misturar essa regra com telas operacionais de proprietario.
 */

export type StatusFiltroProprietario = TenantStatus | "todos";

export type FiltrosProprietarios = {
  busca: string;
  status: StatusFiltroProprietario;
};

export type MetricaProprietarios = {
  detalhe: string;
  label: string;
  tone: "success" | "warning" | "danger" | "info" | "neutral";
  valor: string;
};

export type ProprietarioCompleto = {
  featureFlagsHabilitadas: string[];
  license: LicenseRow | null;
  plan: PlanRow | null;
  profile: ProfileRow | null;
  subscription: SubscriptionRow | null;
  tenant: TenantRow;
  tenantFeatures: TenantFeatureRow[];
};

export type DadosModuloProprietarios = {
  featureFlags: FeatureFlagRow[];
  filtros: FiltrosProprietarios;
  metricas: MetricaProprietarios[];
  planFeatures: PlanFeatureRow[];
  planos: PlanRow[];
  proprietarios: ProprietarioCompleto[];
};
