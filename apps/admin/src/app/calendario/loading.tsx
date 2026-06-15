import { Skeleton } from "@hospedex/ui";

/**
 * Skeleton do calendario.
 *
 * Mantem a resposta visual estavel enquanto o servidor busca reservas e
 * bloqueios do tenant.
 */

export default function CalendarioLoading() {
  return (
    <div className="admin-shell-bg min-h-screen p-5">
      <div className="mx-auto max-w-7xl space-y-5">
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-96 rounded-lg" />
      </div>
    </div>
  );
}
