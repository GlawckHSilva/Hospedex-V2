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
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Skeleton className="h-9 w-40" />
          <Skeleton className="mt-3 h-4 w-full max-w-xl" />
        </div>
        <Skeleton className="h-11 w-36" />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        {Array.from({ length: 7 }).map((_, index) => (
          <Skeleton className="h-20" key={index} />
        ))}
      </section>

      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 7 }).map((_, index) => (
          <Skeleton className="h-10 w-32" key={index} />
        ))}
      </div>

      <Card className="admin-glass-card">
        <CardContent className="grid gap-4 p-5 xl:grid-cols-[1.35fr_0.8fr_1fr_auto_auto]">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </CardContent>
      </Card>

      <Card className="admin-glass-card overflow-hidden">
        <CardContent className="space-y-0 p-0">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton className="h-16 rounded-none border-b border-border/50" key={index} />
          ))}
        </CardContent>
      </Card>
    </FadeIn>
  );
}
