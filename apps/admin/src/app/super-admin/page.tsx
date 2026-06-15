import { AdminLayoutBase } from "../../components/admin/admin-layout-base";
import { AdminPlaceholderPage } from "../../components/admin/admin-placeholder-page";
import { obterItemMenuPorHref } from "../../config/navigation";
import { exigirSuperAdmin } from "../../lib/auth/context";

export const dynamic = "force-dynamic";

export default async function SuperAdminPage() {
  const contexto = await exigirSuperAdmin();
  const item = obterItemMenuPorHref(contexto, "/super-admin");

  return (
    <AdminLayoutBase contexto={contexto}>
      <AdminPlaceholderPage
        contexto={contexto}
        item={
          item ?? {
            bloqueadoPorFeatureFlag: false,
            descricao: "Visão estrutural da plataforma.",
            href: "/super-admin",
            icone: "dashboard",
            titulo: "Dashboard global"
          }
        }
      />
    </AdminLayoutBase>
  );
}
