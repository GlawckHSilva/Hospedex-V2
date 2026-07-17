"use client";

import { Building2, CloudOff, Crown, Plus, Search } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { Badge, Card, CardContent, FadeIn } from "@hospedex/ui";

import { ModuleToast } from "../admin/module-toast";
import { EmptyState, EntityGrid } from "../management/entity-card";
import { EntityModal } from "../management/entity-modal";
import type {
  DadosModuloPropriedades,
  PropriedadeComRelacionamentos,
  SearchParamsModulo,
} from "../../lib/properties/types";
import {
  EVENTO_RASCUNHO_CASA,
  listarRascunhosCasasLocais,
  obterCampoRascunho,
} from "../../lib/properties/property-draft-local";
import { PropertyCard } from "./property-card";
import { PropertyForm } from "./property-form";

/**
 * Modulo de Casas do Gerenciamento.
 *
 * Esta tela lista apenas casas do tenant atual. A filtragem acontece sobre os
 * dados ja carregados pela camada segura, preservando o isolamento multi-tenant
 * sem criar consultas paralelas na UI.
 */

export type PropertyModuleProps = DadosModuloPropriedades &
  SearchParamsModulo & {
    tenantNome: string;
    userId: string;
  };

type FiltroStatus = "todos" | "ativas" | "inativas";
type FiltroPublicacao = "todas" | "publicadas" | "rascunho" | "nao_publicadas";
type OrdenacaoCasas =
  | "recentes"
  | "antigas"
  | "nome"
  | "cidade"
  | "atualizacao";

const MENSAGENS_SUCESSO_PROPRIEDADES: Record<string, string> = {
  "propriedade-criada": "Casa criada com sucesso.",
  "propriedade-atualizada": "Casa atualizada com sucesso.",
  "propriedade-excluida": "Propriedade excluida com sucesso.",
  "status-propriedade": "Status da casa atualizado.",
  "galeria-atualizada": "Galeria atualizada com sucesso.",
  "imagem-principal": "Imagem principal atualizada.",
  "imagem-excluida": "Imagem excluida com sucesso.",
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
  userId,
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
              {podeGerenciar ? "Gestao liberada" : "Somente leitura"}
            </Badge>
            <h1 className="mt-3 text-2xl font-semibold tracking-normal">
              Casas cadastradas
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Gerencie suas hospedagens, fotos, disponibilidade, valores e
              publicacao.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <ResumoModulo
              icon={<Building2 />}
              label="Casas cadastradas"
              progresso={
                limitesPlano.maxPropriedades > 0
                  ? limitesPlano.propriedadesUsadas /
                    limitesPlano.maxPropriedades
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
        userId={userId}
      />
    </FadeIn>
  );
}

