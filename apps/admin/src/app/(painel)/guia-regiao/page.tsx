import { redirect } from "next/navigation";

import { RegionalGuideModule } from "../../../components/regional-guide/regional-guide-module";
import { exigirAutenticacao } from "../../../lib/auth/context";
import {
  carregarDadosGuiaRegiao,
  normalizarCategoriaGuiaRegiao,
  normalizarStatusGuiaRegiao,
  podeLerGuiaRegiao
} from "../../../lib/regional-guide/data";

/**
 * Pagina do Guia da Regiao no Gerenciamento.
 *
 * Nao publica dados para hospedes. Apenas permite organizar recomendacoes do
 * tenant para uso futuro no marketplace.
 */

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function GuiaRegiaoPage({ searchParams }: PageProps) {
  const contexto = await exigirAutenticacao();

  if (!contexto.tenant) {
    redirect(
      contexto.role === "super_admin"
        ? "/super-admin"
        : "/sem-acesso?motivo=tenant-nao-encontrado"
    );
  }

  if (!contexto.featureFlags.regional_guide) {
    redirect("/sem-acesso?motivo=feature-flag-desabilitada");
  }

  if (!podeLerGuiaRegiao(contexto)) {
    redirect("/sem-acesso?motivo=permissao-insuficiente");
  }

  const params = await searchParams;
  const erro = lerParametro(params, "erro");
  const sucesso = lerParametro(params, "sucesso");
  const dados = await carregarDadosGuiaRegiao(contexto, {
    busca: normalizarBusca(lerParametro(params, "busca")),
    categoria: normalizarCategoriaGuiaRegiao(lerParametro(params, "categoria")),
    status: normalizarStatusGuiaRegiao(lerParametro(params, "status"))
  });

  return (
    <>
      <RegionalGuideModule
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

function normalizarBusca(valor: string | undefined): string {
  return valor?.trim().slice(0, 80) ?? "";
}
