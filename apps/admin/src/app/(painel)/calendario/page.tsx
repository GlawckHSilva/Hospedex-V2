import { redirect } from "next/navigation";

import { CalendarModule } from "../../../components/calendar/calendar-module";
import { exigirAutenticacao } from "../../../lib/auth/context";
import {
  carregarDadosModuloCalendario,
  normalizarSemanaCalendario,
  normalizarMesCalendario,
  normalizarVisaoCalendario,
  podeLerCalendario
} from "../../../lib/calendar/data";

/**
 * Pagina de Calendario do Admin V2.
 *
 * A rota renderiza a agenda por casa do tenant atual. O escopo autenticado
 * continua vindo do servidor; a query string apenas escolhe a casa visualizada.
 */

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CalendarioPage({ searchParams }: PageProps) {
  const contexto = await exigirAutenticacao();

  if (!contexto.tenant) {
    redirect(contexto.role === "super_admin" ? "/super-admin" : "/sem-acesso");
  }

  if (!contexto.featureFlags.calendar) {
    redirect("/sem-acesso?motivo=feature-flag-desabilitada");
  }

  if (!podeLerCalendario(contexto)) {
    redirect("/sem-acesso?motivo=permissao-insuficiente");
  }

  const params = await searchParams;
  const filtros = montarFiltros(params);
  const dados = await carregarDadosModuloCalendario(contexto, filtros);

  return (
    <>
      <CalendarModule
        {...dados}
        erro={lerParametro(params, "erro")}
        sucesso={lerParametro(params, "sucesso")}
        tenantNome={contexto.tenant.name}
      />
    </>
  );
}

function montarFiltros(params: Record<string, string | string[] | undefined>) {
  const mes = normalizarMesCalendario(lerParametro(params, "mes"));
  const filtros: {
    mes: string;
    semana: string;
    visao: "mensal" | "semanal" | "agenda";
    propriedadeId?: string;
  } = {
    mes,
    semana: normalizarSemanaCalendario(lerParametro(params, "semana"), mes),
    visao: normalizarVisaoCalendario(lerParametro(params, "visao"))
  };
  const propriedadeId = lerParametro(params, "propriedadeId") ?? lerParametro(params, "casa");

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
