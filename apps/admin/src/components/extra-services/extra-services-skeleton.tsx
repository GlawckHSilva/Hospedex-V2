import { Card, CardContent, FadeIn, Skeleton } from "@hospedex/ui";

/**
 * Skeleton do modulo de Servicos Extras.
 *
 * Evita tela vazia enquanto o contexto multi-tenant e o catalogo sao carregados.
 */

export function ExtraServicesSkeleton() {
  return (
    <FadeIn className="space-y-5">
      <section className="admin-glass-panel p-5">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-4 h-8 w-64" />
        <Skeleton className="mt-3 h-4 w-full max-w-2xl" />
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </section>

      <Card className="admin-glass-card">
        <CardContent className="grid gap-4 p-5">
          <Skeleton className="h-12" />
          <Skeleton className="h-32" />
        </CardContent>
      </Card>
    </FadeIn>
  );
}
