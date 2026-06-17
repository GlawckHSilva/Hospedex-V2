import { Card, CardContent, FadeIn, Skeleton } from "@hospedex/ui";

/**
 * Skeleton das notificacoes internas do Gerenciamento.
 */
export default function NotificacoesLoading() {
  return (
    <FadeIn className="space-y-5">
      <section className="admin-glass-panel p-5">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="mt-4 h-8 w-64" />
        <Skeleton className="mt-3 h-4 w-full max-w-xl" />
      </section>

      <Card className="admin-glass-card">
        <CardContent className="space-y-3 p-5">
          <Skeleton className="h-10 w-full max-w-2xl" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>

      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, indice) => (
          <Skeleton className="h-28" key={indice} />
        ))}
      </div>
    </FadeIn>
  );
}
