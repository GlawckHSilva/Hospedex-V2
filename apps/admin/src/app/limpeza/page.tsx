import { redirect } from "next/navigation";

import { AdminLayoutBase } from "../../components/admin/admin-layout-base";
import { CleaningModule } from "../../components/cleaning/cleaning-module";
import { exigirAutenticacao } from "../../lib/auth/context";
import { carregarDadosModuloLimpeza } from "../../lib/cleaning/data";
import { podeLerLimpeza } from "../../lib/cleaning/permissions";

/**
 * Pagina operacional de Limpeza da V2.
 *
 * Check-in, check-out e tarefas de limpeza respeitam tenant, permissoes e
 * feature flag antes de carregar qualquer dado operacional.
 */

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LimpezaPage({ searchParams }: PageProps) {
  const contexto = await exigirAutenticacao();

  if (!contexto.tenant) {
    redirect(contexto.role === "super_admin" ? "/super-admin" : "/sem-acesso");
  }

  if (!podeLerLimpeza(contexto)) {
    redirect("/sem-acesso");
  }

  const params = await searchParams;
  const dados = await carregarDadosModuloLimpeza(contexto);

  return (
    <AdminLayoutBase contexto={contexto}>
      <CleaningModule
        {...dados}
        erro={lerParametro(params, "erro")}
        sucesso={lerParametro(params, "sucesso")}
      />
    </AdminLayoutBase>
  );
}

function lerParametro(
  params: Record<string, string | string[] | undefined>,
  chave: string
): string | undefined {
  const valor = params[chave];
  return Array.isArray(valor) ? valor[0] : valor;
}
