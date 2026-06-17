import type {
  FiltroStatusNotificacao,
  FiltroTipoNotificacao
} from "../../lib/notifications/types";
import { redirect } from "next/navigation";

import { AdminLayoutBase } from "../../components/admin/admin-layout-base";
import { NotificationsModule } from "../../components/notifications/notifications-module";
import { exigirAutenticacao } from "../../lib/auth/context";
import {
  carregarNotificacoesGerenciamento,
  podeUsarNotificacoesGerenciamento
} from "../../lib/notifications/data";

/**
 * Pagina de notificacoes internas do Gerenciamento.
 *
 * Super Admin usa a visao global propria; este modulo pertence ao tenant do
 * proprietario e da equipe operacional.
 */
export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NotificacoesPage({ searchParams }: PageProps) {
  const contexto = await exigirAutenticacao();

  if (!contexto.tenant) {
    redirect(
      contexto.role === "super_admin"
        ? "/super-admin"
        : "/sem-acesso?motivo=tenant-nao-encontrado"
    );
  }

  if (!podeUsarNotificacoesGerenciamento(contexto)) {
    redirect("/sem-acesso?motivo=permissao-insuficiente");
  }

  const params = await searchParams;
  const filtros = montarFiltros(params);
  const dados = await carregarNotificacoesGerenciamento(contexto, filtros);

  return (
    <AdminLayoutBase contexto={contexto}>
      <NotificationsModule
        {...dados}
        erro={lerParametro(params, "erro")}
        sucesso={lerParametro(params, "sucesso")}
        tenantNome={contexto.tenant.name}
      />
    </AdminLayoutBase>
  );
}

function montarFiltros(
  params: Record<string, string | string[] | undefined>
) {
  return {
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
): FiltroStatusNotificacao {
  const valor = lerParametro(params, "status");
  return valor === "lidas" || valor === "nao_lidas" ? valor : "todas";
}

function lerTipo(
  params: Record<string, string | string[] | undefined>
): FiltroTipoNotificacao {
  const valor = lerParametro(params, "tipo");
  const tipos: FiltroTipoNotificacao[] = [
    "checkin_today",
    "checkout_today",
    "cleaning_pending",
    "license_expiring",
    "new_reservation",
    "payment_awaiting_confirmation",
    "payment_confirmed",
    "reservation_cancelled"
  ];

  return tipos.includes(valor as FiltroTipoNotificacao)
    ? (valor as FiltroTipoNotificacao)
    : "todos";
}
