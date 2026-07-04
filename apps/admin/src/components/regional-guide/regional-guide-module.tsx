import {
  Grid2X2,
  MapPin,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  ToggleLeft,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import {
  Button,
  Card,
  CardContent,
  FadeIn,
  Input,
  Label,
  cn,
} from "@hospedex/ui";

import { EntityModal } from "../management/entity-modal";
import { EmptyState } from "../management/entity-card";
import { criarLocalGuiaRegiaoAction } from "../../lib/regional-guide/actions";
import {
  CATEGORIAS_GUIA_REGIAO,
  STATUS_GUIA_REGIAO,
  type DadosModuloGuiaRegiao,
  type SearchParamsGuiaRegiao,
} from "../../lib/regional-guide/types";
import { ModuleToast } from "../admin/module-toast";
import { RegionalGuideCard } from "./regional-guide-card";
import { RegionalGuideForm } from "./regional-guide-form";

/**
 * Catálogo administrativo do Guia da região.
 *
 * O módulo mostra recomendações do tenant atual. A leitura e as permissões
 * continuam no servidor para manter isolamento multi-tenant e feature flag.
 */

export type RegionalGuideModuleProps = DadosModuloGuiaRegiao &
  SearchParamsGuiaRegiao;

const MENSAGENS_SUCESSO: Record<string, string> = {
  "local-atualizado": "Local atualizado com sucesso.",
  "local-criado": "Local criado com sucesso.",
  "local-excluido": "Local excluído.",
  "status-atualizado": "Status do local atualizado.",
};

const campoClasse =
  "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function RegionalGuideModule({
  erro,
  filtros,
  locais,
  podeGerenciar,
  resumo,
  sucesso,
}: RegionalGuideModuleProps) {
  const existemFiltrosAtivos =
    Boolean(filtros.busca) ||
    filtros.categoria !== "todas" ||
    filtros.status !== "todos";

  return (
    <FadeIn className="space-y-5">
      <ModuleToast
        erro={erro}
        mensagensSucesso={MENSAGENS_SUCESSO}
        sucesso={sucesso}
      />

      <section className="admin-glass-panel space-y-5 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">
              Guia da região
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Cadastre recomendações úteis para aparecer no guia da região da hospedagem.
            </p>
          </div>

          <BotaoNovoLocal podeGerenciar={podeGerenciar} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Resumo
            descricao="Cadastrados"
            icon={<MapPin />}
            label="Total de locais"
            tone="info"
            valor={resumo.total}
          />
          <Resumo
            descricao="Visíveis para hóspedes"
            icon={<ShieldCheck />}
            label="Ativo"
            tone="success"
            valor={resumo.ativos}
          />
          <Resumo
            descricao="Não visíveis"
            icon={<ToggleLeft />}
            label="Inativo"
            tone="muted"
            valor={resumo.inativos}
          />
          <Resumo
            descricao="Restaurante, mercado e mais"
            icon={<Grid2X2 />}
            label="Categorias"
            tone="cyan"
            valor={resumo.categorias}
          />
        </div>
      </section>

      <Card className="admin-glass-card">
        <CardContent className="p-4 sm:p-5">
          <form className="grid gap-4 xl:grid-cols-[1.5fr_1fr_1fr_auto_auto] xl:items-end">
            <CampoBusca defaultValue={filtros.busca} />
            <CampoCategoria defaultValue={filtros.categoria} />
            <CampoStatus defaultValue={filtros.status} />
            <Button className="w-full" type="submit">
              <Search />
              Filtrar
            </Button>
            <Link
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-card/65 px-4 text-sm font-semibold transition hover:border-cyan-400/45 hover:bg-cyan-500/10 hover:text-cyan-100"
              href="/guia-regiao"
            >
              <RotateCcw className="h-4 w-4" />
              Limpar filtros
            </Link>
            <div className="xl:hidden">
              <span className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/25 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-100">
                <SlidersHorizontal className="h-4 w-4" />
                Filtros avançados ativos nesta área
              </span>
            </div>
          </form>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Locais recomendados</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Catálogo visual de recomendações que o proprietário prepara para os hóspedes.
          </p>
        </div>

        {locais.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {locais.map((local) => (
              <RegionalGuideCard
                key={local.id}
                local={local}
                podeGerenciar={podeGerenciar}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            action={
              existemFiltrosAtivos ? (
                <Link
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-cyan-400/35 bg-cyan-500/10 px-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/15"
                  href="/guia-regiao"
                >
                  Limpar filtros
                </Link>
              ) : (
                <BotaoNovoLocal podeGerenciar={podeGerenciar} />
              )
            }
            description={
              existemFiltrosAtivos
                ? "Altere a busca ou limpe os filtros para continuar."
                : "Cadastre restaurantes, mercados, praias, passeios e serviços úteis para seus hóspedes."
            }
            icon={<MapPin className="h-5 w-5" />}
            title={
              existemFiltrosAtivos
                ? "Nenhum local encontrado com esses filtros"
                : "Nenhum local cadastrado"
            }
          />
        )}
      </section>

      <div className="rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100/90">
        Locais inativos não aparecem para os hóspedes, mas continuam salvos no
        painel.
      </div>
    </FadeIn>
  );
}

function BotaoNovoLocal({ podeGerenciar }: { podeGerenciar: boolean }) {
  return (
    <EntityModal
      description="Cadastre um local útil para aparecer no guia da região da hospedagem."
      disabled={!podeGerenciar}
      eyebrow="CADASTRO"
      size="full"
      title="Nova recomendação local"
      triggerAction="add"
      triggerClassName="w-full sm:w-auto"
      triggerIcon={<Plus className="h-4 w-4" />}
      triggerLabel="Novo local"
      triggerSize="md"
    >
      <RegionalGuideForm
        action={criarLocalGuiaRegiaoAction}
        modo="criar"
        podeGerenciar={podeGerenciar}
      />
    </EntityModal>
  );
}

function Resumo({
  descricao,
  icon,
  label,
  tone,
  valor,
}: {
  descricao: string;
  icon: ReactNode;
  label: string;
  tone: "info" | "success" | "muted" | "cyan";
  valor: number;
}) {
  const classes = {
    cyan: "from-cyan-500/16 to-cyan-500/4 text-cyan-300",
    info: "from-sky-500/16 to-sky-500/4 text-sky-300",
    muted: "from-slate-500/14 to-slate-500/4 text-slate-300",
    success: "from-emerald-500/16 to-emerald-500/4 text-emerald-300",
  }[tone];

  return (
    <div
      className={cn(
        "rounded-xl border border-border/80 bg-gradient-to-br p-4 shadow-sm",
        classes
      )}
    >
      <div className="flex items-start gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-current/20 bg-current/10 [&_svg]:h-5 [&_svg]:w-5">
          {icon}
        </span>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{valor}</p>
          <p className="mt-2 text-xs text-muted-foreground">{descricao}</p>
        </div>
      </div>
    </div>
  );
}

function CampoBusca({ defaultValue }: { defaultValue: string }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="busca">Busca</Label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-10"
          defaultValue={defaultValue}
          id="busca"
          name="busca"
          placeholder="Buscar por nome, endereço ou categoria..."
        />
      </div>
    </div>
  );
}

function CampoCategoria({ defaultValue }: { defaultValue: string }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="categoria">Categoria</Label>
      <select
        className={campoClasse}
        defaultValue={defaultValue}
        id="categoria"
        name="categoria"
      >
        {CATEGORIAS_GUIA_REGIAO.map((categoria) => (
          <option key={categoria.value} value={categoria.value}>
            {categoria.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function CampoStatus({ defaultValue }: { defaultValue: string }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="status">Status</Label>
      <select
        className={campoClasse}
        defaultValue={defaultValue}
        id="status"
        name="status"
      >
        {STATUS_GUIA_REGIAO.map((status) => (
          <option key={status.value} value={status.value}>
            {status.label}
          </option>
        ))}
      </select>
    </div>
  );
}
