import { redirect } from "next/navigation";

import { ReviewsModule } from "../../../components/reviews/reviews-module";
import { exigirAutenticacao } from "../../../lib/auth/context";
import {
  carregarDadosAvaliacoes,
  normalizarNotaAvaliacao,
  normalizarStatusAvaliacao,
  podeLerAvaliacoes
} from "../../../lib/reviews/data";
import type { FiltrosAvaliacoes } from "../../../lib/reviews/types";

/**
 * Pagina de Avaliacoes internas do Gerenciamento.
 *
 * Nao publica comentarios no Marketplace. O objetivo desta etapa e controle
 * interno por tenant, casa, permissao e feature flag.
 */

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AvaliacoesPage({ searchParams }: PageProps) {
  const contexto = await exigirAutenticacao();

  if (!contexto.tenant) {
    redirect(
      contexto.role === "super_admin"
        ? "/super-admin"
        : "/sem-acesso?motivo=tenant-nao-encontrado"
    );
  }

  if (!contexto.featureFlags.reviews) {
    redirect("/sem-acesso?motivo=feature-flag-desabilitada");
  }

  if (!podeLerAvaliacoes(contexto)) {
    redirect("/sem-acesso?motivo=permissao-insuficiente");
  }

  const params = await searchParams;
  const erro = lerParametro(params, "erro");
  const sucesso = lerParametro(params, "sucesso");
  const dados = await carregarDadosAvaliacoes(contexto, montarFiltros(params));

  return (
    <>
      <ReviewsModule
        {...dados}
        {...(erro ? { erro } : {})}
        {...(sucesso ? { sucesso } : {})}
      />
    </>
  );
}

function montarFiltros(
  params: Record<string, string | string[] | undefined>
): FiltrosAvaliacoes {
  const filtros: FiltrosAvaliacoes = {
    nota: normalizarNotaAvaliacao(lerParametro(params, "nota")),
    status: normalizarStatusAvaliacao(lerParametro(params, "status"))
  };
  const dataFim = lerData(params, "dataFim");
  const dataInicio = lerData(params, "dataInicio");
  const propriedadeId = lerParametro(params, "propriedadeId");

  if (dataFim) filtros.dataFim = dataFim;
  if (dataInicio) filtros.dataInicio = dataInicio;
  if (propriedadeId) filtros.propriedadeId = propriedadeId;

  return filtros;
}

function lerParametro(
  params: Record<string, string | string[] | undefined>,
  chave: string
): string | undefined {
  const valor = params[chave];
  return Array.isArray(valor) ? valor[0] : valor;
}

function lerData(
  params: Record<string, string | string[] | undefined>,
  chave: string
): string | undefined {
  const valor = lerParametro(params, chave);
  return valor && /^\d{4}-\d{2}-\d{2}$/.test(valor) ? valor : undefined;
}
