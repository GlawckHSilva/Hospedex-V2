import Link from "next/link";
import type { ReactNode } from "react";
import {
  Building2,
  Eye,
  Filter,
  Home,
  Layers3,
  Lock,
  Power,
  Search,
  UserRound
} from "lucide-react";

import { Badge, Input, Label, StatusBadge } from "@hospedex/ui";

import {
  alterarStatusProprietarioAction,
  alternarModuloProprietarioAction
} from "../../../lib/super-admin/proprietarios/actions";
import type {
  DadosModuloEmpreendimentos,
  EmpreendimentoCompleto
} from "../../../lib/super-admin/empreendimentos/data";
import {
  moduloEstaAtivo,
  origemModulo
} from "../../../lib/super-admin/empreendimentos/data";
import { ModuleToast } from "../../admin/module-toast";
import { ActionButton } from "../../management/action-button";
import { ConfirmDialog, EntityModal, EntityViewModal } from "../../management/entity-modal";
import { EmptyState } from "../../management/entity-card";
import { ProprietarioDetails } from "../proprietarios/proprietario-details";
import {
  formatarData,
  formatarMoeda,
  labelLicenca,
  labelModulo,
  labelTenant
} from "../proprietarios/proprietario-detail-shared";
import { CasasDoEmpreendimento } from "./casas-do-empreendimento";

/**
 * Tela dedicada aos tenants/empreendimentos do Super Admin.
 *
 * As acoes continuam nas server actions de proprietario para preservar a regra
 * unica de status, licenca e feature flags por tenant.
 */

export type EmpreendimentosModuleProps = DadosModuloEmpreendimentos & {
  erro?: string;
  sucesso?: string;
};

const CAMINHO_RETORNO = "/super-admin/empreendimentos";

const MENSAGENS_SUCESSO: Record<string, string> = {
  "modulo-proprietario": "Modulo do empreendimento atualizado.",
  "status-proprietario": "Status do empreendimento atualizado."
};

const campoClasse =
  "flex h-10 w-full cursor-pointer rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function EmpreendimentosModule({
  empreendimentos,
  erro,
  featureFlags,
  filtros,
  metricas,
  planFeatures,
  planos,
  sucesso
}: EmpreendimentosModuleProps) {
  return (
    <div className="space-y-5">
      <ModuleToast erro={erro} mensagensSucesso={MENSAGENS_SUCESSO} sucesso={sucesso} />

      <section className="admin-glass-panel p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <Badge variant="info">Super Admin</Badge>
            <h1 className="mt-3 text-2xl font-semibold tracking-normal">Empreendimentos</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Controle tenants, licencas, modulos liberados e uso operacional por proprietario.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {metricas.map((metrica) => (
              <Resumo key={metrica.label} {...metrica} />
            ))}
          </div>
        </div>
      </section>

      <form className="admin-glass-card grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-[1fr_160px_180px_180px_190px_170px_auto] xl:items-end">
        <div className="grid gap-2">
          <Label htmlFor="busca">Busca</Label>
          <Input
            defaultValue={filtros.busca}
            id="busca"
            name="busca"
            placeholder="Empreendimento, proprietario ou e-mail"
          />
        </div>
        <CampoSelect label="Status" name="status" value={filtros.status}>
          <option value="todos">Todos</option>
          <option value="active">Ativo</option>
          <option value="trial">Trial</option>
          <option value="past_due">Pendente</option>
          <option value="suspended">Bloqueado</option>
          <option value="cancelled">Cancelado</option>
        </CampoSelect>
        <CampoSelect label="Plano" name="plano" value={filtros.plano}>
          <option value="todos">Todos</option>
          {planos.map((plano) => (
            <option key={plano.id} value={plano.id}>
              {plano.name}
            </option>
          ))}
        </CampoSelect>
        <CampoSelect label="Licenca" name="licenca" value={filtros.licenca}>
          <option value="todas">Todas</option>
          <option value="active">Ativa</option>
          <option value="trial">Trial</option>
          <option value="expired">Vencida</option>
          <option value="suspended">Bloqueada</option>
          <option value="cancelled">Cancelada</option>
          <option value="sem_licenca">Sem licenca</option>
        </CampoSelect>
        <CampoSelect label="Modulo" name="modulo" value={filtros.modulo}>
          <option value="todos">Todos</option>
          {featureFlags.map((flag) => (
            <option key={flag.id} value={flag.id}>
              {labelModulo(flag.key)}
            </option>
          ))}
        </CampoSelect>
        <CampoSelect label="Ordenar" name="ordenacao" value={filtros.ordenacao}>
          <option value="recentes">Mais recentes</option>
          <option value="antigos">Mais antigos</option>
          <option value="nome">Nome</option>
          <option value="mais_casas">Mais casas</option>
          <option value="licenca_vencendo">Licenca vencendo</option>
        </CampoSelect>
        <ActionButton icon={<Search />} type="submit" variant="settings">
          Filtrar
        </ActionButton>
      </form>

      {empreendimentos.length ? (
        <section className="admin-glass-card overflow-hidden">
          <div className="hidden grid-cols-[1.4fr_1.2fr_0.9fr_0.9fr_1.2fr_1fr_0.9fr_auto] gap-3 border-b px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground xl:grid">
            <span>Empreendimento</span>
            <span>Proprietario</span>
            <span>Plano</span>
            <span>Status</span>
            <span>Casas</span>
            <span>Modulos</span>
            <span>Atualizado</span>
            <span>Acoes</span>
          </div>
          <div className="divide-y">
            {empreendimentos.map((empreendimento) => (
              <LinhaEmpreendimento
                empreendimento={empreendimento}
                featureFlags={featureFlags}
                key={empreendimento.tenant.id}
                planFeatures={planFeatures}
              />
            ))}
          </div>
        </section>
      ) : (
        <EmptyState
          action={
            <Link href="/super-admin/proprietarios">
              <ActionButton icon={<Building2 />} variant="add">
                Criar proprietario
              </ActionButton>
            </Link>
          }
          description="Nenhum empreendimento encontrado para os filtros atuais."
          icon={<Filter />}
          title="Nenhum empreendimento encontrado"
        />
      )}
    </div>
  );
}

