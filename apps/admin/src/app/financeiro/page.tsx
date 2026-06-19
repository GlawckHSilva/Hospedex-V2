import type { TransactionStatus } from "@hospedex/types";
import { redirect } from "next/navigation";

import { AdminLayoutBase } from "../../components/admin/admin-layout-base";
import { FinanceModule } from "../../components/finance/finance-module";
import { exigirAutenticacao } from "../../lib/auth/context";
import {
  carregarDadosModuloFinanceiro,
  normalizarMesFinanceiro,
  podeLerFinanceiro
} from "../../lib/finance/data";
import {
  STATUS_LANCAMENTO_FINANCEIRO,
  TIPOS_LANCAMENTO_FINANCEIRO,
  type TipoLancamentoFinanceiro
} from "../../lib/finance/types";

/**
 * Página Financeiro do Admin V2.
 *
 * A rota carrega apenas dados do tenant autenticado. Pagamentos online seguem
 * como feature flag futura e não bloqueiam o financeiro manual.
 */

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function FinanceiroPage({ searchParams }: PageProps) {
  const contexto = await exigirAutenticacao();

  if (!contexto.tenant) {
    redirect(contexto.role === "super_admin" ? "/super-admin" : "/sem-acesso");
  }

  if (!podeLerFinanceiro(contexto)) {
    redirect("/sem-acesso");
  }

  const params = await searchParams;
  const dados = await carregarDadosModuloFinanceiro(contexto, montarFiltros(params));

  return (
    <AdminLayoutBase contexto={contexto}>
      <FinanceModule
        {...dados}
        erro={lerParametro(params, "erro")}
        sucesso={lerParametro(params, "sucesso")}
        tenantNome={contexto.tenant.name}
      />
    </AdminLayoutBase>
  );
}

function montarFiltros(params: Record<string, string | string[] | undefined>) {
  return {
    busca: lerParametro(params, "busca")?.trim() ?? "",
    categoriaId: lerParametro(params, "categoriaId") ?? "todas",
    mes: normalizarMesFinanceiro(lerParametro(params, "mes")),
    status: lerStatus(params),
    tipo: lerTipo(params)
  };
}

function lerParametro(
  params: Record<string, string | string[] | undefined>,
  chave: string
): string | undefined {
  const valor = params[chave];
  return Array.isArray(valor) ? valor[0] : valor;
}

function lerStatus(
  params: Record<string, string | string[] | undefined>
): TransactionStatus | "todos" {
  const valor = lerParametro(params, "status");
  if (!valor || valor === "todos") return "todos";
  return STATUS_LANCAMENTO_FINANCEIRO.includes(valor as TransactionStatus)
    ? (valor as TransactionStatus)
    : "todos";
}

function lerTipo(
  params: Record<string, string | string[] | undefined>
): TipoLancamentoFinanceiro | "todos" {
  const valor = lerParametro(params, "tipo");
  if (!valor || valor === "todos") return "todos";
  return TIPOS_LANCAMENTO_FINANCEIRO.includes(valor as TipoLancamentoFinanceiro)
    ? (valor as TipoLancamentoFinanceiro)
    : "todos";
}
