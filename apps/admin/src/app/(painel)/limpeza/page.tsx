import { redirect } from "next/navigation";

import { CleaningModule } from "../../../components/cleaning/cleaning-module";
import { exigirAutenticacao } from "../../../lib/auth/context";
import { carregarDadosModuloLimpeza } from "../../../lib/cleaning/data";
import { podeLerLimpeza } from "../../../lib/cleaning/permissions";
import {
  STATUS_TAREFA_LIMPEZA,
  type TarefaLimpezaCompleta,
  type SearchParamsLimpeza,
} from "../../../lib/cleaning/types";

/**
 * Pagina operacional de Limpeza da V2.
 *
 * Check-in, check-out e tarefas de limpeza respeitam tenant, permissoes e
 * feature flag antes de carregar qualquer dado operacional.
 */

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LimpezaPage({ searchParams }: PageProps) {
  const contexto = await exigirAutenticacao();

  if (!contexto.tenant) {
    redirect(contexto.role === "super_admin" ? "/super-admin" : "/sem-acesso");
  }

  if (!contexto.featureFlags.cleaning) {
    redirect("/sem-acesso?motivo=feature-flag-desabilitada");
  }

  if (!podeLerLimpeza(contexto)) {
    redirect("/sem-acesso?motivo=permissao-insuficiente");
  }

  const params = await searchParams;
  const dataOperacao = lerData(params, "data");
  const dados = await carregarDadosModuloLimpeza(contexto, dataOperacao);

  return (
    <>
      <CleaningModule
        {...dados}
        erro={lerParametro(params, "erro")}
        statusLimpeza={lerStatusLimpeza(params)}
        sucesso={lerParametro(params, "sucesso")}
        visual={lerVisual(params)}
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

function lerData(
  params: Record<string, string | string[] | undefined>,
  chave: string
): string | undefined {
  const valor = lerParametro(params, chave);
  return valor && /^\d{4}-\d{2}-\d{2}$/.test(valor) ? valor : undefined;
}

function lerStatusLimpeza(
  params: Record<string, string | string[] | undefined>
): SearchParamsLimpeza["statusLimpeza"] {
  const valor = lerParametro(params, "statusLimpeza");
  if (!valor || valor === "todas") return "todas";

  return STATUS_TAREFA_LIMPEZA.includes(valor as TarefaLimpezaCompleta["status"])
    ? (valor as TarefaLimpezaCompleta["status"])
    : "todas";
}

function lerVisual(
  params: Record<string, string | string[] | undefined>
): SearchParamsLimpeza["visual"] {
  return lerParametro(params, "visual") === "lista" ? "lista" : "grade";
}
