import { FadeIn, Skeleton } from "@hospedex/ui";

/**
 * Skeleton do Guia da Regiao.
 *
 * Mantem carregamento consistente com os demais modulos do Gerenciamento.
 */

export function RegionalGuideSkeleton() {
  return (
    <FadeIn className="space-y-5">
      <section className="admin-glass-panel p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-3 h-4 w-96 max-w-full" />
          </div>
          <Skeleton className="hidden h-11 w-36 sm:block" />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      </section>

      <section className="admin-glass-card p-5">
        <Skeleton className="h-20 w-full" />
      </section>

      <section>
        <Skeleton className="h-6 w-52" />
        <Skeleton className="mt-3 h-4 w-full max-w-2xl" />
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
        </div>
      </section>
    </FadeIn>
  );
}
