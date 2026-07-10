import Link from "next/link";
import type { ReactNode } from "react";
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  Filter,
  Home,
  Layers3,
  Lock,
  Plus,
  Power,
  Search,
  SlidersHorizontal,
  UserRound
} from "lucide-react";

import { cn, FadeIn, Input, Label, StatusBadge } from "@hospedex/ui";

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
import { ProprietarioForm } from "../proprietarios/proprietario-form";
import {
  formatarData,
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
  opcoesCidades,
  opcoesProprietarios,
  planFeatures,
  planos,
  sucesso
}: EmpreendimentosModuleProps) {
  return (
    <FadeIn className="space-y-5">
      <ModuleToast erro={erro} mensagensSucesso={MENSAGENS_SUCESSO} sucesso={sucesso} />

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Empreendimentos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie todos os empreendimentos do sistema.
          </p>
        </div>
        <EntityModal
          description="Crie o proprietario e vincule tenant, plano, licenca e modulos iniciais."
          eyebrow="Super Admin"
          size="xl"
          title="Novo empreendimento"
          triggerAction="edit"
          triggerClassName="w-full sm:w-auto"
          triggerIcon={<Plus />}
          triggerLabel="Novo empreendimento"
          triggerSize="md"
        >
          <ProprietarioForm
            featureFlags={featureFlags}
            modo="criar"
            planFeatures={planFeatures}
            planos={planos}
          />
        </EntityModal>
      </header>

      <form className="admin-glass-card grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-[44px_minmax(150px,.9fr)_minmax(150px,.9fr)_minmax(190px,1.25fr)_minmax(160px,.9fr)_minmax(210px,1.2fr)] xl:items-center">
        <details className="group relative md:col-span-2 xl:col-span-1">
          <summary
            className="flex h-10 cursor-pointer list-none items-center justify-center rounded-md border bg-background text-muted-foreground transition hover:border-cyan-400/35 hover:text-cyan-300 [&::-webkit-details-marker]:hidden"
            title="Filtros avancados"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="sr-only">Filtros avancados</span>
          </summary>
          <div className="mt-3 grid gap-3 rounded-xl border border-cyan-300/15 bg-background/95 p-4 shadow-2xl backdrop-blur-xl md:grid-cols-3 xl:absolute xl:left-0 xl:top-full xl:z-30 xl:w-[620px]">
            <CampoSelect label="Licenca" name="licenca" value={filtros.licenca}>
              <option value="todas">Todas as licencas</option>
              <option value="active">Ativa</option>
              <option value="trial">Trial</option>
              <option value="expired">Vencida</option>
              <option value="suspended">Bloqueada</option>
              <option value="cancelled">Cancelada</option>
              <option value="sem_licenca">Sem licenca</option>
            </CampoSelect>
            <CampoSelect label="Modulo" name="modulo" value={filtros.modulo}>
              <option value="todos">Todos os modulos</option>
              {featureFlags.map((flag) => (
                <option key={flag.id} value={flag.id}>{labelModulo(flag.key)}</option>
              ))}
            </CampoSelect>
            <CampoSelect label="Ordenar" name="ordenacao" value={filtros.ordenacao}>
              <option value="recentes">Mais recentes</option>
              <option value="antigos">Mais antigos</option>
              <option value="nome">Nome</option>
              <option value="mais_casas">Mais casas</option>
              <option value="licenca_vencendo">Licenca vencendo</option>
            </CampoSelect>
            <ActionButton className="md:col-span-3" icon={<Filter />} size="md" type="submit" variant="view">
              Aplicar filtros
            </ActionButton>
          </div>
        </details>

        <CampoSelect compact label="Plano" name="plano" value={filtros.plano}>
            <option value="todos">Todos os planos</option>
            {planos.map((plano) => (
              <option key={plano.id} value={plano.id}>{plano.name}</option>
            ))}
        </CampoSelect>
        <CampoSelect compact label="Status" name="status" value={filtros.status}>
            <option value="todos">Todos os status</option>
            <option value="active">Ativo</option>
            <option value="trial">Trial</option>
            <option value="past_due">Pendente</option>
            <option value="suspended">Bloqueado</option>
            <option value="cancelled">Cancelado</option>
        </CampoSelect>
        <CampoSelect compact label="Proprietario" name="proprietario" value={filtros.proprietario}>
            <option value="todos">Todos os proprietarios</option>
            {opcoesProprietarios.map((proprietario) => (
              <option key={proprietario.id} value={proprietario.id}>{proprietario.nome}</option>
            ))}
        </CampoSelect>
        <CampoSelect compact label="Cidade" name="cidade" value={filtros.cidade}>
            <option value="todas">Todas as cidades</option>
            {opcoesCidades.map((cidade) => (
              <option key={cidade} value={cidade}>{cidade}</option>
            ))}
        </CampoSelect>
        <div className="relative">
          <Label className="sr-only" htmlFor="busca">Busca</Label>
          <Input
            className="pr-10"
            defaultValue={filtros.busca}
            id="busca"
            name="busca"
            placeholder="Buscar empreendimento..."
          />
          <button
            aria-label="Buscar empreendimentos"
            className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition hover:bg-cyan-500/10 hover:text-cyan-300"
            type="submit"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>
      </form>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {metricas.map((metrica) => <Resumo key={metrica.label} {...metrica} />)}
      </section>

      {empreendimentos.length ? (
        <section className="grid gap-4 xl:grid-cols-2">
          {empreendimentos.map((empreendimento) => (
            <CardEmpreendimento
              empreendimento={empreendimento}
              featureFlags={featureFlags}
              key={empreendimento.tenant.id}
              planFeatures={planFeatures}
            />
          ))}
        </section>
      ) : (
        <EmptyState
          description={temFiltroAtivo(filtros) ? "Nenhum empreendimento corresponde aos filtros aplicados." : "Nenhum empreendimento encontrado."}
          icon={<Filter />}
          title="Nenhum empreendimento encontrado"
        />
      )}
    </FadeIn>
  );
}

