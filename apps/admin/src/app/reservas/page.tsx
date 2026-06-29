import type { ReservationRow, ReservationStatus } from "@hospedex/types";
import { redirect } from "next/navigation";

import { AdminLayoutBase } from "../../components/admin/admin-layout-base";
import { ReservationModule } from "../../components/reservations/reservation-module";
import { exigirAutenticacao } from "../../lib/auth/context";
import {
  carregarDadosModuloReservas,
  podeLerReservas,
} from "../../lib/reservations/data";
import {
  ORIGENS_RESERVA,
  STATUS_PAGAMENTO_RESERVA,
  STATUS_RESERVA,
  type StatusPagamentoReserva,
} from "../../lib/reservations/types";

/**
 * Página de Reservas do Admin V2.
 *
 * Toda reserva pertence a um tenant. A página valida contexto e permissão antes
 * de carregar qualquer dado operacional.
 */

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ReservasPage({ searchParams }: PageProps) {
  const contexto = await exigirAutenticacao();

  if (!contexto.tenant) {
    redirect(contexto.role === "super_admin" ? "/super-admin" : "/sem-acesso");
  }

  if (!contexto.featureFlags.manual_approval) {
    redirect("/sem-acesso?motivo=feature-flag-desabilitada");
  }

  if (!podeLerReservas(contexto)) {
    redirect("/sem-acesso?motivo=permissao-insuficiente");
  }

  const params = await searchParams;
  const filtros = montarFiltros(params);
  const dados = await carregarDadosModuloReservas(contexto, filtros);

  return (
    <AdminLayoutBase contexto={contexto}>
      <ReservationModule
        {...dados}
        erro={lerParametro(params, "erro")}
        sucesso={lerParametro(params, "sucesso")}
        tenantNome={contexto.tenant.name}
      />
    </AdminLayoutBase>
  );
}

function montarFiltros(params: Record<string, string | string[] | undefined>) {
  const filtros: {
    busca?: string;
    origem?: ReservationRow["source"] | "todos";
    pagamento?: StatusPagamentoReserva | "todos";
    propriedadeId?: string;
    dataInicio?: string;
    dataFim?: string;
    status: ReservationStatus | "todos";
  } = {
    status: lerStatus(params),
  };
  const busca = lerParametro(params, "busca");
  const propriedadeId = lerParametro(params, "propriedadeId");
  const origem = lerOrigem(params);
  const pagamento = lerPagamento(params);
  const dataInicio = lerData(params, "dataInicio");
  const dataFim = lerData(params, "dataFim");

  if (busca) filtros.busca = busca;
  if (propriedadeId) filtros.propriedadeId = propriedadeId;
  if (origem) filtros.origem = origem;
  if (pagamento) filtros.pagamento = pagamento;
  if (dataInicio) filtros.dataInicio = dataInicio;
  if (dataFim) filtros.dataFim = dataFim;

  return filtros;
}

function lerOrigem(
  params: Record<string, string | string[] | undefined>,
) {
  const valor = lerParametro(params, "origem");
  if (!valor || valor === "todos") return "todos";
  return ORIGENS_RESERVA.includes(valor as ReservationRow["source"])
    ? (valor as ReservationRow["source"])
    : "todos";
}

function lerPagamento(
  params: Record<string, string | string[] | undefined>,
) {
  const valor = lerParametro(params, "pagamento");
  if (!valor || valor === "todos") return "todos";
  return STATUS_PAGAMENTO_RESERVA.includes(valor as StatusPagamentoReserva)
    ? (valor as StatusPagamentoReserva)
    : "todos";
}

function lerParametro(
  params: Record<string, string | string[] | undefined>,
  chave: string,
): string | undefined {
  const valor = params[chave];
  return Array.isArray(valor) ? valor[0] : valor;
}

function lerStatus(
  params: Record<string, string | string[] | undefined>,
): ReservationStatus | "todos" {
  const valor = lerParametro(params, "status");
  if (!valor || valor === "todos") return "todos";
  return STATUS_RESERVA.includes(valor as ReservationStatus)
    ? (valor as ReservationStatus)
    : "todos";
}

function lerData(
  params: Record<string, string | string[] | undefined>,
  chave: string,
): string | undefined {
  const valor = lerParametro(params, chave);
  return valor && /^\d{4}-\d{2}-\d{2}$/.test(valor) ? valor : undefined;
}
