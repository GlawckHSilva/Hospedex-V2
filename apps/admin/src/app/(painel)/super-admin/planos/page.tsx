import { PlanosModule } from "../../../../components/super-admin/planos/planos-module";
import { exigirSuperAdmin } from "../../../../lib/auth/context";
import { carregarDadosPlanos } from "../../../../lib/super-admin/planos/data";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SuperAdminPlanosPage({ searchParams }: PageProps) {
  await exigirSuperAdmin();
  const params = await searchParams;
  const dados = await carregarDadosPlanos();
  const erro = lerParametro(params, "erro");
  const sucesso = lerParametro(params, "sucesso");

  return (
    <>
      <PlanosModule
        {...dados}
        {...(erro ? { erro } : {})}
        {...(sucesso ? { sucesso } : {})}
      />
    </>
  );
}

function lerParametro(
  params: Record<string, string | string[] | undefined>,
  chave: string
): string | undefined {
  const valor = params[chave];
  return Array.isArray(valor) ? valor[0] : valor;
}
