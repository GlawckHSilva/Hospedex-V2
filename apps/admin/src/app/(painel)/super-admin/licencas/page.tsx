import { LicencasModule } from "../../../../components/super-admin/licencas/licencas-module";
import { exigirSuperAdmin } from "../../../../lib/auth/context";
import { carregarDadosLicencas } from "../../../../lib/super-admin/licencas/data";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SuperAdminLicencasPage({ searchParams }: PageProps) {
  await exigirSuperAdmin();
  const params = await searchParams;
  const dados = await carregarDadosLicencas(params);
  const erro = lerParametro(params, "erro");
  const sucesso = lerParametro(params, "sucesso");

  return (
    <>
      <LicencasModule
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
