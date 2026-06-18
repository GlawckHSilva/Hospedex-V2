import { FadeIn, Skeleton } from "@hospedex/ui";

import { EntityGrid, SkeletonCard } from "../management/entity-card";

export function ReviewsSkeleton() {
  return (
    <FadeIn className="space-y-5">
      <section className="admin-glass-panel p-5">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="mt-4 h-8 w-64" />
        <Skeleton className="mt-3 h-4 w-full max-w-2xl" />
      </section>

      <EntityGrid>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </EntityGrid>
    </FadeIn>
  );
}
