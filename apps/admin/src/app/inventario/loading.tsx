import { Card, CardContent, FadeIn, Skeleton } from "@hospedex/ui";

/**
 * Skeleton do modulo de Inventario.
 *
 * Mantem o painel estavel enquanto tenant, permissoes e feature flags sao
 * resolvidos no servidor.
 */

export default function InventarioLoading() {
  return (
    <FadeIn className="space-y-5 p-5">
      <section className="admin-glass-panel p-5">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="mt-4 h-8 w-72" />
        <Skeleton className="mt-3 h-4 w-full max-w-xl" />
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>

      <Card className="admin-glass-card">
        <CardContent className="p-5">
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    </FadeIn>
  );
}
