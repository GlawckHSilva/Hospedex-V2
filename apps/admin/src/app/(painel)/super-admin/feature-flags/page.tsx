import { FeatureFlagsModule } from "../../../../components/super-admin/feature-flags/feature-flags-module";
import { exigirSuperAdmin } from "../../../../lib/auth/context";
import { carregarDadosFeatureFlags } from "../../../../lib/super-admin/feature-flags/data";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SuperAdminFeatureFlagsPage({ searchParams }: PageProps) {
  await exigirSuperAdmin();
  const params = await searchParams;
  const dados = await carregarDadosFeatureFlags();
  const erro = lerParametro(params, "erro");
  const sucesso = lerParametro(params, "sucesso");

  return (
    <>
      <FeatureFlagsModule
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
