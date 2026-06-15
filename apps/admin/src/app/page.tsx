import { redirect } from "next/navigation";

import { AdminHome } from "../components/admin/admin-home";
import { AdminLayoutBase } from "../components/admin/admin-layout-base";
import { exigirAutenticacao } from "../lib/auth/context";
import { carregarDadosDashboardProprietario } from "../lib/dashboard/data";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const contexto = await exigirAutenticacao();

  if (contexto.role === "super_admin") {
    redirect("/super-admin");
  }

  const dashboard = await carregarDadosDashboardProprietario(contexto);

  return (
    <AdminLayoutBase contexto={contexto}>
      <AdminHome contexto={contexto} dashboard={dashboard} />
    </AdminLayoutBase>
  );
}
