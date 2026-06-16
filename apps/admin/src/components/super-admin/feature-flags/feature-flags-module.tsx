import { Flag, Power, SlidersHorizontal } from "lucide-react";

import { Badge, Button, FadeIn, GlassCard, GlassPanel, PremiumEmptyState, StatusBadge } from "@hospedex/ui";

import { ModuleToast } from "../../admin/module-toast";
import { alternarFeatureFlagAction } from "../../../lib/super-admin/feature-flags/actions";
import type {
  DadosModuloFeatureFlags,
  FeatureFlagControlada
} from "../../../lib/super-admin/feature-flags/types";

export type FeatureFlagsModuleProps = DadosModuloFeatureFlags & {
  erro?: string;
  sucesso?: string;
};

const MENSAGENS_SUCESSO: Record<string, string> = {
  "feature-flag-atualizada": "Feature flag atualizada com sucesso."
};

/**
 * Controle de feature flags globais.
 *
 * Alterna o default da plataforma. Configuracoes por tenant continuam em
 * tenant_features e nao sao sobrescritas por esta tela.
 */
export function FeatureFlagsModule({
  erro,
  flags,
  metricas,
  sucesso
}: FeatureFlagsModuleProps) {
  return (
    <FadeIn className="space-y-5">
      <ModuleToast erro={erro} mensagensSucesso={MENSAGENS_SUCESSO} sucesso={sucesso} />

      <GlassPanel className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Badge variant="info">Recursos globais</Badge>
            <h1 className="mt-3 text-2xl font-semibold tracking-normal">Feature Flags</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Ative ou desative recursos da plataforma sem liberar integrações externas.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {metricas.map((metrica) => (
              <Resumo key={metrica.label} {...metrica} />
            ))}
          </div>
        </div>
      </GlassPanel>

      {flags.length ? (
        <section className="grid gap-4 lg:grid-cols-2">
          {flags.map((flag) => (
            <FeatureFlagCard flag={flag} key={flag.key} />
          ))}
        </section>
      ) : (
        <PremiumEmptyState
          description="Nenhuma feature flag controlada foi configurada."
          icon={<Flag className="h-5 w-5" />}
          title="Sem flags"
        />
      )}
    </FadeIn>
  );
}

function FeatureFlagCard({ flag }: { flag: FeatureFlagControlada }) {
  return (
    <GlassCard className="space-y-4 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={flag.ativaPorPadrao ? "success" : "neutral"}>
              {flag.ativaPorPadrao ? "ativa" : "desligada"}
            </StatusBadge>
            <StatusBadge tone={flag.flag ? "info" : "warning"}>
              {flag.flag ? "cadastrada" : "pendente"}
            </StatusBadge>
          </div>
          <h2 className="mt-3 text-lg font-semibold">{flag.label}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{flag.descricao}</p>
        </div>
        <div className="rounded-lg border bg-background/55 p-3 text-cyan-500">
          <SlidersHorizontal className="h-5 w-5" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Info label="Chave" valor={flag.key} />
        <Info label="Modulo" valor={flag.module} />
        <Info label="Overrides" valor={String(flag.overrides.length)} />
      </div>

      <form action={alternarFeatureFlagAction} className="flex justify-end">
        <input name="key" type="hidden" value={flag.key} />
        <input name="ativa" type="hidden" value={flag.ativaPorPadrao ? "false" : "true"} />
        <Button type="submit" variant={flag.ativaPorPadrao ? "outline" : "default"}>
          <Power />
          {flag.ativaPorPadrao ? "Desativar" : "Ativar"}
        </Button>
      </form>
    </GlassCard>
  );
}

function Resumo({ detalhe, label, tone, valor }: DadosModuloFeatureFlags["metricas"][number]) {
  return (
    <div className="min-w-36 rounded-lg border bg-background/55 p-3 text-sm">
      <StatusBadge tone={tone}>{label}</StatusBadge>
      <p className="mt-3 text-2xl font-semibold">{valor}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detalhe}</p>
    </div>
  );
}

function Info({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="min-w-0 rounded-lg border bg-background/55 p-3 text-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate font-semibold">{valor}</p>
    </div>
  );
}
