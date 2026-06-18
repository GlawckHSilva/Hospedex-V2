import { FadeIn, Skeleton } from "@hospedex/ui";

import { EntityGrid, SkeletonCard } from "../management/entity-card";

/**
 * Skeleton do Guia da Regiao.
 *
 * Mantem carregamento consistente com os demais modulos do Gerenciamento.
 */

export function RegionalGuideSkeleton() {
  return (
    <FadeIn className="space-y-5">
      <section className="admin-glass-panel p-5">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="mt-4 h-8 w-64" />
        <Skeleton className="mt-3 h-4 w-full max-w-2xl" />
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
