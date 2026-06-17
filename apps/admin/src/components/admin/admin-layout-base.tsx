import type { ReactNode } from "react";

import { Button } from "@hospedex/ui";

import { sairAction } from "../../lib/auth/actions";
import type { ContextoAutenticacao } from "../../lib/auth/types";
import { carregarResumoNotificacoesGerenciamento } from "../../lib/notifications/data";
import { AdminShell } from "./admin-shell";

export type AdminLayoutBaseProps = {
  children: ReactNode;
  contexto: ContextoAutenticacao;
};

/**
 * Layout base protegido do Admin.
 *
 * Recebe o contexto já carregado no servidor para que o menu respeite tenant,
 * role, permissões e feature flags sem recalcular autorização no cliente.
 */
export async function AdminLayoutBase({ children, contexto }: AdminLayoutBaseProps) {
  const notificacoes = await carregarResumoNotificacoesGerenciamento(contexto);

  return (
    <AdminShell
      acaoSair={
        <form action={sairAction}>
          <Button size="sm" type="submit" variant="outline">
            Sair
          </Button>
        </form>
      }
      contexto={contexto}
      notificacoes={notificacoes}
    >
      {children}
    </AdminShell>
  );
}
