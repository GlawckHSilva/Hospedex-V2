import {
  FadeIn,
  GlassCard,
  GlassPanel,
  GlassTable,
  PremiumEmptyState,
  StatusBadge
} from "@hospedex/ui";
import { Database, SearchX } from "lucide-react";

import type { SuperAdminModuloDados, SuperAdminRegistro } from "../../lib/super-admin/data";

type SuperAdminModulePageProps = {
  dados: SuperAdminModuloDados;
};

/**
 * Estrutura unica para modulos globais do Super Admin.
 *
 * Mantem as paginas consistentes e evita duplicacao visual entre areas.
 */
export function SuperAdminModulePage({ dados }: SuperAdminModulePageProps) {
  return (
    <FadeIn className="space-y-5">
      <GlassPanel className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-3xl">
            <StatusBadge tone="info">Visao global</StatusBadge>
            <h1 className="mt-3 text-2xl font-semibold tracking-normal">{dados.titulo}</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{dados.descricao}</p>
          </div>
          <div className="rounded-lg border bg-background/55 px-3 py-2 text-sm text-muted-foreground">
            Plataforma
          </div>
        </div>
      </GlassPanel>

      <section className="grid gap-4 md:grid-cols-3">
        {dados.metricas.map((metrica) => (
          <GlassCard className="p-4" key={metrica.label}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                {metrica.label}
              </p>
              <StatusBadge tone={metrica.tone}>global</StatusBadge>
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-normal">{metrica.valor}</p>
            <p className="mt-2 text-sm text-muted-foreground">{metrica.detalhe}</p>
          </GlassCard>
        ))}
      </section>

      <GlassTable className="overflow-hidden p-5">
        <div className="flex items-center justify-between gap-3 border-b pb-4">
          <div>
            <p className="font-semibold">Registros</p>
            <p className="text-sm text-muted-foreground">Dados reais quando disponiveis.</p>
          </div>
          <Database className="h-5 w-5 text-cyan-500" />
        </div>
        {dados.registros.length ? (
          <div className="divide-y">
            {dados.registros.map((registro) => (
              <LinhaRegistro key={registro.id} registro={registro} />
            ))}
          </div>
        ) : (
          <PremiumEmptyState
            className="my-6"
            description={dados.estadoVazio}
            icon={<SearchX className="h-5 w-5" />}
            title="Estado vazio"
          />
        )}
      </GlassTable>
    </FadeIn>
  );
}

function LinhaRegistro({ registro }: { registro: SuperAdminRegistro }) {
  return (
    <div className="grid gap-2 py-3 text-sm lg:grid-cols-[1fr_0.8fr_1fr_128px] lg:items-center">
      <div className="min-w-0">
        <p className="truncate font-medium">{registro.titulo}</p>
        <p className="truncate text-xs text-muted-foreground">{registro.detalhe}</p>
      </div>
      <p className="min-w-0 truncate text-xs text-muted-foreground">{registro.meta}</p>
      <p className="min-w-0 truncate text-xs text-muted-foreground">{registro.id}</p>
      <StatusBadge className="w-fit" tone={registro.statusTone}>
        {registro.status}
      </StatusBadge>
    </div>
  );
}
