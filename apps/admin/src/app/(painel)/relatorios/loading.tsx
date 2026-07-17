import { Skeleton } from "@hospedex/ui";

/**
 * Skeleton dos Relatorios.
 *
 * Mantem a estrutura visual estavel enquanto o servidor calcula indicadores do
 * tenant autenticado.
 */

export default function RelatoriosLoading() {
  return (
    <div className="admin-shell-bg min-h-screen p-5">
      <div className="mx-auto max-w-7xl space-y-5">
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-28 rounded-lg" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, indice) => (
            <Skeleton className="h-24 rounded-lg" key={indice} />
          ))}
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          <Skeleton className="h-80 rounded-lg" />
          <Skeleton className="h-80 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
