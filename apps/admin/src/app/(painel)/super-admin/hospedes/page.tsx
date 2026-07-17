import { SuperAdminModulePage } from "../../../../components/super-admin/super-admin-module-page";
import { exigirSuperAdmin } from "../../../../lib/auth/context";
import { carregarModuloSuperAdmin } from "../../../../lib/super-admin/data";

export const dynamic = "force-dynamic";

export default async function SuperAdminHospedesPage() {
  await exigirSuperAdmin();
  const dados = await carregarModuloSuperAdmin("hospedes");

  return (
    <>
      <SuperAdminModulePage dados={dados} />
    </>
  );
}
