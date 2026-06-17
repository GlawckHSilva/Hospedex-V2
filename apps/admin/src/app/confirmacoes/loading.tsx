import { Card, CardContent, FadeIn, Skeleton } from "@hospedex/ui";

/**
 * Skeleton da area de confirmacoes e operacao diaria.
 */
export default function ConfirmacoesLoading() {
  return (
    <FadeIn>
      <div className="space-y-6">
        <section className="glass-panel p-6">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="mt-4 h-8 w-64" />
          <Skeleton className="mt-3 h-4 w-full max-w-xl" />
        </section>

        <section className="grid gap-4 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, indice) => (
            <Skeleton className="h-24" key={indice} />
          ))}
        </section>

        <section className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <Card>
            <CardContent className="space-y-4 p-5">
              <Skeleton className="h-8 w-56" />
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
            </CardContent>
          </Card>
          <div className="space-y-4">
            <Skeleton className="h-48" />
            <Skeleton className="h-64" />
          </div>
        </section>
      </div>
    </FadeIn>
  );
}
