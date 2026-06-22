import { redirect } from "next/navigation";

import { exigirAutenticacao } from "../auth/context";
import type { ContextoAutenticacao } from "../auth/types";

/**
 * Centraliza autorizacao e feature flag da Central de Integracoes.
 *
 * O tenant sempre vem da sessao. IDs informados pela interface nunca escolhem
 * o cliente que sera consultado ou alterado.
 */

export function podeLerIntegracoes(contexto: ContextoAutenticacao): boolean {
  if (contexto.role === "owner") return true;
  if (contexto.role === "super_admin") return false;

  return contexto.permissions.some((permissao) =>
    ["integrations.read", "integrations.manage"].includes(permissao),
  );
}

export function podeGerenciarIntegracoes(
  contexto: ContextoAutenticacao,
): boolean {
  if (contexto.role === "owner") return true;
  return contexto.permissions.includes("integrations.manage");
}

export async function exigirAcessoIntegracoes(): Promise<ContextoAutenticacao> {
  const contexto = await exigirAutenticacao();

  if (contexto.role === "super_admin") redirect("/super-admin");
  if (!contexto.tenant) redirect("/sem-acesso?motivo=tenant-ausente");
  if (!contexto.featureFlags.integrations) {
    redirect("/sem-acesso?motivo=feature-flag-desabilitada");
  }
  if (!podeLerIntegracoes(contexto)) {
    redirect("/sem-acesso?motivo=permissao-insuficiente");
  }

  return contexto;
}
