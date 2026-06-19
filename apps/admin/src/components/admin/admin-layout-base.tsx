import type { ReactNode } from "react";

import { Button } from "@hospedex/ui";
import { LogOut } from "lucide-react";

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
      acaoSairHeader={<AcaoSair variante="header" />}
      acaoSairMenu={<AcaoSair variante="menu" />}
      acaoSairMobile={<AcaoSair variante="sidebar" />}
      acaoSairSidebar={<AcaoSair variante="sidebar" />}
      contexto={contexto}
      notificacoes={notificacoes}
    >
      {children}
    </AdminShell>
  );
}

function AcaoSair({ variante }: { variante: "header" | "menu" | "sidebar" }) {
  if (variante === "header") {
    return (
      <form action={sairAction}>
        {/* O Super Admin preserva o logout direto do layout antigo para evitar mudança fora do Gerenciamento. */}
        <Button size="sm" type="submit" variant="outline">
          Sair
        </Button>
      </form>
    );
  }

  const classes =
    variante === "sidebar"
      ? "flex h-10 w-full items-center gap-2 rounded-lg border border-transparent px-3 text-sm font-medium text-muted-foreground transition duration-200 hover:border-rose-400/20 hover:bg-rose-500/10 hover:text-rose-700 dark:hover:text-rose-200"
      : "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-muted-foreground transition hover:bg-rose-500/10 hover:text-rose-700 dark:hover:text-rose-200";

  return (
    <form action={sairAction} className="w-full">
      {/* O logout continua centralizado na Server Action para preservar a sessão do Supabase. */}
      <button className={classes} type="submit">
        <LogOut className="h-4 w-4" />
        <span>Sair</span>
      </button>
    </form>
  );
}
