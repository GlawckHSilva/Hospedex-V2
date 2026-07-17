import { SuperAdminModulePage } from "../../../../components/super-admin/super-admin-module-page";
import { exigirSuperAdmin } from "../../../../lib/auth/context";
import { carregarModuloSuperAdmin } from "../../../../lib/super-admin/data";

export const dynamic = "force-dynamic";

export default async function SuperAdminAuditoriaPage() {
  await exigirSuperAdmin();
  const dados = await carregarModuloSuperAdmin("auditoria");

  return (
    <>
      <SuperAdminModulePage dados={dados} />
    </>
  );
}
