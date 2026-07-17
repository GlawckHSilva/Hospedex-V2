import { IntegrationsModule } from "../../../components/integrations/integrations-module";
import { carregarCentralIntegracoes } from "../../../lib/integrations/data";
import { exigirAcessoIntegracoes } from "../../../lib/integrations/permissions";

/** Pagina tenant-scoped da Central de Integracoes do Gerenciamento. */

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function IntegracoesPage({ searchParams }: PageProps) {
  const contexto = await exigirAcessoIntegracoes();
  const params = await searchParams;
  const dados = await carregarCentralIntegracoes(contexto);

  return (
    <>
      <IntegrationsModule
        {...dados}
        erro={lerParametro(params, "erro")}
        sucesso={lerParametro(params, "sucesso")}
      />
    </>
  );
}

function lerParametro(
  params: Record<string, string | string[] | undefined>,
  chave: string,
): string | undefined {
  const valor = params[chave];
  return Array.isArray(valor) ? valor[0] : valor;
}
