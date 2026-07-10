import type { CrmGuestStatus } from "@hospedex/types";
import { redirect } from "next/navigation";

import { AdminLayoutBase } from "../../components/admin/admin-layout-base";
import { GuestsModule } from "../../components/guests/guests-module";
import { exigirAutenticacao } from "../../lib/auth/context";
import { carregarDadosModuloHospedes } from "../../lib/guests/data";
import { podeLerHospedes } from "../../lib/guests/permissions";
import { STATUS_HOSPEDE_CRM } from "../../lib/guests/types";

/**
 * Pagina de Hospedes e CRM da V2.
 *
 * O acesso depende do tenant atual, permissao operacional e feature flag CRM.
 * Super Admin nao mistura dados de proprietarios nesta rota.
 */

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function HospedesPage({ searchParams }: PageProps) {
  const contexto = await exigirAutenticacao();

  if (!contexto.tenant) {
    redirect(contexto.role === "super_admin" ? "/super-admin" : "/sem-acesso");
  }

  if (!contexto.featureFlags.crm) {
    redirect("/sem-acesso?motivo=feature-flag-desabilitada");
  }

  if (!podeLerHospedes(contexto)) {
    redirect("/sem-acesso?motivo=permissao-insuficiente");
  }

  const params = await searchParams;
  const filtros = montarFiltros(params);
  const dados = await carregarDadosModuloHospedes(contexto, filtros);

  return (
    <AdminLayoutBase contexto={contexto}>
      <GuestsModule
        {...dados}
        erro={lerParametro(params, "erro")}
        sucesso={lerParametro(params, "sucesso")}
      />
    </AdminLayoutBase>
  );
}

function montarFiltros(params: Record<string, string | string[] | undefined>) {
  const filtros: {
    busca?: string;
    status?: CrmGuestStatus | "todos";
  } = {
    status: lerStatus(params)
  };
  const busca = lerParametro(params, "busca");

  if (busca) filtros.busca = busca;
  return filtros;
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
): CrmGuestStatus | "todos" {
  const valor = lerParametro(params, "status");
  if (!valor || valor === "todos") return "todos";
  return STATUS_HOSPEDE_CRM.includes(valor as CrmGuestStatus)
    ? (valor as CrmGuestStatus)
    : "todos";
}
