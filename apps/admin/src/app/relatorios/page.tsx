import { redirect } from "next/navigation";

import { AdminLayoutBase } from "../../components/admin/admin-layout-base";
import { ReportsModule } from "../../components/reports/reports-module";
import { exigirAutenticacao } from "../../lib/auth/context";
import {
  carregarDadosModuloRelatorios,
  montarFiltrosRelatorios
} from "../../lib/reports/data";
import { podeLerRelatorios } from "../../lib/reports/permissions";

/**
 * Pagina de Relatorios do proprietario.
 *
 * Super Admin nao usa esta rota para evitar mistura de visao global com dados
 * de tenant. Funcionarios dependem de permissao reports.read.
 */

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RelatoriosPage({ searchParams }: PageProps) {
  const contexto = await exigirAutenticacao();

  if (!contexto.tenant) {
    redirect(contexto.role === "super_admin" ? "/super-admin" : "/sem-acesso");
  }

  if (!contexto.featureFlags.reports) {
    redirect("/sem-acesso?motivo=feature-flag-desabilitada");
  }

  if (!podeLerRelatorios(contexto)) {
    redirect("/sem-acesso?motivo=permissao-insuficiente");
  }

  const params = await searchParams;
  const dados = await carregarDadosModuloRelatorios(
    contexto,
    montarFiltrosRelatorios(params)
  );

  return (
    <AdminLayoutBase contexto={contexto}>
      <ReportsModule {...dados} />
    </AdminLayoutBase>
  );
}
