import {
  Box,
  EyeOff,
  Filter,
  Gift,
  Info,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  X,
  type LucideIcon
} from "lucide-react";
import Link from "next/link";

import { Button, Card, CardContent, FadeIn, Label, cn } from "@hospedex/ui";

import { ModuleToast } from "../admin/module-toast";
import { EmptyState, EntityGrid } from "../management/entity-card";
import { EntityModal } from "../management/entity-modal";
import { criarServicoExtraAction } from "../../lib/extra-services/actions";
import {
  STATUS_SERVICO_EXTRA,
  TIPOS_COBRANCA_SERVICO_EXTRA,
  type DadosModuloServicosExtras,
  type SearchParamsServicosExtras
} from "../../lib/extra-services/types";
import { ExtraServiceCard } from "./extra-service-card";
import { ExtraServiceForm } from "./extra-service-form";

/**
 * Módulo de Serviços Extras do Gerenciamento.
 *
 * Entrega o catálogo operacional. A seleção pelo hóspede no Marketplace e o
 * cálculo automático em reservas ficam preparados, mas não implementados aqui.
 */
export type ExtraServicesModuleProps = DadosModuloServicosExtras &
  SearchParamsServicosExtras;

const MENSAGENS_SUCESSO: Record<string, string> = {
  "servico-atualizado": "Serviço extra atualizado.",
  "servico-criado": "Serviço extra criado.",
  "servico-excluido": "Serviço extra apagado.",
  "status-atualizado": "Status do serviço extra atualizado."
};

const campoClasse =
  "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const FILTROS_OBRIGATORIEDADE = [
  { label: "Todos", value: "todos" },
  { label: "Obrigatórios", value: "obrigatorios" },
  { label: "Opcionais", value: "opcionais" }
] as const;

export function ExtraServicesModule({
  casas,
  erro,
  filtros,
  podeGerenciar,
  resumo,
  servicos,
  sucesso
}: ExtraServicesModuleProps) {
  const temFiltrosAtivos =
    Boolean(filtros.busca) ||
    filtros.status !== "todos" ||
    filtros.tipoCobranca !== "todos" ||
    filtros.obrigatoriedade !== "todos";

  return (
    <FadeIn className="space-y-5">
      <ModuleToast
        erro={erro}
        mensagensSucesso={MENSAGENS_SUCESSO}
        sucesso={sucesso}
      />

      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">
            Serviços extras
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Gerencie adicionais opcionais e obrigatórios das reservas.
          </p>
        </div>

        <BotaoNovoServico casas={casas} podeGerenciar={podeGerenciar} />
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Resumo
          descricao="Serviços cadastrados"
          icon={Box}
          label="Total"
          tom="cyan"
          valor={String(resumo.total)}
        />
        <Resumo
          descricao="Serviços ativos"
          icon={ShieldCheck}
          label="Ativos"
          tom="verde"
          valor={String(resumo.ativos)}
        />
        <Resumo
          descricao="Serviços inativos"
          icon={EyeOff}
          label="Inativos"
          tom="cinza"
          valor={String(resumo.inativos)}
        />
        <Resumo
          descricao="Serviços obrigatórios"
          icon={Sparkles}
          label="Obrigatórios"
          tom="laranja"
          valor={String(resumo.obrigatorios)}
        />
      </section>

      <Card className="admin-glass-card">
        <CardContent className="p-4">
          <form className="hidden gap-4 lg:grid lg:grid-cols-[minmax(220px,1.4fr)_repeat(3,minmax(160px,1fr))_auto] lg:items-end">
            <CampoBusca valor={filtros.busca} />
            <CampoStatus valor={filtros.status} />
            <CampoTipoCobranca valor={filtros.tipoCobranca} />
            <CampoObrigatoriedade valor={filtros.obrigatoriedade} />
            <AcoesFiltro />
          </form>

          <form className="grid gap-3 lg:hidden">
            <CampoBusca valor={filtros.busca} />
            <details className="rounded-xl border border-cyan-300/15 bg-background/35 p-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold">
                <span className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-cyan-300" />
                  Filtros
                </span>
                <span className="text-xs text-muted-foreground">
                  Status, cobrança e tipo
                </span>
              </summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <CampoStatus valor={filtros.status} />
                <CampoTipoCobranca valor={filtros.tipoCobranca} />
                <CampoObrigatoriedade valor={filtros.obrigatoriedade} />
                <AcoesFiltro />
              </div>
            </details>
          </form>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold">Catálogo de serviços</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie adicionais opcionais ou obrigatórios por modal.
          </p>
        </div>

        {servicos.length > 0 ? (
          <EntityGrid className="lg:grid-cols-2 2xl:grid-cols-2">
            {servicos.map((servico) => (
              <ExtraServiceCard
                casas={casas}
                key={servico.id}
                podeGerenciar={podeGerenciar}
                servico={servico}
              />
            ))}
          </EntityGrid>
        ) : (
          <EmptyState
            action={
              temFiltrosAtivos ? (
                <Link
                  className="inline-flex h-9 items-center justify-center rounded-xl border border-cyan-300/35 px-3 text-sm font-semibold text-cyan-100 transition-colors hover:bg-cyan-500/10"
                  href="/servicos-extras"
                >
                  Limpar filtros
                </Link>
              ) : (
                <BotaoNovoServico casas={casas} podeGerenciar={podeGerenciar} />
              )
            }
            description={
              temFiltrosAtivos
                ? "Altere a busca ou limpe os filtros para continuar."
                : "Cadastre adicionais opcionais ou obrigatórios para oferecer nas reservas."
            }
            icon={<Gift className="h-5 w-5" />}
            title={
              temFiltrosAtivos
                ? "Nenhum serviço encontrado com esses filtros"
                : "Nenhum serviço extra cadastrado"
            }
          />
        )}
      </section>

      <div className="flex items-start gap-3 rounded-xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
        <p>
          Serviços extras vinculados a reservas não podem ser apagados sem
          preservar histórico. Inative o serviço para impedir novos usos sem
          afetar reservas já criadas.
        </p>
      </div>
    </FadeIn>
  );
}

