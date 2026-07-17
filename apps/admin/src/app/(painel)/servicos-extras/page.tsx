import { redirect } from "next/navigation";

import { ExtraServicesModule } from "../../../components/extra-services/extra-services-module";
import { exigirAutenticacao } from "../../../lib/auth/context";
import {
  carregarDadosServicosExtras,
  normalizarObrigatoriedadeServicoExtra,
  normalizarStatusServicoExtra,
  normalizarTipoCobrancaServicoExtra,
  podeLerServicosExtras
} from "../../../lib/extra-services/data";

/**
 * Página de Serviços Extras do Gerenciamento.
 *
 * Esta rota não altera marketplace; apenas administra o catálogo do tenant para
 * reservas futuras e relatórios operacionais.
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
    busca: lerParametro(params, "busca")?.trim() ?? "",
    obrigatoriedade: normalizarObrigatoriedadeServicoExtra(
      lerParametro(params, "obrigatoriedade")
    ),
    status: normalizarStatusServicoExtra(lerParametro(params, "status")),
    tipoCobranca: normalizarTipoCobrancaServicoExtra(lerParametro(params, "tipoCobranca"))
  });

  return (
    <>
      <ExtraServicesModule
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