function LinhaEmpreendimento({
  empreendimento,
  featureFlags,
  planFeatures
}: {
  empreendimento: EmpreendimentoCompleto;
  featureFlags: DadosModuloEmpreendimentos["featureFlags"];
  planFeatures: DadosModuloEmpreendimentos["planFeatures"];
}) {
  const modulosAtivos = featureFlags.filter((flag) => moduloEstaAtivo(empreendimento, flag, planFeatures));
  const ativo = empreendimento.tenant.status !== "suspended" && empreendimento.tenant.status !== "cancelled";

  return (
    <article className="grid gap-4 px-4 py-4 xl:grid-cols-[1.4fr_1.2fr_0.9fr_0.9fr_1.2fr_1fr_0.9fr_auto] xl:items-center">
      <div className="min-w-0">
        <p className="truncate font-semibold">{empreendimento.tenant.name}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Criado em {formatarData(empreendimento.tenant.created_at)}
        </p>
      </div>
      <div className="min-w-0 text-sm">
        <p className="truncate font-medium">{empreendimento.profile?.full_name ?? "Sem nome"}</p>
        <p className="truncate text-muted-foreground">{empreendimento.profile?.email ?? "Sem e-mail"}</p>
      </div>
      <span className="text-sm">{empreendimento.plan?.name ?? "Sem plano"}</span>
      <div className="flex flex-wrap gap-2">
        <StatusBadge tone={toneTenant(empreendimento.tenant.status)}>
          {labelTenant(empreendimento.tenant.status)}
        </StatusBadge>
        <StatusBadge tone={toneLicenca(empreendimento.license?.status)}>
          {empreendimento.license ? labelLicenca(empreendimento.license.status) : "Sem licenca"}
        </StatusBadge>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-semibold">
          {empreendimento.operacao.casasUsadas}/{empreendimento.operacao.casasLimite}
        </p>
        <EntityViewModal
          description="Casas cadastradas neste tenant, sem editar dados do proprietario."
          title={`Casas de ${empreendimento.tenant.name}`}
          triggerIcon={<Home />}
          triggerLabel="Ver casas deste empreendimento"
        >
          <CasasDoEmpreendimento abrirInicialmente empreendimento={empreendimento} />
        </EntityViewModal>
      </div>
      <span className="text-sm text-muted-foreground">
        {modulosAtivos.length} liberados
      </span>
      <span className="text-sm text-muted-foreground">{formatarData(empreendimento.tenant.updated_at)}</span>
      <div className="flex flex-wrap gap-2 xl:justify-end">
        <EntityViewModal
          description="Identificacao, licenca, modulos e operacao do tenant."
          title={empreendimento.tenant.name}
          triggerIcon={<Eye />}
          triggerLabel="Detalhes"
        >
          <DetalhesEmpreendimento
            empreendimento={empreendimento}
            featureFlags={featureFlags}
            planFeatures={planFeatures}
          />
        </EntityViewModal>

        <EntityModal
          description="Altere liberacoes por tenant sem expor secrets."
          eyebrow="Modulos"
          title={`Modulos de ${empreendimento.tenant.name}`}
          triggerAction="settings"
          triggerIcon={<Layers3 />}
          triggerLabel="Modulos"
        >
          <ListaModulos
            empreendimento={empreendimento}
            featureFlags={featureFlags}
            planFeatures={planFeatures}
          />
        </EntityModal>

        <Link href={`/super-admin/proprietarios?busca=${encodeURIComponent(empreendimento.profile?.email ?? empreendimento.tenant.name)}`}>
          <ActionButton icon={<UserRound />} variant="view">
            Proprietario
          </ActionButton>
        </Link>

        <ConfirmDialog
          description={ativo ? "O proprietario perdera acesso operacional ao tenant." : "O tenant voltara ao status ativo."}
          title={ativo ? "Bloquear empreendimento" : "Reativar empreendimento"}
          triggerAction="status"
          triggerIcon={ativo ? <Lock /> : <Power />}
          triggerLabel={ativo ? "Bloquear" : "Reativar"}
        >
          <form action={alterarStatusProprietarioAction} className="space-y-4">
            <input name="tenantId" type="hidden" value={empreendimento.tenant.id} />
            <input name="ownerId" type="hidden" value={empreendimento.tenant.owner_id} />
            <input name="acao" type="hidden" value={ativo ? "bloquear" : "ativar"} />
            <input name="retorno" type="hidden" value={CAMINHO_RETORNO} />
            <p className="text-sm text-muted-foreground">
              Confirme a alteracao de status para {empreendimento.tenant.name}.
            </p>
            <ActionButton className="w-full" icon={<Power />} type="submit" variant="status">
              Confirmar
            </ActionButton>
          </form>
        </ConfirmDialog>
      </div>
    </article>
  );
}

