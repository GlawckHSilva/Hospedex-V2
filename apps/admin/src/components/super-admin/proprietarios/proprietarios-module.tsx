import { Building2, Filter, Plus, Search, ShieldCheck, UserRound } from "lucide-react";

import {
  Badge,
  Button,
  Card,
  CardContent,
  FadeIn,
  Input,
  Label,
  PremiumEmptyState,
  StatusBadge
} from "@hospedex/ui";

import { ModuleToast } from "../../admin/module-toast";
import { alterarStatusProprietarioAction } from "../../../lib/super-admin/proprietarios/actions";
import type {
  DadosModuloProprietarios,
  ProprietarioCompleto,
  StatusFiltroProprietario
} from "../../../lib/super-admin/proprietarios/types";
import { ProprietarioForm } from "./proprietario-form";

/**
 * Tela dedicada de Proprietarios do Super Admin.
 *
 * Mostra dados reais da plataforma e mantem criacao/edicao em server actions,
 * evitando qualquer uso de service role no frontend.
 */

export type ProprietariosModuleProps = DadosModuloProprietarios & {
  erro?: string;
  sucesso?: string;
};

const MENSAGENS_SUCESSO: Record<string, string> = {
  "proprietario-atualizado": "Proprietario atualizado com sucesso.",
  "proprietario-criado": "Proprietario criado com sucesso.",
  "status-proprietario": "Status do proprietario atualizado."
};

const STATUS_FILTRO: Array<{ label: string; valor: StatusFiltroProprietario }> = [
  { label: "Todos", valor: "todos" },
  { label: "Trial", valor: "trial" },
  { label: "Ativos", valor: "active" },
  { label: "Pendentes", valor: "past_due" },
  { label: "Bloqueados", valor: "suspended" },
  { label: "Cancelados", valor: "cancelled" }
];

const campoClasse =
  "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function ProprietariosModule({
  erro,
  featureFlags,
  filtros,
  metricas,
  planFeatures,
  planos,
  proprietarios,
  sucesso
}: ProprietariosModuleProps) {
  return (
    <FadeIn className="space-y-5">
      <ModuleToast erro={erro} mensagensSucesso={MENSAGENS_SUCESSO} sucesso={sucesso} />

      <section className="admin-glass-panel p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Badge variant="info">Super Admin</Badge>
            <h1 className="mt-3 text-2xl font-semibold tracking-normal">Proprietarios</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Criacao segura de usuario Auth, tenant, owner, plano, licenca e feature flags.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metricas.map((metrica) => (
              <Resumo key={metrica.label} {...metrica} />
            ))}
          </div>
        </div>
      </section>

      <Card className="admin-glass-card">
        <CardContent className="p-5">
          <form className="grid gap-4 md:grid-cols-[1fr_220px_auto]">
            <div className="grid gap-2">
              <Label htmlFor="busca">Busca</Label>
              <Input
                defaultValue={filtros.busca}
                id="busca"
                name="busca"
                placeholder="Nome, email ou plano"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <select
                className={campoClasse}
                defaultValue={filtros.status}
                id="status"
                name="status"
              >
                {STATUS_FILTRO.map((status) => (
                  <option key={status.valor} value={status.valor}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button className="w-full" type="submit" variant="outline">
                <Search />
                Filtrar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="admin-glass-card">
        <CardContent className="p-5">
          <details open={proprietarios.length === 0}>
            <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
              <Plus className="h-4 w-4" />
              Criar proprietario
            </summary>
            <div className="mt-5">
              <ProprietarioForm
                featureFlags={featureFlags}
                modo="criar"
                planFeatures={planFeatures}
                planos={planos}
              />
            </div>
          </details>
        </CardContent>
      </Card>

      {proprietarios.length ? (
        <section className="grid gap-5">
          {proprietarios.map((proprietario) => (
            <ProprietarioCard
              featureFlags={featureFlags}
              key={proprietario.tenant.id}
              planFeatures={planFeatures}
              planos={planos}
              proprietario={proprietario}
            />
          ))}
        </section>
      ) : (
        <PremiumEmptyState
          description="Nenhum proprietario encontrado para os filtros atuais."
          icon={<Filter className="h-5 w-5" />}
          title="Sem proprietarios"
        />
      )}
    </FadeIn>
  );
}

function ProprietarioCard({
  featureFlags,
  planFeatures,
  planos,
  proprietario
}: {
  featureFlags: DadosModuloProprietarios["featureFlags"];
  planFeatures: DadosModuloProprietarios["planFeatures"];
  planos: DadosModuloProprietarios["planos"];
  proprietario: ProprietarioCompleto;
}) {
  const statusBloqueado = ["suspended", "cancelled"].includes(proprietario.tenant.status);
  const acao = statusBloqueado ? "ativar" : "bloquear";

  return (
    <Card className="admin-glass-card">
      <CardContent className="space-y-5 p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={toneTenant(proprietario.tenant.status)}>
                {labelTenant(proprietario.tenant.status)}
              </StatusBadge>
              <StatusBadge tone={proprietario.license ? "info" : "warning"}>
                {proprietario.license ? "licenca vinculada" : "sem licenca"}
              </StatusBadge>
            </div>
            <h2 className="mt-3 truncate text-xl font-semibold">{proprietario.tenant.name}</h2>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {proprietario.profile?.full_name ?? "Sem nome"} - {proprietario.profile?.email ?? "sem email"}
            </p>
          </div>

          <form action={alterarStatusProprietarioAction}>
            <input name="tenantId" type="hidden" value={proprietario.tenant.id} />
            <input name="ownerId" type="hidden" value={proprietario.tenant.owner_id} />
            <input name="acao" type="hidden" value={acao} />
            <Button variant={statusBloqueado ? "default" : "destructive"} type="submit">
              {statusBloqueado ? "Ativar" : "Bloquear"}
            </Button>
          </form>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Info icon={<UserRound />} label="Owner ID" valor={proprietario.tenant.owner_id} />
          <Info icon={<Building2 />} label="Plano" valor={proprietario.plan?.name ?? "Sem plano"} />
          <Info
            icon={<ShieldCheck />}
            label="Licenca"
            valor={proprietario.license?.status ?? "sem licenca"}
          />
          <Info
            label="Flags ativas"
            valor={String(proprietario.featureFlagsHabilitadas.length)}
          />
        </div>

        <details>
          <summary className="cursor-pointer text-sm font-semibold">Editar dados, plano e flags</summary>
          <div className="mt-5">
            <ProprietarioForm
              featureFlags={featureFlags}
              modo="editar"
              planFeatures={planFeatures}
              planos={planos}
              proprietario={proprietario}
            />
          </div>
        </details>
      </CardContent>
    </Card>
  );
}

function Resumo({ detalhe, label, tone, valor }: DadosModuloProprietarios["metricas"][number]) {
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

function toneTenant(status: ProprietarioCompleto["tenant"]["status"]) {
  if (status === "active") return "success";
  if (status === "trial" || status === "past_due") return "warning";
  if (status === "suspended" || status === "cancelled") return "danger";
  return "neutral";
}

function labelTenant(status: ProprietarioCompleto["tenant"]["status"]) {
  const labels: Record<ProprietarioCompleto["tenant"]["status"], string> = {
    active: "Ativo",
    cancelled: "Cancelado",
    past_due: "Pendente",
    suspended: "Bloqueado",
    trial: "Trial"
  };

  return labels[status];
}
