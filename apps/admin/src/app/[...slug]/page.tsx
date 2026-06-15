import { notFound } from "next/navigation";

import { AdminLayoutBase } from "../../components/admin/admin-layout-base";
import { AdminPlaceholderPage } from "../../components/admin/admin-placeholder-page";
import { obterItemMenuPorHref } from "../../config/navigation";
import { exigirAutenticacao } from "../../lib/auth/context";

export const dynamic = "force-dynamic";

export default async function AdminPlaceholderRoute({
  params
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const contexto = await exigirAutenticacao();
  const { slug } = await params;
  const href = `/${slug.join("/")}`;
  const item = obterItemMenuPorHref(contexto, href);

  if (!item) {
    notFound();
  }

  return (
    <AdminLayoutBase contexto={contexto}>
      <AdminPlaceholderPage contexto={contexto} item={item} />
    </AdminLayoutBase>
  );
}
