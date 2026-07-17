import type { ReactNode } from "react";

import type { TenantSettingRow } from "@hospedex/types";
import { LogOut } from "lucide-react";

import { sairAction } from "../../lib/auth/actions";
import type { ContextoAutenticacao } from "../../lib/auth/types";
import { carregarEstadoLicencaTenant } from "../../lib/license-state";
import { carregarResumoNotificacoesGerenciamento } from "../../lib/notifications/data";
import { criarClienteSupabaseServer } from "../../lib/supabase/server";
import { carregarOnboardingGerenciamento } from "../../lib/tutorials/data";
import { OnboardingRuntime } from "../tutorials/onboarding-runtime";
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
  const [notificacoes, logoConfiguracoesUrl, estadoLicenca, onboarding] = await Promise.all([
    carregarResumoNotificacoesGerenciamento(contexto),
    carregarLogoConfiguracoesGerenciamento(contexto),
    contexto.tenant && contexto.role !== "super_admin"
      ? carregarEstadoLicencaTenant(contexto.tenant.id)
      : null,
    carregarOnboardingGerenciamento(contexto)
  ]);

  return (
    <AdminShell
      acaoSairMenu={<AcaoSair variante="menu" />}
      acaoSairMobile={<AcaoSair variante="sidebar" />}
      acaoSairSidebar={<AcaoSair variante="sidebar" />}
      contexto={contexto}
      estadoLicenca={estadoLicenca}
      logoConfiguracoesUrl={logoConfiguracoesUrl}
      notificacoes={notificacoes}
    >
      {children}
      <OnboardingRuntime resumo={onboarding} />
    </AdminShell>
  );
}

async function carregarLogoConfiguracoesGerenciamento(contexto: ContextoAutenticacao) {
  // A logo das configuracoes e usada apenas como identidade visual do tenant.
  // A autorizacao continua vindo do contexto autenticado para preservar o isolamento multi-tenant.
  if (contexto.role === "super_admin" || !contexto.tenant) {
    return null;
  }

  const supabase = await criarClienteSupabaseServer();
  const { data, error } = await supabase
    .from("tenant_settings")
    .select("logo_url")
    .eq("tenant_id", contexto.tenant.id)
    .maybeSingle<Pick<TenantSettingRow, "logo_url">>();

  if (error) {
    console.error("Nao foi possivel carregar a logo das configuracoes do tenant.", error.message);
    return null;
  }

  return data?.logo_url ?? null;
}

function AcaoSair({ variante }: { variante: "menu" | "sidebar" }) {
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
