import { redirect } from "next/navigation";

import { exigirAutenticacao } from "../auth/context";
import type { ContextoAutenticacao } from "../auth/types";

/**
 * Autorização da Comunicação por E-mail.
 *
 * O módulo usa a liberação de Integrações porque e-mail ainda depende da
 * decisão do Super Admin sobre quais conectores o tenant pode utilizar.
 */

export function podeLerEmail(contexto: ContextoAutenticacao): boolean {
  if (contexto.role === "owner") return true;
  if (contexto.role === "super_admin") return false;

  return contexto.permissions.some((permissao) =>
    ["integrations.read", "integrations.manage"].includes(permissao),
  );
}

export function podeGerenciarEmail(contexto: ContextoAutenticacao): boolean {
  if (contexto.role === "owner") return true;
  return contexto.permissions.includes("integrations.manage");
}

export async function exigirAcessoEmail(): Promise<ContextoAutenticacao> {
  const contexto = await exigirAutenticacao();

  if (contexto.role === "super_admin") redirect("/super-admin");
  if (!contexto.tenant) redirect("/sem-acesso?motivo=tenant-ausente");
  if (!contexto.featureFlags.integrations) {
    redirect("/sem-acesso?motivo=feature-flag-desabilitada");
  }
  if (!podeLerEmail(contexto)) {
    redirect("/sem-acesso?motivo=permissao-insuficiente");
  }

  return contexto;
}
