import {
  FadeIn,
  GlassCard,
  GlassPanel,
  GlassTable,
  PremiumSkeleton,
  StatusBadge
} from "@hospedex/ui";

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
      <GlassPanel className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <StatusBadge tone={item.bloqueadoPorFeatureFlag ? "warning" : "info"}>
              {item.bloqueadoPorFeatureFlag ? "Feature flag desligada" : "Estrutura pronta"}
            </StatusBadge>
            <h1 className="mt-3 text-2xl font-semibold tracking-normal">{item.titulo}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{item.descricao}</p>
          </div>
          <div className="rounded-lg border bg-background/55 px-3 py-2 text-sm text-muted-foreground">
            {contexto.tenant?.name ?? "Plataforma"}
          </div>
        </div>
      </GlassPanel>

      {contexto.role === "super_admin" ? <ResumoSuperAdmin /> : null}

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <GlassCard className="space-y-4 p-5">
            <div>
              <p className="font-semibold">Área em preparação</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Esta página reserva o espaço do módulo sem criar CRUD, integrações ou regras de negócio.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <PremiumSkeleton className="h-24" />
              <PremiumSkeleton className="h-24" />
              <PremiumSkeleton className="h-24" />
              <PremiumSkeleton className="h-24" />
            </div>
        </GlassCard>

        <GlassCard className="space-y-3 p-5">
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
        </GlassCard>
      </section>
    </FadeIn>
  );
}

function ResumoSuperAdmin() {
  const metricas = [
    { label: "Tenants", valor: "global" },
    { label: "Licencas", valor: "monitorado" },
    { label: "Auditoria", valor: "ativo" }
  ];

  return (
    <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
        {metricas.map((metrica) => (
          <GlassCard className="p-4" key={metrica.label}>
            <p className="text-xs uppercase text-muted-foreground">{metrica.label}</p>
            <p className="mt-2 text-2xl font-semibold">{metrica.valor}</p>
            <div className="mt-4 h-1.5 rounded-full bg-secondary">
              <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-cyan-500 to-violet-400" />
            </div>
          </GlassCard>
        ))}
      </div>

      <GlassTable className="overflow-hidden p-4">
        <div className="flex items-center justify-between gap-3 border-b pb-3">
          <div>
            <p className="font-semibold">Visao analitica</p>
            <p className="text-sm text-muted-foreground">
              Estrutura visual preparada para dados globais.
            </p>
          </div>
          <StatusBadge tone="neutral">Preview</StatusBadge>
        </div>
        <div className="divide-y">
          {["Cliente", "Modulo", "Status"].map((linha) => (
            <div className="grid grid-cols-[1fr_1fr_120px] gap-3 py-3 text-sm" key={linha}>
              <span className="font-medium">{linha}</span>
              <PremiumSkeleton className="h-5" />
              <PremiumSkeleton className="h-5" />
            </div>
          ))}
        </div>
      </GlassTable>
    </section>
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
