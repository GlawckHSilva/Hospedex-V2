import { FadeIn, Skeleton } from "@hospedex/ui";

import { EntityGrid, SkeletonCard } from "../management/entity-card";

/**
 * Skeleton das páginas de Propriedades e Unidades.
 *
 * Mantém a percepção de carregamento sem simular dados reais antes da sessão e
 * do tenant serem resolvidos no servidor.
 */

export function PropertyModuleSkeleton() {
  return (
    <FadeIn className="space-y-5">
      <section className="admin-glass-panel p-5">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="mt-4 h-8 w-64" />
        <Skeleton className="mt-3 h-4 w-full max-w-xl" />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </section>

      <EntityGrid>
        <SkeletonCard withMedia />
        <SkeletonCard withMedia />
        <SkeletonCard withMedia />
      </EntityGrid>
    </FadeIn>
  );
}