function CardEmpreendimento({
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
  const limiteCasas = empreendimento.operacao.casasLimite;
  const percentualCasas = limiteCasas > 0
    ? Math.min(100, Math.round((empreendimento.operacao.casasUsadas / limiteCasas) * 100))
    : 0;

  return (
    <article
      className={cn(
        "admin-glass-card flex min-h-full flex-col overflow-hidden",
        !ativo && "border-rose-500/45"
      )}
    >
      <div className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1.3fr)_minmax(120px,.7fr)_minmax(150px,1fr)] sm:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <div className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border", classeAvatar(empreendimento.tenant.status))}>
            <Building2 className="h-7 w-7" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-semibold">{empreendimento.tenant.name}</h2>
              <StatusBadge tone={toneTenant(empreendimento.tenant.status)}>{labelTenant(empreendimento.tenant.status)}</StatusBadge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Proprietario</p>
            <p className="truncate text-sm font-medium">{empreendimento.profile?.full_name ?? "Sem nome"}</p>
          </div>
        </div>

        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Plano</p>
          <p className="mt-1 truncate text-sm font-medium">{empreendimento.plan?.name ?? "Sem plano"}</p>
        </div>

        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Home className="h-4 w-4 text-cyan-300" />
              <p className="text-sm font-semibold">{empreendimento.operacao.casasUsadas}/{limiteCasas} casas</p>
            </div>
            <span className="text-xs text-muted-foreground">{percentualCasas}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-cyan-950/60">
            <div className="h-full rounded-full bg-cyan-400 transition-[width]" style={{ width: `${percentualCasas}%` }} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">do limite utilizado</p>
        </div>
      </div>

      <div className="grid border-y border-cyan-300/10 bg-background/20 sm:grid-cols-3">
        <DadoSecundario icon={<CalendarDays />} label="Criado em" valor={formatarData(empreendimento.tenant.created_at)} />
        <DadoSecundario icon={<Layers3 />} label="Modulos" valor={`${modulosAtivos.length} liberados`} />
        <DadoSecundario icon={<Clock3 />} label="Atualizado em" valor={formatarData(empreendimento.tenant.updated_at)} />
      </div>

      <div className="mt-auto grid gap-2 p-3 sm:grid-cols-2 2xl:grid-cols-5">
        <EntityViewModal
          description="Casas cadastradas neste tenant, sem editar dados do proprietario."
          title={`Casas de ${empreendimento.tenant.name}`}
          triggerClassName="w-full"
          triggerIcon={<Home />}
          triggerLabel="Casas"
        >
          <CasasDoEmpreendimento abrirInicialmente empreendimento={empreendimento} />
        </EntityViewModal>
        <EntityViewModal
          description="Identificacao, licenca, modulos e operacao do tenant."
          title={empreendimento.tenant.name}
          triggerClassName="w-full"
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
          triggerClassName="w-full"
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
          <ActionButton className="w-full" icon={<UserRound />} variant="view">
            Proprietario
          </ActionButton>
        </Link>

        <ConfirmDialog
          description={ativo ? "O proprietario perdera acesso operacional ao tenant." : "O tenant voltara ao status ativo."}
          title={ativo ? "Bloquear empreendimento" : "Reativar empreendimento"}
          triggerAction="status"
          triggerClassName="w-full"
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
  const modulosAtivos = featureFlags.filter((flag) => moduloEstaAtivo(empreendimento, flag, planFeatures));

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-4">
        <Info label="Casas" valor={`${empreendimento.operacao.casasUsadas}/${empreendimento.operacao.casasLimite}`} />
        <Info label="Modulos liberados" valor={String(modulosAtivos.length)} />
        <Info label="Licenca" valor={empreendimento.license ? labelLicenca(empreendimento.license.status) : "Sem licenca"} />
        <Info label="Localizacao" valor={localidadeEmpreendimento(empreendimento)} />
      </div>
      <CasasDoEmpreendimento empreendimento={empreendimento} />
      <ProprietarioDetails
        featureFlags={featureFlags}
        ocultarFinanceiro
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
  compact = false,
  label,
  name,
  value
}: {
  children: ReactNode;
  compact?: boolean;
  label: string;
  name: string;
  value: string;
}) {
  return (
    <div className="grid gap-2">
      <Label className={compact ? "sr-only" : undefined} htmlFor={name}>{label}</Label>
      <select className={campoClasse} defaultValue={value} id={name} name={name}>
        {children}
      </select>
    </div>
  );
}

