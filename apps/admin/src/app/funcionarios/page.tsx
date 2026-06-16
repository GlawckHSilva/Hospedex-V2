import { AdminLayoutBase } from "../../components/admin/admin-layout-base";
import { FuncionariosModule } from "../../components/staff/funcionarios-module";
import { exigirGestaoFuncionarios } from "../../lib/staff/access";
import { carregarDadosFuncionarios } from "../../lib/staff/data";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function FuncionariosPage({ searchParams }: PageProps) {
  const contexto = await exigirGestaoFuncionarios();
  const params = await searchParams;
  const dados = await carregarDadosFuncionarios(contexto.tenant!.id, params);
  const erro = lerParametro(params, "erro");
  const sucesso = lerParametro(params, "sucesso");

  return (
    <AdminLayoutBase contexto={contexto}>
      <FuncionariosModule
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
