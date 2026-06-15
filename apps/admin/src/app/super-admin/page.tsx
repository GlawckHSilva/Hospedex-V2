import { AdminLayoutBase } from "../../components/admin/admin-layout-base";
import { SuperAdminDashboard } from "../../components/super-admin/super-admin-dashboard";
import { exigirSuperAdmin } from "../../lib/auth/context";
import { carregarDashboardSuperAdmin } from "../../lib/super-admin/data";

export const dynamic = "force-dynamic";

export default async function SuperAdminPage() {
  const contexto = await exigirSuperAdmin();
  const dados = await carregarDashboardSuperAdmin(contexto);

  return (
    <AdminLayoutBase contexto={contexto}>
      <SuperAdminDashboard {...dados} />
    </AdminLayoutBase>
  );
}
