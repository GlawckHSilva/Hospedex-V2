import {
  Building2,
  Eye,
  Filter,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  UserRound
} from "lucide-react";

import { Badge, FadeIn, Input, Label, StatusBadge } from "@hospedex/ui";

import type {
  DadosModuloProprietarios,
  ProprietarioCompleto,
  StatusFiltroProprietario
} from "../../../lib/super-admin/proprietarios/types";
import { ModuleToast } from "../../admin/module-toast";
import { ActionButton } from "../../management/action-button";
import {
  EmptyState,
  EntityCard,
  EntityCardActions,
  EntityCardHeader,
  EntityGrid
} from "../../management/entity-card";
import { EntityModal, EntityViewModal } from "../../management/entity-modal";
import { ProprietarioDetails } from "./proprietario-details";
import { ProprietarioForm } from "./proprietario-form";

/**
 * Tela de proprietarios do Super Admin.
 *
 * Criacao, visualizacao e edicao usam modais reais. As operacoes de Auth,
 * tenant, licenca e flags permanecem nas Server Actions protegidas.
 */

export type ProprietariosModuleProps = DadosModuloProprietarios & {
  erro?: string;
  sucesso?: string;
};

const MENSAGENS_SUCESSO: Record<string, string> = {
  "integracao-proprietario": "Integracao do proprietario atualizada.",
  "modulo-proprietario": "Modulo do proprietario atualizado.",
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
  "flex h-10 w-full cursor-pointer rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

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
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl">
            <Badge variant="info">Super Admin</Badge>
            <h1 className="mt-3 text-2xl font-semibold tracking-normal">Proprietarios</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Controle central de clientes, licencas, modulos, integracoes e acesso.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metricas.map((metrica) => (
              <Resumo key={metrica.label} {...metrica} />
            ))}
          </div>
        </div>
      </section>

      <section className="admin-glass-card grid gap-4 p-5 lg:grid-cols-[1fr_220px_auto_auto] lg:items-end">
        <form className="contents">
          <div className="grid gap-2">
            <Label htmlFor="busca">Busca</Label>
            <Input
              defaultValue={filtros.busca}
              id="busca"
              name="busca"
              placeholder="Nome, e-mail ou plano"
            />
          </div>
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
          <ActionButton icon={<Search />} type="submit" variant="settings">
            Filtrar
          </ActionButton>
        </form>

        <EntityModal
          description="Crie o usuario Auth e vincule tenant, plano, licenca e modulos iniciais."
          eyebrow="Super Admin"
          size="xl"
          title="Novo proprietario"
          triggerAction="add"
          triggerClassName="w-full"
          triggerIcon={<Plus />}
          triggerLabel="Novo proprietario"
          triggerSize="md"
        >
          <ProprietarioForm
            featureFlags={featureFlags}
            modo="criar"
            planFeatures={planFeatures}
            planos={planos}
          />
        </EntityModal>
      </section>

      {proprietarios.length ? (
        <EntityGrid>
          {proprietarios.map((proprietario) => (
            <ProprietarioCard
              featureFlags={featureFlags}
              key={proprietario.tenant.id}
              planFeatures={planFeatures}
              planos={planos}
              proprietario={proprietario}
            />
          ))}
        </EntityGrid>
      ) : (
        <EmptyState
          description="Nenhum proprietario encontrado para os filtros atuais."
          icon={<Filter />}
          title="Nenhum proprietario encontrado"
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
  return (
    <EntityCard>
      <EntityCardHeader
        badges={
          <>
            <StatusBadge tone={toneTenant(proprietario.tenant.status)}>
              {labelTenant(proprietario.tenant.status)}
            </StatusBadge>
            <StatusBadge tone={proprietario.license ? "info" : "warning"}>
              {proprietario.license ? "Licenca vinculada" : "Sem licenca"}
            </StatusBadge>
          </>
        }
        icon={<Building2 />}
        subtitle={proprietario.profile?.email ?? "E-mail nao informado"}
        title={proprietario.tenant.name}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Info icon={<UserRound />} label="Proprietario" valor={proprietario.profile?.full_name ?? "Sem nome"} />
        <Info icon={<Building2 />} label="Plano" valor={proprietario.plan?.name ?? "Sem plano"} />
        <Info
          icon={<ShieldCheck />}
          label="Licenca"
          valor={proprietario.license ? labelLicenca(proprietario.license.status) : "Nao vinculada"}
        />
        <Info label="Modulos liberados" valor={String(proprietario.featureFlagsHabilitadas.length)} />
      </div>

      <EntityCardActions>
        <EntityViewModal
          description="Perfil, licenca, modulos, integracoes, financeiro e logs do tenant."
          title={proprietario.tenant.name}
          triggerIcon={<Eye />}
          triggerLabel="Visualizar"
        >
          <ProprietarioDetails
            featureFlags={featureFlags}
            planFeatures={planFeatures}
            proprietario={proprietario}
          />
        </EntityViewModal>
        <EntityModal
          description="Atualize dados, plano, limites, vencimento e feature flags do tenant."
          eyebrow="Edicao administrativa"
          size="xl"
          title={`Editar ${proprietario.tenant.name}`}
          triggerAction="edit"
          triggerIcon={<Pencil />}
          triggerLabel="Editar"
        >
          <ProprietarioForm
            featureFlags={featureFlags}
            modo="editar"
            planFeatures={planFeatures}
            planos={planos}
            proprietario={proprietario}
          />
        </EntityModal>
      </EntityCardActions>
    </EntityCard>
  );
}

function Resumo({ detalhe, label, tone, valor }: DadosModuloProprietarios["metricas"][number]) {
  return (
    <div className="min-w-36 rounded-xl border bg-background/55 p-3 text-sm">
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
    <div className="min-w-0 rounded-xl border bg-background/45 p-3 text-sm">
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
  return {
    active: "Ativo",
    cancelled: "Cancelado",
    past_due: "Pendente",
    suspended: "Bloqueado",
    trial: "Trial"
  }[status];
}

function labelLicenca(status: NonNullable<ProprietarioCompleto["license"]>["status"]) {
  return {
    active: "Ativa",
    cancelled: "Cancelada",
    expired: "Vencida",
    suspended: "Bloqueada",
    trial: "Trial"
  }[status];
}
