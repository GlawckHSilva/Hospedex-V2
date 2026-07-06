"use client";

import { Building2, Crown, Plus, Search } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { Badge, Card, CardContent, FadeIn } from "@hospedex/ui";

import { EntityModal } from "../management/entity-modal";
import { EmptyState, EntityGrid } from "../management/entity-card";
import { ModuleToast } from "../admin/module-toast";
import type {
  DadosModuloPropriedades,
  PropriedadeComRelacionamentos,
  SearchParamsModulo,
} from "../../lib/properties/types";
import { PropertyCard } from "./property-card";
import { PropertyForm } from "./property-form";

/**
 * Módulo base de Casas.
 *
 * Renderiza apenas a operação inicial do tenant atual. Reservas, pagamentos,
 * marketplace e calendário completo permanecem fora deste módulo por escopo.
 */

export type PropertyModuleProps = DadosModuloPropriedades &
  SearchParamsModulo & {
    tenantNome: string;
  };

const MENSAGENS_SUCESSO_PROPRIEDADES: Record<string, string> = {
  "propriedade-criada": "Casa criada com sucesso.",
  "propriedade-atualizada": "Casa atualizada com sucesso.",
  "propriedade-excluida": "Propriedade excluída com sucesso.",
  "status-propriedade": "Status da casa atualizado.",
  "galeria-atualizada": "Galeria atualizada com sucesso.",
  "imagem-principal": "Imagem principal atualizada.",
  "imagem-excluida": "Imagem excluída com sucesso.",
  "comodidades-atualizadas": "Comodidades atualizadas com sucesso.",
  "politica-cancelamento-atualizada": "Politica de cancelamento atualizada.",
  "regras-casa-atualizadas": "Regras da casa atualizadas.",
  "regras-reserva-atualizadas": "Regras de reserva atualizadas.",
};

export function PropertyModule({
  comodidadesDisponiveis,
  erro,
  limitesPlano,
  podeGerenciar,
  propriedades,
  sucesso,
  tenantNome,
}: PropertyModuleProps) {
  return (
    <FadeIn className="space-y-5">
      <ModuleToast
        erro={erro}
        mensagensSucesso={MENSAGENS_SUCESSO_PROPRIEDADES}
        sucesso={sucesso}
      />

      <section className="admin-glass-panel p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Badge variant={podeGerenciar ? "info" : "warning"}>
              {podeGerenciar ? "Gestão liberada" : "Somente leitura"}
            </Badge>
            <h1 className="mt-3 text-2xl font-semibold tracking-normal">
              Casas cadastradas
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Gerencie suas hospedagens, fotos, disponibilidade, valores e publicação.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <ResumoModulo
              icon={<Building2 />}
              label="Casas cadastradas"
              progresso={
                limitesPlano.maxPropriedades > 0
                  ? limitesPlano.propriedadesUsadas / limitesPlano.maxPropriedades
                  : 0
              }
              valor={`${limitesPlano.propriedadesUsadas}/${limitesPlano.maxPropriedades}`}
            />
            <ResumoModulo
              icon={<Crown />}
              label="Plano"
              valor={limitesPlano.nomePlano}
            />
          </div>
        </div>
      </section>

      <VisaoPropriedades
        comodidadesDisponiveis={comodidadesDisponiveis}
        podeGerenciar={podeGerenciar}
        propriedades={propriedades}
      />
    </FadeIn>
  );
}

