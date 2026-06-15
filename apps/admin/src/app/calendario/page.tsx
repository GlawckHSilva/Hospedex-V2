import { redirect } from "next/navigation";

import { AdminLayoutBase } from "../../components/admin/admin-layout-base";
import { CalendarModule } from "../../components/calendar/calendar-module";
import { exigirAutenticacao } from "../../lib/auth/context";
import {
  carregarDadosModuloCalendario,
  normalizarSemanaCalendario,
  normalizarMesCalendario,
  normalizarVisaoCalendario,
  podeLerCalendario
} from "../../lib/calendar/data";

/**
 * Pagina de Calendario do Admin V2.
 *
 * A rota renderiza disponibilidade mensal por propriedade/unidade do tenant
 * atual e nunca usa filtros para trocar o escopo autenticado.
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

  if (!podeLerCalendario(contexto)) {
    redirect("/sem-acesso");
  }

  const params = await searchParams;
  const filtros = montarFiltros(params);
  const dados = await carregarDadosModuloCalendario(contexto, filtros);

  return (
    <AdminLayoutBase contexto={contexto}>
      <CalendarModule
        {...dados}
        erro={lerParametro(params, "erro")}
        sucesso={lerParametro(params, "sucesso")}
        tenantNome={contexto.tenant.name}
      />
    </AdminLayoutBase>
  );
}

function montarFiltros(params: Record<string, string | string[] | undefined>) {
  const mes = normalizarMesCalendario(lerParametro(params, "mes"));
  const filtros: {
    mes: string;
    semana: string;
    visao: "mensal" | "semanal";
    propriedadeId?: string;
    unidadeId?: string;
  } = {
    mes,
    semana: normalizarSemanaCalendario(lerParametro(params, "semana"), mes),
    visao: normalizarVisaoCalendario(lerParametro(params, "visao"))
  };
  const propriedadeId = lerParametro(params, "propriedadeId");
  const unidadeId = lerParametro(params, "unidadeId");

  if (propriedadeId) filtros.propriedadeId = propriedadeId;
  if (unidadeId) filtros.unidadeId = unidadeId;

  return filtros;
}

function lerParametro(
  params: Record<string, string | string[] | undefined>,
  chave: string
): string | undefined {
  const valor = params[chave];
  return Array.isArray(valor) ? valor[0] : valor;
}
