import { FadeIn, Skeleton } from "@hospedex/ui";

/** Skeleton compartilhado das telas de comunicacao por e-mail. */
export function EmailSkeleton() {
  return (
    <FadeIn className="space-y-5">
      <section className="admin-glass-panel p-5">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="mt-4 h-8 w-64" />
        <Skeleton className="mt-3 h-4 w-full max-w-2xl" />
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </section>
      <section className="admin-glass-panel p-4">
        <Skeleton className="h-10 w-full" />
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </section>
    </FadeIn>
  );
}
