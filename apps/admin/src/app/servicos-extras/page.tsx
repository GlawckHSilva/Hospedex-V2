import { redirect } from "next/navigation";

import { AdminLayoutBase } from "../../components/admin/admin-layout-base";
import { ExtraServicesModule } from "../../components/extra-services/extra-services-module";
import { exigirAutenticacao } from "../../lib/auth/context";
import {
  carregarDadosServicosExtras,
  normalizarStatusServicoExtra,
  podeLerServicosExtras
} from "../../lib/extra-services/data";

/**
 * Pagina de Servicos Extras do Gerenciamento.
 *
 * Esta rota nao altera marketplace; apenas administra o catalogo do tenant para
 * reservas futuras e relatorios operacionais.
 */

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ServicosExtrasPage({ searchParams }: PageProps) {
  const contexto = await exigirAutenticacao();

  if (!contexto.tenant) {
    redirect(
      contexto.role === "super_admin"
        ? "/super-admin"
        : "/sem-acesso?motivo=tenant-nao-encontrado"
    );
  }

  if (!contexto.featureFlags.extra_services) {
    redirect("/sem-acesso?motivo=feature-flag-desabilitada");
  }

  if (!podeLerServicosExtras(contexto)) {
    redirect("/sem-acesso?motivo=permissao-insuficiente");
  }

  const params = await searchParams;
  const erro = lerParametro(params, "erro");
  const sucesso = lerParametro(params, "sucesso");
  const dados = await carregarDadosServicosExtras(contexto, {
    status: normalizarStatusServicoExtra(lerParametro(params, "status"))
  });

  return (
    <AdminLayoutBase contexto={contexto}>
      <ExtraServicesModule
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
