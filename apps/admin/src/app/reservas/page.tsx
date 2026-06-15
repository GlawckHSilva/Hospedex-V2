import type { ReservationStatus } from "@hospedex/types";
import { redirect } from "next/navigation";

import { AdminLayoutBase } from "../../components/admin/admin-layout-base";
import { ReservationModule } from "../../components/reservations/reservation-module";
import { exigirAutenticacao } from "../../lib/auth/context";
import {
  carregarDadosModuloReservas,
  podeLerReservas
} from "../../lib/reservations/data";
import { STATUS_RESERVA } from "../../lib/reservations/types";

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

  if (!podeLerReservas(contexto)) {
    redirect("/sem-acesso");
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
    propriedadeId?: string;
    status: ReservationStatus | "todos";
  } = {
    status: lerStatus(params)
  };
  const busca = lerParametro(params, "busca");
  const propriedadeId = lerParametro(params, "propriedadeId");

  if (busca) filtros.busca = busca;
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

function lerStatus(
  params: Record<string, string | string[] | undefined>
): ReservationStatus | "todos" {
  const valor = lerParametro(params, "status");
  if (!valor || valor === "todos") return "todos";
  return STATUS_RESERVA.includes(valor as ReservationStatus)
    ? (valor as ReservationStatus)
    : "todos";
}
