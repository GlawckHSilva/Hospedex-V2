import { Card, CardContent, FadeIn, Skeleton } from "@hospedex/ui";

/**
 * Skeleton do CRM de hospedes.
 *
 * Mantem o layout estavel enquanto tenant, permissoes e feature flags sao
 * resolvidos no servidor.
 */

export default function HospedesLoading() {
  return (
    <FadeIn className="space-y-5 p-5">
      <section className="admin-glass-panel p-5">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="mt-4 h-8 w-64" />
        <Skeleton className="mt-3 h-4 w-full max-w-xl" />
      </section>

      <Card className="admin-glass-card">
        <CardContent className="p-5">
          <Skeleton className="h-16" />
        </CardContent>
      </Card>

      <div className="grid gap-4">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    </FadeIn>
  );
}
