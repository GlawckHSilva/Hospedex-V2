import {
  FadeIn,
  GlassCard,
  GlassPanel,
  GlassTable,
  PremiumEmptyState,
  StatusBadge
} from "@hospedex/ui";
import { Activity, Building2, ShieldCheck } from "lucide-react";

import type { SuperAdminMetrica, SuperAdminRegistro } from "../../lib/super-admin/data";

type SuperAdminDashboardProps = {
  contextoGlobal: {
    email: string;
    nome: string;
    role: string;
  };
  metricas: SuperAdminMetrica[];
  recentes: SuperAdminRegistro[];
};

/**
 * Dashboard global do Super Admin.
 *
 * Mostra indicadores de plataforma sem reaproveitar escopo operacional de
 * proprietario ou staff.
 */
export function SuperAdminDashboard({
  contextoGlobal,
  metricas,
  recentes
}: SuperAdminDashboardProps) {
  const destaques = metricas.slice(0, 4);
  const operacao = metricas.slice(4);

  return (
    <FadeIn className="space-y-5">
      <GlassPanel className="overflow-hidden p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <StatusBadge tone="success">Super Admin validado</StatusBadge>
            <h1 className="mt-3 text-2xl font-semibold tracking-normal sm:text-3xl">
              Dashboard global
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Visao corporativa da plataforma Hospedex, com dados globais
              liberados apenas pela role super_admin.
            </p>
          </div>
          <GlassCard className="min-w-0 p-4 lg:w-80">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-300/35 bg-cyan-400/15 text-cyan-700 dark:text-cyan-200">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{contextoGlobal.nome}</p>
                <p className="truncate text-xs text-muted-foreground">{contextoGlobal.email}</p>
                <StatusBadge className="mt-2" tone="info">
                  {contextoGlobal.role}
                </StatusBadge>
              </div>
            </div>
          </GlassCard>
        </div>
      </GlassPanel>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {destaques.map((metrica) => (
          <MetricaCard key={metrica.label} metrica={metrica} />
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <GlassTable className="overflow-hidden p-5">
          <div className="flex items-center justify-between gap-3 border-b pb-4">
            <div>
              <p className="font-semibold">Auditoria recente</p>
              <p className="text-sm text-muted-foreground">Eventos globais mais recentes.</p>
            </div>
            <StatusBadge tone="neutral">Global</StatusBadge>
          </div>
          {recentes.length ? (
            <div className="divide-y">
              {recentes.map((registro) => (
                <LinhaRegistro key={registro.id} registro={registro} />
              ))}
            </div>
          ) : (
            <PremiumEmptyState
              className="my-5"
              description="A base de auditoria ainda nao possui eventos para listar."
              icon={<Activity className="h-5 w-5" />}
              title="Sem eventos recentes"
            />
          )}
        </GlassTable>

        <GlassCard className="space-y-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold">Saude operacional</p>
              <p className="text-sm text-muted-foreground">Indicadores adicionais.</p>
            </div>
            <Building2 className="h-5 w-5 text-cyan-500" />
          </div>
          <div className="space-y-3">
            {operacao.map((metrica) => (
              <div className="rounded-lg border bg-background/45 p-3" key={metrica.label}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{metrica.label}</p>
                  <StatusBadge tone={metrica.tone}>{metrica.valor}</StatusBadge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{metrica.detalhe}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </section>
    </FadeIn>
  );
}

function MetricaCard({ metrica }: { metrica: SuperAdminMetrica }) {
  return (
    <GlassCard className="admin-glass-card p-4 transition duration-200">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            {metrica.label}
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-normal">{metrica.valor}</p>
        </div>
        <StatusBadge tone={metrica.tone}>global</StatusBadge>
      </div>
      <p className="mt-3 min-h-10 text-sm leading-5 text-muted-foreground">{metrica.detalhe}</p>
    </GlassCard>
  );
}

function LinhaRegistro({ registro }: { registro: SuperAdminRegistro }) {
  return (
    <div className="grid gap-2 py-3 text-sm sm:grid-cols-[1fr_0.7fr_120px] sm:items-center">
      <div className="min-w-0">
        <p className="truncate font-medium">{registro.titulo}</p>
        <p className="truncate text-xs text-muted-foreground">{registro.detalhe}</p>
      </div>
      <p className="min-w-0 truncate text-xs text-muted-foreground">{registro.meta}</p>
      <StatusBadge className="w-fit" tone={registro.statusTone}>
        {registro.status}
      </StatusBadge>
    </div>
  );
}
