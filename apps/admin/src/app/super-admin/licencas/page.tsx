import { AdminLayoutBase } from "../../../components/admin/admin-layout-base";
import { SuperAdminModulePage } from "../../../components/super-admin/super-admin-module-page";
import { exigirSuperAdmin } from "../../../lib/auth/context";
import { carregarModuloSuperAdmin } from "../../../lib/super-admin/data";

export const dynamic = "force-dynamic";

export default async function SuperAdminLicencasPage() {
  const contexto = await exigirSuperAdmin();
  const dados = await carregarModuloSuperAdmin("licencas");

  return (
    <AdminLayoutBase contexto={contexto}>
      <SuperAdminModulePage dados={dados} />
    </AdminLayoutBase>
  );
}
