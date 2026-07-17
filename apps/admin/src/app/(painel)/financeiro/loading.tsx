import { Skeleton } from "@hospedex/ui";

/**
 * Skeleton do financeiro.
 *
 * Mantém a estrutura do painel estável enquanto indicadores e lançamentos do
 * tenant são carregados no servidor.
 */

export default function FinanceiroLoading() {
  return (
    <div className="admin-shell-bg min-h-screen p-5">
      <div className="mx-auto max-w-7xl space-y-5">
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-80 rounded-lg" />
      </div>
    </div>
  );
}
