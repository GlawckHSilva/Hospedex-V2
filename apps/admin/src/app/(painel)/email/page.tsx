import { EmailModule } from "../../../components/email/email-module";
import { carregarDadosCentralEmail } from "../../../lib/email-templates/data";
import { exigirAcessoEmail } from "../../../lib/email-templates/permissions";

/** Central visual de e-mail, sem envio real nesta etapa. */

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EmailPage({ searchParams }: PageProps) {
  const contexto = await exigirAcessoEmail();
  const params = await searchParams;
  const dados = await carregarDadosCentralEmail(contexto);

  return (
    <>
      <EmailModule
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
