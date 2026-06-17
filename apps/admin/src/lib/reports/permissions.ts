import type { ContextoAutenticacao } from "../auth/types";

/**
 * Permissoes dos Relatorios.
 *
 * Relatorio cruza reservas, financeiro e hospedes. Por isso, funcionarios
 * precisam de permissao explicita, e o proprietario so acessa quando a feature
 * flag do tenant esta ativa.
 */

export function relatoriosAtivos(contexto: ContextoAutenticacao): boolean {
  return Boolean(contexto.featureFlags.reports);
}

export function podeLerRelatorios(contexto: ContextoAutenticacao): boolean {
  if (!relatoriosAtivos(contexto)) return false;
  if (contexto.role === "owner") return true;
  return contexto.permissions.includes("reports.read");
}
