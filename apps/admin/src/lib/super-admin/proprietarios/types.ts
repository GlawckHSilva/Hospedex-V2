import type {
  AuditLogRow,
  FeatureFlagRow,
  LicenseRow,
  PlanFeatureRow,
  PlanRow,
  ProfileRow,
  SubscriptionRow,
  TenantIntegrationRow,
  TenantFeatureRow,
  TenantRow,
  TenantStatus,
  TransactionRow
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
  auditLogs: AuditLogRow[];
  featureFlagsHabilitadas: string[];
  integrations: TenantIntegrationRow[];
  license: LicenseRow | null;
  plan: PlanRow | null;
  profile: ProfileRow | null;
  subscription: SubscriptionRow | null;
  tenant: TenantRow;
  tenantFeatures: TenantFeatureRow[];
  transactions: TransactionRow[];
};

export type DadosModuloProprietarios = {
  featureFlags: FeatureFlagRow[];
  filtros: FiltrosProprietarios;
  metricas: MetricaProprietarios[];
  planFeatures: PlanFeatureRow[];
  planos: PlanRow[];
  proprietarios: ProprietarioCompleto[];
};
