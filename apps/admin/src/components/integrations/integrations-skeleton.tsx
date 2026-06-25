import { FadeIn, Skeleton } from "@hospedex/ui";

import { EntityGrid, SkeletonCard } from "../management/entity-card";

/** Skeleton da Central de Integracoes durante a leitura do tenant. */
export function IntegrationsSkeleton() {
  return (
    <FadeIn className="space-y-5">
      <section className="admin-glass-panel p-5">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-4 h-8 w-56" />
        <Skeleton className="mt-3 h-4 w-full max-w-2xl" />
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      </section>

      <EntityGrid>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </EntityGrid>
    </FadeIn>
  );
}