function DetalhesEmpreendimento({
  empreendimento,
  featureFlags,
  planFeatures
}: {
  empreendimento: EmpreendimentoCompleto;
  featureFlags: DadosModuloEmpreendimentos["featureFlags"];
  planFeatures: DadosModuloEmpreendimentos["planFeatures"];
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-4">
        <Info label="Casas" valor={`${empreendimento.operacao.casasUsadas}/${empreendimento.operacao.casasLimite}`} />
        <Info label="Reservas" valor={String(empreendimento.operacao.reservasTotal)} />
        <Info label="Reservas futuras" valor={String(empreendimento.operacao.reservasFuturas)} />
        <Info label="Receita operacional" valor={formatarMoeda(empreendimento.operacao.receitaOperacional)} />
      </div>
      <CasasDoEmpreendimento empreendimento={empreendimento} />
      <ProprietarioDetails
        featureFlags={featureFlags}
        planFeatures={planFeatures}
        proprietario={empreendimento}
        retorno={CAMINHO_RETORNO}
      />
    </div>
  );
}

function ListaModulos({
  empreendimento,
  featureFlags,
  planFeatures
}: {
  empreendimento: EmpreendimentoCompleto;
  featureFlags: DadosModuloEmpreendimentos["featureFlags"];
  planFeatures: DadosModuloEmpreendimentos["planFeatures"];
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {featureFlags.map((flag) => {
        const ativo = moduloEstaAtivo(empreendimento, flag, planFeatures);
        return (
          <div className="rounded-xl border bg-background/45 p-4" key={flag.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{labelModulo(flag.key)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Origem: {origemModulo(empreendimento, flag, planFeatures)}</p>
              </div>
              <StatusBadge tone={ativo ? "success" : "neutral"}>{ativo ? "Liberado" : "Bloqueado"}</StatusBadge>
            </div>
            <form action={alternarModuloProprietarioAction} className="mt-3">
              <input name="tenantId" type="hidden" value={empreendimento.tenant.id} />
              <input name="ownerId" type="hidden" value={empreendimento.tenant.owner_id} />
              <input name="featureFlagId" type="hidden" value={flag.id} />
              <input name="habilitar" type="hidden" value={String(!ativo)} />
              <input name="retorno" type="hidden" value={CAMINHO_RETORNO} />
              <ActionButton className="w-full" icon={<Power />} type="submit" variant="status">
                {ativo ? "Desativar" : "Ativar"}
              </ActionButton>
            </form>
          </div>
        );
      })}
    </div>
  );
}

function CampoSelect({
  children,
  label,
  name,
  value
}: {
  children: ReactNode;
  label: string;
  name: string;
  value: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <select className={campoClasse} defaultValue={value} id={name} name={name}>
        {children}
      </select>
    </div>
  );
}

function Resumo({ detalhe, label, tone, valor }: DadosModuloEmpreendimentos["metricas"][number]) {
  return (
    <div className="min-w-36 rounded-xl border bg-background/55 p-3 text-sm">
      <StatusBadge tone={tone}>{label}</StatusBadge>
      <p className="mt-3 text-2xl font-semibold">{valor}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detalhe}</p>
    </div>
  );
}

function Info({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-xl border bg-background/45 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{valor}</p>
    </div>
  );
}

function toneTenant(status: EmpreendimentoCompleto["tenant"]["status"]) {
  if (status === "active") return "success";
  if (status === "trial" || status === "past_due") return "warning";
  if (status === "suspended" || status === "cancelled") return "danger";
  return "neutral";
}

function toneLicenca(status: NonNullable<EmpreendimentoCompleto["license"]>["status"] | undefined) {
  if (status === "active" || status === "trial") return "success";
  if (status === "expired" || status === "suspended" || status === "cancelled") return "danger";
  return "warning";
}
