import { redirect } from "next/navigation";

import { AdminHome } from "../components/admin/admin-home";
import { AdminLayoutBase } from "../components/admin/admin-layout-base";
import { OnboardingChecklist } from "../components/tutorials/onboarding-checklist";
import { exigirAutenticacao } from "../lib/auth/context";
import { carregarDadosDashboardProprietario } from "../lib/dashboard/data";
import { carregarOnboardingGerenciamento } from "../lib/tutorials/data";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const contexto = await exigirAutenticacao();

  if (contexto.role === "super_admin") {
    redirect("/super-admin");
  }

  const [dashboard, onboarding] = await Promise.all([
    carregarDadosDashboardProprietario(contexto),
    carregarOnboardingGerenciamento(contexto)
  ]);

  return (
    <AdminLayoutBase contexto={contexto} onboarding={onboarding}>
      <OnboardingChecklist resumo={onboarding} />
      <AdminHome contexto={contexto} dashboard={dashboard} />
    </AdminLayoutBase>
  );
}
