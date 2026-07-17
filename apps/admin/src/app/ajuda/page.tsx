import { redirect } from "next/navigation";

import { AdminLayoutBase } from "../../components/admin/admin-layout-base";
import { HelpCenter } from "../../components/tutorials/help-center";
import { exigirAutenticacao } from "../../lib/auth/context";
import { carregarOnboardingGerenciamento } from "../../lib/tutorials/data";

export const dynamic = "force-dynamic";

export default async function AjudaPage() {
  const contexto = await exigirAutenticacao();

  if (!contexto.tenant || contexto.role === "super_admin") {
    redirect(contexto.role === "super_admin" ? "/super-admin" : "/sem-acesso");
  }

  const resumo = await carregarOnboardingGerenciamento(contexto);

  return (
    <AdminLayoutBase contexto={contexto}>
      <HelpCenter resumo={resumo} />
    </AdminLayoutBase>
  );
}
