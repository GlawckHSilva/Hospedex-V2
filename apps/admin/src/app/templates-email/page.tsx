import { AdminLayoutBase } from "../../components/admin/admin-layout-base";
import { EmailTemplatesModule } from "../../components/email-templates/email-templates-module";
import { carregarDadosTemplatesEmail } from "../../lib/email-templates/data";
import { exigirAcessoEmail } from "../../lib/email-templates/permissions";

/** Página de templates editáveis de e-mail do tenant autenticado. */

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TemplatesEmailPage({ searchParams }: PageProps) {
  const contexto = await exigirAcessoEmail();
  const params = await searchParams;
  const dados = await carregarDadosTemplatesEmail(contexto);

  return (
    <AdminLayoutBase contexto={contexto}>
      <EmailTemplatesModule
        {...dados}
        erro={lerParametro(params, "erro")}
        sucesso={lerParametro(params, "sucesso")}
      />
    </AdminLayoutBase>
  );
}

function lerParametro(
  params: Record<string, string | string[] | undefined>,
  chave: string,
): string | undefined {
  const valor = params[chave];
  return Array.isArray(valor) ? valor[0] : valor;
}
