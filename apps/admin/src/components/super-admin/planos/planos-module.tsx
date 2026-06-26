import { CreditCard, Home, PackagePlus, Pencil, Plus } from "lucide-react";

import { Badge, FadeIn, GlassCard, GlassPanel, PremiumEmptyState, StatusBadge } from "@hospedex/ui";

import { ModuleToast } from "../../admin/module-toast";
import { EntityModal } from "../../management/entity-modal";
import type { DadosModuloPlanos, PlanoCompleto } from "../../../lib/super-admin/planos/types";
import { PlanoForm } from "./plano-form";

export type PlanosModuleProps = DadosModuloPlanos & {
  erro?: string;
  sucesso?: string;
};

const MENSAGENS_SUCESSO: Record<string, string> = {
  "plano-atualizado": "Plano atualizado com sucesso.",
  "plano-criado": "Plano criado com sucesso."
};

/**
 * Modulo funcional de Planos para o Super Admin.
 *
 * Exibe catalogo real, limites comerciais e recursos incluidos sem acoplar a
 * experiencia do proprietario.
 */
export function PlanosModule({
  erro,
  featureFlags,
  metricas,
  planos,
  sucesso
}: PlanosModuleProps) {
  return (
    <FadeIn className="space-y-5">
      <ModuleToast erro={erro} mensagensSucesso={MENSAGENS_SUCESSO} sucesso={sucesso} />

      <GlassPanel className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Badge variant="info">Catalogo global</Badge>
            <h1 className="mt-3 text-2xl font-semibold tracking-normal">Planos</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Crie e edite planos comerciais com limites de casas e recursos.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {metricas.map((metrica) => (
              <Resumo key={metrica.label} {...metrica} />
            ))}
          </div>
        </div>
      </GlassPanel>

      <div className="flex justify-end">
        <EntityModal
          description="Defina valores, limites e recursos disponiveis para os tenants."
          eyebrow="Catalogo global"
          size="xl"
          title="Novo plano"
          triggerAction="add"
          triggerIcon={<Plus />}
          triggerLabel="Criar plano"
          triggerSize="md"
        >
          <PlanoForm featureFlags={featureFlags} modo="criar" />
        </EntityModal>
      </div>

      {planos.length ? (
        <section className="grid gap-5">
          {planos.map((plano) => (
            <PlanoCard featureFlags={featureFlags} key={plano.plan.id} plano={plano} />
          ))}
        </section>
      ) : (
        <PremiumEmptyState
          description="Cadastre o primeiro plano para liberar a criacao de proprietarios."
          icon={<PackagePlus className="h-5 w-5" />}
          title="Nenhum plano cadastrado"
        />
      )}
    </FadeIn>
  );
}

function PlanoCard({
  featureFlags,
  plano
}: {
  featureFlags: DadosModuloPlanos["featureFlags"];
  plano: PlanoCompleto;
}) {
  const assinaturasAtivas = plano.assinaturas.filter((assinatura) =>
    ["active", "trialing"].includes(assinatura.status)
  ).length;

  return (
    <GlassCard className="space-y-5 p-5">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={tonePlano(plano.plan.status)}>{labelPlano(plano.plan.status)}</StatusBadge>
            <StatusBadge tone="info">{plano.plan.code}</StatusBadge>
          </div>
          <h2 className="mt-3 truncate text-xl font-semibold">{plano.plan.name}</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {plano.plan.description ?? "Sem descricao comercial."}
          </p>
        </div>
        <div className="rounded-lg border bg-background/55 p-4 text-right">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Mensal</p>
          <p className="mt-2 text-2xl font-semibold">{formatarMoeda(plano.plan.monthly_price)}</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Info icon={<Home />} label="Casas" valor={String(plano.plan.max_properties)} />
        <Info icon={<CreditCard />} label="Assinaturas ativas" valor={String(assinaturasAtivas)} />
        <Info label="Recursos incluidos" valor={String(plano.recursos.length)} />
      </div>

      <div className="flex flex-wrap gap-2">
        {plano.recursos.length ? (
          plano.recursos.map((recurso) => (
            <StatusBadge key={recurso.id} tone="neutral">
              {recurso.key}
            </StatusBadge>
          ))
        ) : (
          <span className="text-sm text-muted-foreground">Sem recursos vinculados.</span>
        )}
      </div>

      <div className="flex justify-end">
        <EntityModal
          description="Atualize limites, valores e feature flags incluidas no plano."
          eyebrow="Edicao administrativa"
          size="xl"
          title={`Editar ${plano.plan.name}`}
          triggerAction="edit"
          triggerIcon={<Pencil />}
          triggerLabel="Editar plano"
        >
          <PlanoForm featureFlags={featureFlags} modo="editar" plano={plano} />
        </EntityModal>
      </div>
    </GlassCard>
  );
}

function Resumo({ detalhe, label, tone, valor }: DadosModuloPlanos["metricas"][number]) {
  return (
    <div className="min-w-36 rounded-lg border bg-background/55 p-3 text-sm">
      <StatusBadge tone={tone}>{label}</StatusBadge>
      <p className="mt-3 text-2xl font-semibold">{valor}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detalhe}</p>
    </div>
  );
}

function Info({
  icon,
  label,
  valor
}: {
  icon?: React.ReactNode;
  label: string;
  valor: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border bg-background/55 p-3 text-sm">
      {icon ? <div className="mb-2 text-primary [&_svg]:h-4 [&_svg]:w-4">{icon}</div> : null}
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate font-semibold">{valor}</p>
    </div>
  );
}

function tonePlano(status: PlanoCompleto["plan"]["status"]) {
  if (status === "active") return "success";
  if (status === "draft") return "warning";
  if (status === "archived") return "danger";
  return "neutral";
}

function labelPlano(status: PlanoCompleto["plan"]["status"]) {
  const labels: Record<PlanoCompleto["plan"]["status"], string> = {
    active: "Ativo",
    archived: "Arquivado",
    draft: "Rascunho"
  };

  return labels[status];
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" }).format(valor);
}