function VisaoPropriedades({
  comodidadesDisponiveis,
  podeGerenciar,
  propriedades,
}: Pick<
  PropertyModuleProps,
  | "comodidadesDisponiveis"
  | "podeGerenciar"
  | "propriedades"
>) {
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("todos");
  const [publicacao, setPublicacao] = useState("todas");
  const [ordem, setOrdem] = useState("recentes");
  const propriedadesFiltradas = useMemo(
    () => filtrarPropriedades(propriedades, { busca, ordem, publicacao, status }),
    [busca, ordem, propriedades, publicacao, status],
  );

  return (
    <>
      <Card className="admin-glass-card">
        <CardContent className="grid gap-3 p-4 lg:grid-cols-[minmax(16rem,1fr)_12rem_12rem_12rem_auto] lg:items-end">
          <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
            Busca
            <span className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-300" />
              <input
                className="h-11 w-full rounded-xl border bg-background/65 pl-10 pr-3 text-sm outline-none transition focus:border-cyan-300/60"
                onChange={(evento) => setBusca(evento.target.value)}
                placeholder="Buscar por nome, cidade ou tipo..."
                value={busca}
              />
            </span>
          </label>
          <CampoFiltro label="Status" onChange={setStatus} value={status}>
            <option value="todos">Todos</option>
            <option value="published">Ativas</option>
            <option value="draft">Rascunhos</option>
            <option value="paused">Pausadas</option>
          </CampoFiltro>
          <CampoFiltro label="Publicação" onChange={setPublicacao} value={publicacao}>
            <option value="todas">Todas</option>
            <option value="publicadas">Publicadas</option>
            <option value="privadas">Privadas</option>
          </CampoFiltro>
          <CampoFiltro label="Ordenar por" onChange={setOrdem} value={ordem}>
            <option value="recentes">Mais recentes</option>
            <option value="antigas">Mais antigas</option>
            <option value="nome">Nome</option>
          </CampoFiltro>
          <EntityModal
            description="Cadastre as informações principais para publicar sua hospedagem."
            disabled={!podeGerenciar}
            eyebrow="CADASTRO"
            size="full"
            title="Nova casa"
            triggerIcon={<Plus className="h-4 w-4" />}
            triggerLabel="Nova casa"
            triggerVariant="default"
          >
            <PropertyForm
              comodidadesDisponiveis={comodidadesDisponiveis}
              modo="criar"
              podeGerenciar={podeGerenciar}
            />
          </EntityModal>
        </CardContent>
      </Card>

      {propriedadesFiltradas.length > 0 ? (
        <>
          <EntityGrid className="xl:grid-cols-2 2xl:grid-cols-2">
            {propriedadesFiltradas.map((propriedade) => (
              <PropertyCard
                key={propriedade.id}
                comodidadesDisponiveis={comodidadesDisponiveis}
                podeGerenciar={podeGerenciar}
                propriedade={propriedade}
              />
            ))}
          </EntityGrid>
          <div className="admin-glass-card flex flex-col gap-3 rounded-xl border p-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>
              Mostrando {propriedadesFiltradas.length} de {propriedades.length} casa
              {propriedades.length === 1 ? "" : "s"}
            </span>
            <span>20 por página</span>
          </div>
        </>
      ) : (
        <EmptyState
          description="Nenhuma casa encontrada para os filtros selecionados."
          icon={<Building2 className="h-5 w-5" />}
          title="Nenhuma casa encontrada"
        />
      )}
    </>
  );
}

function ResumoModulo({
  icon,
  label,
  progresso,
  valor,
}: {
  icon: ReactNode;
  label: string;
  progresso?: number | undefined;
  valor: string;
}) {
  return (
    <div className="min-w-52 rounded-xl border bg-background/55 p-4 text-sm">
      <div className="flex items-center gap-4">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-cyan-500/10 text-primary [&_svg]:h-5 [&_svg]:w-5">
          {icon}
        </span>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="truncate text-xl font-semibold">{valor}</p>
        </div>
      </div>
      {typeof progresso === "number" ? (
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-cyan-950/50">
          <span
            className="block h-full rounded-full bg-cyan-300"
            style={{ width: `${Math.min(Math.max(progresso, 0), 1) * 100}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

function CampoFiltro({
  children,
  label,
  onChange,
  value,
}: {
  children: ReactNode;
  label: string;
  onChange: (valor: string) => void;
  value: string;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
      {label}
      <select
        className="h-11 rounded-xl border bg-background/65 px-3 text-sm text-foreground outline-none transition focus:border-cyan-300/60"
        onChange={(evento) => onChange(evento.target.value)}
        value={value}
      >
        {children}
      </select>
    </label>
  );
}

function filtrarPropriedades(
  propriedades: PropriedadeComRelacionamentos[],
  filtros: {
    busca: string;
    ordem: string;
    publicacao: string;
    status: string;
  },
) {
  const buscaNormalizada = normalizarBusca(filtros.busca);

  return propriedades
    .filter((propriedade) => {
      if (filtros.status !== "todos" && propriedade.status !== filtros.status) return false;
      if (filtros.publicacao === "publicadas" && !propriedade.is_public) return false;
      if (filtros.publicacao === "privadas" && propriedade.is_public) return false;
      if (!buscaNormalizada) return true;

      return normalizarBusca(
        [
          propriedade.name,
          propriedade.enderecoFormatado.cidade,
          propriedade.enderecoFormatado.estado,
          obterLabelTipo(propriedade.property_type),
        ].join(" "),
      ).includes(buscaNormalizada);
    })
    .sort((a, b) => {
      if (filtros.ordem === "nome") return a.name.localeCompare(b.name, "pt-BR");
      const dataA = new Date(a.updated_at).getTime();
      const dataB = new Date(b.updated_at).getTime();
      return filtros.ordem === "antigas" ? dataA - dataB : dataB - dataA;
    });
}

function normalizarBusca(valor: string) {
  return valor
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function obterLabelTipo(tipo: PropriedadeComRelacionamentos["property_type"]): string {
  if (tipo === "inn") return "Pousada";
  if (tipo === "small_hotel") return "Pequeno hotel";
  return "Casa de temporada";
}