function VisaoPropriedades({
  comodidadesDisponiveis,
  podeGerenciar,
  propriedades,
  userId,
}: Pick<
  PropertyModuleProps,
  "comodidadesDisponiveis" | "podeGerenciar" | "propriedades" | "userId"
>) {
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<FiltroStatus>("todos");
  const [publicacao, setPublicacao] = useState<FiltroPublicacao>("todas");
  const [ordem, setOrdem] = useState<OrdenacaoCasas>("recentes");
  const [rascunhosLocais, setRascunhosLocais] = useState(() =>
    listarRascunhosCasasLocais(userId),
  );
  const propriedadesFiltradas = useMemo(
    () => filtrarPropriedades(propriedades, { busca, ordem, publicacao, status }),
    [busca, ordem, propriedades, publicacao, status],
  );
  const idsServidor = useMemo(
    () => new Set(propriedades.map((propriedade) => propriedade.id)),
    [propriedades],
  );
  const rascunhosPendentes = rascunhosLocais.filter(
    (rascunho) => !idsServidor.has(rascunho.operacaoId),
  );

  useEffect(() => {
    const atualizar = () =>
      setRascunhosLocais(listarRascunhosCasasLocais(userId));
    atualizar();
    window.addEventListener(EVENTO_RASCUNHO_CASA, atualizar);
    window.addEventListener("storage", atualizar);
    return () => {
      window.removeEventListener(EVENTO_RASCUNHO_CASA, atualizar);
      window.removeEventListener("storage", atualizar);
    };
  }, [userId]);

  return (
    <>
      <Card className="admin-glass-card">
        <CardContent className="grid gap-3 p-4 lg:grid-cols-[minmax(16rem,1fr)_10rem_11rem_12rem_auto] lg:items-end">
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

          <CampoFiltro
            label="Status"
            onChange={(valor) => setStatus(valor as FiltroStatus)}
            value={status}
          >
            <option value="todos">Todos</option>
            <option value="ativas">Ativas</option>
            <option value="inativas">Inativas</option>
          </CampoFiltro>

          <CampoFiltro
            label="Publicacao"
            onChange={(valor) => setPublicacao(valor as FiltroPublicacao)}
            value={publicacao}
          >
            <option value="todas">Todas</option>
            <option value="publicadas">Publicadas</option>
            <option value="rascunho">Rascunho</option>
            <option value="nao_publicadas">Nao publicadas</option>
          </CampoFiltro>

          <CampoFiltro
            label="Ordenar por"
            onChange={(valor) => setOrdem(valor as OrdenacaoCasas)}
            value={ordem}
          >
            <option value="recentes">Mais recentes</option>
            <option value="antigas">Mais antigas</option>
            <option value="nome">Nome A-Z</option>
            <option value="cidade">Cidade</option>
            <option value="atualizacao">Ultima atualizacao</option>
          </CampoFiltro>

          <BotaoNovaCasa
            comodidadesDisponiveis={comodidadesDisponiveis}
            podeGerenciar={podeGerenciar}
            userId={userId}
          />
        </CardContent>
      </Card>

      {rascunhosPendentes.map((rascunho) => (
        <Card
          className="admin-glass-card border-amber-400/30"
          key={rascunho.operacaoId}
        >
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <CloudOff className="mt-0.5 h-5 w-5 text-amber-500" />
              <div>
                <p className="font-semibold">
                  {obterCampoRascunho(rascunho, "nome") || "Casa sem titulo"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Salvo neste dispositivo — aguardando sincronizacao.
                </p>
              </div>
            </div>
            <BotaoNovaCasa
              comodidadesDisponiveis={comodidadesDisponiveis}
              podeGerenciar={podeGerenciar}
              triggerLabel="Continuar rascunho"
              userId={userId}
            />
          </CardContent>
        </Card>
      ))}

      {propriedadesFiltradas.length > 0 ? (
        <>
          <div data-tour-id="casas-lista">
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
          </div>
          <div className="admin-glass-card flex flex-col gap-3 rounded-xl border p-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>
              Mostrando {propriedadesFiltradas.length} de {propriedades.length}{" "}
              casa{propriedades.length === 1 ? "" : "s"}
            </span>
            <span>20 por pagina</span>
          </div>
        </>
      ) : (
        <EmptyState
          action={
            propriedades.length === 0 ? (
              <BotaoNovaCasa
                comodidadesDisponiveis={comodidadesDisponiveis}
                podeGerenciar={podeGerenciar}
                userId={userId}
              />
            ) : null
          }
          description={
            propriedades.length === 0
              ? "Cadastre sua primeira casa para gerenciar fotos, valores e publicacao."
              : "Nenhuma casa encontrada para os filtros selecionados."
          }
          icon={<Building2 className="h-5 w-5" />}
          title={
            propriedades.length === 0
              ? "Nenhuma casa cadastrada"
              : "Nenhuma casa encontrada"
          }
        />
      )}
    </>
  );
}

function BotaoNovaCasa({
  comodidadesDisponiveis,
  podeGerenciar,
  triggerLabel = "Nova casa",
  userId,
}: Pick<PropertyModuleProps, "comodidadesDisponiveis" | "podeGerenciar" | "userId"> & {
  triggerLabel?: string;
}) {
  return (
    <span data-tour-id={triggerLabel === "Nova casa" ? "casas-nova" : undefined}>
      <EntityModal
        description="Cadastre as informacoes principais para publicar sua hospedagem."
        disabled={!podeGerenciar}
        eyebrow="CADASTRO"
        size="full"
        title="Nova casa"
        triggerClassName="h-11 justify-center"
        triggerIcon={<Plus className="h-4 w-4" />}
        triggerLabel={triggerLabel}
        triggerVariant="default"
      >
        <PropertyForm
          comodidadesDisponiveis={comodidadesDisponiveis}
          modo="criar"
          podeGerenciar={podeGerenciar}
          userId={userId}
        />
      </EntityModal>
    </span>
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
    ordem: OrdenacaoCasas;
    publicacao: FiltroPublicacao;
    status: FiltroStatus;
  },
) {
  const buscaNormalizada = normalizarBusca(filtros.busca);

  return propriedades
    .filter((propriedade) => {
      if (filtros.status === "ativas" && propriedade.status !== "published") {
        return false;
      }
      if (filtros.status === "inativas" && propriedade.status === "published") {
        return false;
      }
      if (filtros.publicacao === "publicadas" && !propriedade.is_public) {
        return false;
      }
      if (filtros.publicacao === "rascunho" && propriedade.status !== "draft") {
        return false;
      }
      if (
        filtros.publicacao === "nao_publicadas" &&
        (propriedade.is_public || propriedade.status === "draft")
      ) {
        return false;
      }
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
      if (filtros.ordem === "cidade") {
        return a.enderecoFormatado.cidade.localeCompare(
          b.enderecoFormatado.cidade,
          "pt-BR",
        );
      }
      if (filtros.ordem === "atualizacao") {
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }

      const criadaA = new Date(a.created_at).getTime();
      const criadaB = new Date(b.created_at).getTime();
      return filtros.ordem === "antigas" ? criadaA - criadaB : criadaB - criadaA;
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