function Resumo({ detalhe, label, tone, valor }: DadosModuloEmpreendimentos["metricas"][number]) {
  return (
    <article className="admin-glass-card flex min-h-24 items-center gap-3 p-4">
      <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border", classeResumo(tone))}>
        {iconeResumo(label)}
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold leading-none">{valor}</p>
        <p className="mt-2 truncate text-xs text-muted-foreground">{detalhe}</p>
      </div>
    </article>
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

function DadoSecundario({ icon, label, valor }: { icon: ReactNode; label: string; valor: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3 border-b border-cyan-300/10 p-3 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <span className="text-cyan-300 [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{valor}</p>
      </div>
    </div>
  );
}

function localidadeEmpreendimento(empreendimento: EmpreendimentoCompleto) {
  const cidade = empreendimento.profile?.city?.trim();
  const estado = empreendimento.profile?.state?.trim();
  if (cidade && estado) return `${cidade} - ${estado}`;
  return cidade || estado || "Localizacao nao informada";
}

function iconeResumo(label: string) {
  if (label === "Empreendimentos ativos") return <CheckCircle2 className="h-6 w-6" />;
  if (label === "Em periodo trial") return <Clock3 className="h-6 w-6" />;
  if (label === "Bloqueados") return <Lock className="h-6 w-6" />;
  if (label === "Modulos liberados") return <Layers3 className="h-6 w-6" />;
  return <Building2 className="h-6 w-6" />;
}

function classeResumo(tone: DadosModuloEmpreendimentos["metricas"][number]["tone"]) {
  if (tone === "success") return "border-emerald-400/20 bg-emerald-500/10 text-emerald-300";
  if (tone === "warning") return "border-amber-400/20 bg-amber-500/10 text-amber-300";
  if (tone === "danger") return "border-rose-400/20 bg-rose-500/10 text-rose-300";
  return "border-cyan-300/20 bg-cyan-500/10 text-cyan-300";
}

function classeAvatar(status: EmpreendimentoCompleto["tenant"]["status"]) {
  if (status === "trial" || status === "past_due") return "border-amber-400/20 bg-amber-500/10 text-amber-300";
  if (status === "suspended" || status === "cancelled") return "border-rose-400/20 bg-rose-500/10 text-rose-300";
  return "border-cyan-300/20 bg-cyan-500/10 text-cyan-300";
}

function temFiltroAtivo(filtros: DadosModuloEmpreendimentos["filtros"]) {
  return Boolean(
    filtros.busca ||
    filtros.cidade !== "todas" ||
    filtros.licenca !== "todas" ||
    filtros.modulo !== "todos" ||
    filtros.plano !== "todos" ||
    filtros.proprietario !== "todos" ||
    filtros.status !== "todos"
  );
}

function toneTenant(status: EmpreendimentoCompleto["tenant"]["status"]) {
  if (status === "active") return "success";
  if (status === "trial" || status === "past_due") return "warning";
  if (status === "suspended" || status === "cancelled") return "danger";
  return "neutral";
}
