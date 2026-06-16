import { AdminLayoutBase } from "../../../components/admin/admin-layout-base";
import { ProprietariosModule } from "../../../components/super-admin/proprietarios/proprietarios-module";
import { exigirSuperAdmin } from "../../../lib/auth/context";
import { carregarDadosProprietarios } from "../../../lib/super-admin/proprietarios/data";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SuperAdminProprietariosPage({ searchParams }: PageProps) {
  const contexto = await exigirSuperAdmin();
  const params = await searchParams;
  const dados = await carregarDadosProprietarios(params);
  const erro = lerParametro(params, "erro");
  const sucesso = lerParametro(params, "sucesso");

  return (
    <AdminLayoutBase contexto={contexto}>
      <ProprietariosModule
        {...dados}
        {...(erro ? { erro } : {})}
        {...(sucesso ? { sucesso } : {})}
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
