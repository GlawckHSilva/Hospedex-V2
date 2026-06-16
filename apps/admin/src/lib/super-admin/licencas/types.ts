import type { LicenseRow, PlanRow, ProfileRow, SubscriptionRow, TenantRow } from "@hospedex/types";

import type { SuperAdminTone } from "../data";

export type StatusFiltroLicenca = LicenseRow["status"] | "todos";

export type FiltrosLicencas = {
  status: StatusFiltroLicenca;
};

export type LicencaCompleta = {
  diasRestantes: number | null;
  licenca: LicenseRow;
  owner: ProfileRow | null;
  plan: PlanRow | null;
  subscription: SubscriptionRow | null;
  tenant: TenantRow | null;
};

export type MetricaLicencas = {
  detalhe: string;
  label: string;
  tone: SuperAdminTone;
  valor: string;
};

export type DadosModuloLicencas = {
  filtros: FiltrosLicencas;
  licencas: LicencaCompleta[];
  metricas: MetricaLicencas[];
};
