import { AdminLayoutBase } from "../../../components/admin/admin-layout-base";
import { EmpreendimentosModule } from "../../../components/super-admin/empreendimentos/empreendimentos-module";
import { exigirSuperAdmin } from "../../../lib/auth/context";
import { carregarDadosEmpreendimentos } from "../../../lib/super-admin/empreendimentos/data";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SuperAdminEmpreendimentosPage({ searchParams }: PageProps) {
  const contexto = await exigirSuperAdmin();
  const params = await searchParams;
  const dados = await carregarDadosEmpreendimentos(params);
  const erro = lerParametro(params, "erro");
  const sucesso = lerParametro(params, "sucesso");

  return (
    <AdminLayoutBase contexto={contexto}>
      <EmpreendimentosModule
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
) {
  const valor = params[chave];
  return Array.isArray(valor) ? valor[0] : valor;
}
