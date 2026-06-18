import { redirect } from "next/navigation";

import { exigirAutenticacao } from "../auth/context";
import type { ContextoAutenticacao } from "../auth/types";

/**
 * Autoriza o modulo de Funcionarios.
 *
 * Super Admin usa painel global. Proprietario pode gerir o proprio tenant; um
 * funcionario so entra se ja possuir permissoes administrativas explicitas.
 */
export async function exigirGestaoFuncionarios(): Promise<ContextoAutenticacao> {
  const contexto = await exigirAutenticacao();

  if (contexto.role === "super_admin") redirect("/super-admin");
  if (!contexto.tenant) redirect("/sem-acesso?motivo=tenant-ausente");
  if (!contexto.featureFlags.staff) {
    redirect("/sem-acesso?motivo=feature-flag-desabilitada");
  }

  if (contexto.role === "owner") return contexto;

  const podeGerenciar =
    contexto.permissions.includes("members.manage") &&
    contexto.permissions.includes("roles.manage");

  if (!podeGerenciar) redirect("/sem-acesso?motivo=permissao-insuficiente");

  return contexto;
}
