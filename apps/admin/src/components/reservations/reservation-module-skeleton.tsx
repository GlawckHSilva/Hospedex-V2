import { Card, CardContent, FadeIn, Skeleton } from "@hospedex/ui";

/**
 * Skeleton do módulo de Reservas.
 *
 * Mantém carregamento visual consistente sem renderizar dados antes do contexto
 * de tenant e permissões ser resolvido no servidor.
 */

export function ReservationModuleSkeleton() {
  return (
    <FadeIn className="space-y-5">
      <section className="admin-glass-panel p-5">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="mt-4 h-8 w-56" />
        <Skeleton className="mt-3 h-4 w-full max-w-xl" />
      </section>

      <Card className="admin-glass-card">
        <CardContent className="grid gap-4 p-5 md:grid-cols-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </CardContent>
      </Card>

      <div className="grid gap-4">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    </FadeIn>
  );
}
