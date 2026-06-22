import { CalendarClock, Filter, KeyRound, RefreshCcw, ShieldAlert } from "lucide-react";

import { Badge, FadeIn, GlassCard, GlassPanel, Input, Label, PremiumEmptyState, StatusBadge } from "@hospedex/ui";

import { ModuleToast } from "../../admin/module-toast";
import { ActionButton } from "../../management/action-button";
import { ConfirmDialog, EntityModal } from "../../management/entity-modal";
import {
  bloquearInadimplenciaAction,
  reativarLicencaAction,
  renovarLicencaAction
} from "../../../lib/super-admin/licencas/actions";
import type {
  DadosModuloLicencas,
  LicencaCompleta,
  StatusFiltroLicenca
} from "../../../lib/super-admin/licencas/types";

export type LicencasModuleProps = DadosModuloLicencas & {
  erro?: string;
  sucesso?: string;
};

const MENSAGENS_SUCESSO: Record<string, string> = {
  "licenca-bloqueada": "Licenca bloqueada por inadimplencia.",
  "licenca-reativada": "Licenca reativada com sucesso.",
  "licenca-renovada": "Licenca renovada com sucesso."
};

const STATUS_FILTRO: Array<{ label: string; valor: StatusFiltroLicenca }> = [
  { label: "Todas", valor: "todos" },
  { label: "Trial", valor: "trial" },
  { label: "Ativas", valor: "active" },
  { label: "Expiradas", valor: "expired" },
  { label: "Suspensas", valor: "suspended" },
  { label: "Canceladas", valor: "cancelled" }
];

const campoClasse =
  "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * Modulo funcional de Licencas para o Super Admin.
 *
 * Permite renovacao manual e bloqueio administrativo sem gateway de pagamento.
 */