function BotaoNovoServico({
  casas,
  podeGerenciar
}: {
  casas: DadosModuloServicosExtras["casas"];
  podeGerenciar: boolean;
}) {
  return (
    <EntityModal
      description="Defina nome, preço, cobrança e casas onde o serviço se aplica."
      disabled={!podeGerenciar}
      eyebrow="Cadastro"
      title="Novo serviço extra"
      triggerClassName="h-11 justify-center"
      triggerIcon={<Plus className="h-4 w-4" />}
      triggerLabel="Novo serviço"
      triggerVariant="default"
    >
      <ExtraServiceForm
        action={criarServicoExtraAction}
        casas={casas}
        modo="criar"
        podeGerenciar={podeGerenciar}
      />
    </EntityModal>
  );
}

function CampoBusca({ valor }: { valor: string }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="busca">Busca</Label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          className={cn(campoClasse, "pl-9")}
          defaultValue={valor}
          id="busca"
          name="busca"
          placeholder="Buscar por nome do serviço..."
        />
      </div>
    </div>
  );
}

function CampoStatus({
  valor
}: {
  valor: DadosModuloServicosExtras["filtros"]["status"];
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="status">Status</Label>
      <select className={campoClasse} defaultValue={valor} id="status" name="status">
        {STATUS_SERVICO_EXTRA.map((status) => (
          <option key={status.value} value={status.value}>
            {status.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function CampoTipoCobranca({
  valor
}: {
  valor: DadosModuloServicosExtras["filtros"]["tipoCobranca"];
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="tipoCobranca">Tipo de cobrança</Label>
      <select
        className={campoClasse}
        defaultValue={valor}
        id="tipoCobranca"
        name="tipoCobranca"
      >
        <option value="todos">Todos</option>
        {TIPOS_COBRANCA_SERVICO_EXTRA.map((tipo) => (
          <option key={tipo.value} value={tipo.value}>
            {tipo.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function CampoObrigatoriedade({
  valor
}: {
  valor: DadosModuloServicosExtras["filtros"]["obrigatoriedade"];
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="obrigatoriedade">Obrigatório / opcional</Label>
      <select
        className={campoClasse}
        defaultValue={valor}
        id="obrigatoriedade"
        name="obrigatoriedade"
      >
        {FILTROS_OBRIGATORIEDADE.map((filtro) => (
          <option key={filtro.value} value={filtro.value}>
            {filtro.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function AcoesFiltro() {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:min-w-36 lg:grid-cols-1">
      <Button className="w-full" type="submit" variant="outline">
        <Filter />
        Filtrar
      </Button>
      <Link
        className="inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors hover:bg-cyan-500/10"
        href="/servicos-extras"
      >
        <X className="h-4 w-4" />
        Limpar filtros
      </Link>
    </div>
  );
}

function Resumo({
  descricao,
  icon: Icon,
  label,
  tom,
  valor
}: {
  descricao: string;
  icon: LucideIcon;
  label: string;
  tom: "cinza" | "cyan" | "laranja" | "verde";
  valor: string;
}) {
  return (
    <div className={cn("min-w-0 rounded-xl border p-4 text-sm", classesResumo[tom].card)}>
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            classesResumo[tom].icon
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold leading-tight">{valor}</p>
          <p className="mt-1 text-xs text-muted-foreground">{descricao}</p>
        </div>
      </div>
    </div>
  );
}

const classesResumo = {
  cinza: {
    card: "border-slate-400/15 bg-slate-500/8",
    icon: "bg-slate-500/15 text-slate-200"
  },
  cyan: {
    card: "border-cyan-400/20 bg-cyan-500/8",
    icon: "bg-cyan-500/15 text-cyan-200"
  },
  laranja: {
    card: "border-orange-400/20 bg-orange-500/8",
    icon: "bg-orange-500/15 text-orange-200"
  },
  verde: {
    card: "border-emerald-400/20 bg-emerald-500/8",
    icon: "bg-emerald-500/15 text-emerald-200"
  }
};
