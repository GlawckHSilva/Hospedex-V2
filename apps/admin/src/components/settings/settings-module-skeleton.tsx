import { Card, CardContent, FadeIn, Skeleton } from "@hospedex/ui";

/**
 * Skeleton do modulo de Configuracoes.
 *
 * Mantem feedback visual enquanto sessao, tenant e feature flags sao resolvidos
 * no servidor, sem inventar dados do empreendimento.
 */

export function SettingsModuleSkeleton() {
  return (
    <FadeIn className="space-y-5">
      <section className="admin-glass-panel p-5">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-4 h-8 w-72" />
        <Skeleton className="mt-3 h-4 w-full max-w-2xl" />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="admin-glass-card">
          <CardContent className="grid gap-4 p-5">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-24" />
          </CardContent>
        </Card>
        <Card className="admin-glass-card">
          <CardContent className="grid gap-4 p-5">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-24" />
          </CardContent>
        </Card>
      </section>
    </FadeIn>
  );
}
