import { Badge, Card, CardContent, FadeIn, Skeleton } from "@hospedex/ui";

import type { ItemMenuAdminResolvido } from "../../config/navigation";
import type { ContextoAutenticacao } from "../../lib/auth/types";

export type AdminPlaceholderPageProps = {
  contexto: ContextoAutenticacao;
  item: ItemMenuAdminResolvido;
};

/**
 * Placeholder padrão para páginas principais do Admin.
 *
 * Mantém navegação e estrutura visual prontas, mas evita implementar regras reais
 * de reservas, financeiro, propriedades ou relatórios antes das etapas corretas.
 */
export function AdminPlaceholderPage({ contexto, item }: AdminPlaceholderPageProps) {
  return (
    <FadeIn className="space-y-5">
      <section className="admin-glass-panel p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Badge variant={item.bloqueadoPorFeatureFlag ? "warning" : "info"}>
              {item.bloqueadoPorFeatureFlag ? "Feature flag desligada" : "Estrutura pronta"}
            </Badge>
            <h1 className="mt-3 text-2xl font-semibold tracking-normal">{item.titulo}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{item.descricao}</p>
          </div>
          <div className="rounded-lg border bg-background/55 px-3 py-2 text-sm text-muted-foreground">
            {contexto.tenant?.name ?? "Plataforma"}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="admin-glass-card">
          <CardContent className="space-y-4 p-5">
            <div>
              <p className="font-semibold">Área em preparação</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Esta página reserva o espaço do módulo sem criar CRUD, integrações ou regras de negócio.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          </CardContent>
        </Card>

        <Card className="admin-glass-card">
          <CardContent className="space-y-3 p-5">
            <p className="font-semibold">Contexto aplicado</p>
            <LinhaContexto label="Role" valor={contexto.role} />
            <LinhaContexto label="Permissões" valor={String(contexto.permissions.length)} />
            <LinhaContexto
              label="Feature flag"
              valor={item.featureFlag ?? "não exigida"}
            />
            <LinhaContexto
              label="Status"
              valor={item.bloqueadoPorFeatureFlag ? "bloqueado por flag" : "visível"}
            />
          </CardContent>
        </Card>
      </section>
    </FadeIn>
  );
}

function LinhaContexto({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b pb-2 text-sm last:border-b-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-medium">{valor}</span>
    </div>
  );
}