export function LicencasModule({
  erro,
  filtros,
  licencas,
  metricas,
  sucesso
}: LicencasModuleProps) {
  return (
    <FadeIn className="space-y-5">
      <ModuleToast erro={erro} mensagensSucesso={MENSAGENS_SUCESSO} sucesso={sucesso} />

      <GlassPanel className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Badge variant="info">Controle de acesso</Badge>
            <h1 className="mt-3 text-2xl font-semibold tracking-normal">Licencas</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Gerencie validade, renovacao manual e bloqueio por inadimplencia.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {metricas.map((metrica) => (
              <Resumo key={metrica.label} {...metrica} />
            ))}
          </div>
        </div>
      </GlassPanel>

      <GlassCard className="p-5">
        <form className="grid gap-4 md:grid-cols-[240px_auto]">
          <div className="grid gap-2">
            <Label htmlFor="status">Status</Label>
            <select className={campoClasse} defaultValue={filtros.status} id="status" name="status">
              {STATUS_FILTRO.map((status) => (
                <option key={status.valor} value={status.valor}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <ActionButton icon={<Filter />} type="submit" variant="settings">
              Filtrar
            </ActionButton>
          </div>
        </form>
      </GlassCard>

      {licencas.length ? (
        <section className="grid gap-5">
          {licencas.map((licenca) => (
            <LicencaCard key={licenca.licenca.id} licenca={licenca} />
          ))}
        </section>
      ) : (
        <PremiumEmptyState
          description="Nenhuma licenca encontrada para os filtros atuais."
          icon={<KeyRound className="h-5 w-5" />}
          title="Sem licencas"
        />
      )}
    </FadeIn>
  );
}

function LicencaCard({ licenca }: { licenca: LicencaCompleta }) {
  const bloqueada = ["expired", "suspended", "cancelled"].includes(licenca.licenca.status);

  return (
    <GlassCard className="space-y-5 p-5">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={toneLicenca(licenca.licenca.status)}>
              {labelLicenca(licenca.licenca.status)}
            </StatusBadge>
            <StatusBadge tone={bloqueada ? "danger" : "success"}>
              {bloqueada ? "acesso restrito" : "acesso liberado"}
            </StatusBadge>
          </div>
          <h2 className="mt-3 truncate text-xl font-semibold">
            {licenca.tenant?.name ?? "Tenant nao encontrado"}
          </h2>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {licenca.owner?.email ?? "owner nao encontrado"} - {licenca.plan?.name ?? "sem plano"}
          </p>
        </div>
        <div className="rounded-lg border bg-background/55 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Vencimento</p>
          <p className="mt-2 text-lg font-semibold">{formatarVencimento(licenca)}</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Info icon={<KeyRound />} label="Chave" valor={licenca.licenca.license_key} />
        <Info icon={<CalendarClock />} label="Dias restantes" valor={formatarDias(licenca.diasRestantes)} />
        <Info label="Assinatura" valor={licenca.subscription?.status ?? "sem assinatura"} />
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <EntityModal
          description="A renovacao estende a validade atual sem alterar o plano ou os limites."
          eyebrow="Licenca"
          size="sm"
          title="Renovar licenca"
          triggerAction="edit"
          triggerIcon={<RefreshCcw />}
          triggerLabel="Renovar"
        >
          <form action={renovarLicencaAction} className="grid gap-4">
            <input name="licencaId" type="hidden" value={licenca.licenca.id} />
            <div className="grid gap-2">
              <Label htmlFor={`meses-${licenca.licenca.id}`}>Meses</Label>
              <Input
                defaultValue="1"
                id={`meses-${licenca.licenca.id}`}
                max={36}
                min={1}
                name="meses"
                type="number"
              />
            </div>
            <ActionButton icon={<RefreshCcw />} size="md" type="submit" variant="edit">
              Confirmar renovacao
            </ActionButton>
          </form>
        </EntityModal>

        {bloqueada ? (
          <ConfirmDialog
            description="O tenant voltara a operar conforme o plano e a validade atuais."
            title="Reativar licenca"
            triggerAction="status"
            triggerLabel="Reativar"
          >
            <form action={reativarLicencaAction} className="space-y-4">
              <input name="licencaId" type="hidden" value={licenca.licenca.id} />
              <p className="text-sm text-muted-foreground">
                Confirme a liberacao desta licenca e do tenant vinculado.
              </p>
              <ActionButton className="w-full" type="submit" variant="status">
                Confirmar reativacao
              </ActionButton>
            </form>
          </ConfirmDialog>
        ) : (
          <ConfirmDialog
            description="O tenant sera suspenso por inadimplencia sem apagar dados ou historico."
            title="Bloquear por inadimplencia"
            triggerAction="delete"
            triggerIcon={<ShieldAlert />}
            triggerLabel="Bloquear"
          >
            <form action={bloquearInadimplenciaAction} className="space-y-4">
              <input name="licencaId" type="hidden" value={licenca.licenca.id} />
              <p className="text-sm text-muted-foreground">
                Confirme o bloqueio administrativo da licenca.
              </p>
              <ActionButton className="w-full" icon={<ShieldAlert />} type="submit" variant="delete">
                Confirmar bloqueio
              </ActionButton>
            </form>
          </ConfirmDialog>
        )}
      </div>
    </GlassCard>
  );
}

function Resumo({ detalhe, label, tone, valor }: DadosModuloLicencas["metricas"][number]) {
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

function toneLicenca(status: LicencaCompleta["licenca"]["status"]) {
  if (status === "active") return "success";
  if (status === "trial") return "warning";
  if (status === "expired" || status === "suspended" || status === "cancelled") return "danger";
  return "neutral";
}

function labelLicenca(status: LicencaCompleta["licenca"]["status"]) {
  const labels: Record<LicencaCompleta["licenca"]["status"], string> = {
    active: "Ativa",
    cancelled: "Cancelada",
    expired: "Expirada",
    suspended: "Suspensa",
    trial: "Trial"
  };

  return labels[status];
}

function formatarVencimento(licenca: LicencaCompleta) {
  if (!licenca.licenca.expires_at) return "Sem vencimento";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(
    new Date(`${licenca.licenca.expires_at}T00:00:00`)
  );
}

function formatarDias(dias: number | null) {
  if (dias === null) return "sem limite";
  if (dias < 0) return `${Math.abs(dias)} dias vencida`;
  if (dias === 0) return "vence hoje";
  return `${dias} dias`;
}
