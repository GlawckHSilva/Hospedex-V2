"use client";

import {
  Bath,
  BedDouble,
  Building2,
  CalendarDays,
  CircleDollarSign,
  Copy,
  ExternalLink,
  MapPin,
  MoreHorizontal,
  PauseCircle,
  Pencil,
  PlayCircle,
  Settings2,
  Trash2,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

import { Badge, cn } from "@hospedex/ui";

import { ActionButton } from "../management/action-button";
import { EntityCard, EntityCardHeader } from "../management/entity-card";
import {
  ConfirmDialog,
  EntityModal,
  EntityViewModal,
} from "../management/entity-modal";
import {
  FormActionButton,
  FormSubmitButton,
} from "../management/form-submit-button";
import {
  alternarStatusPropriedadeAction,
  excluirPropriedadeAction,
} from "../../lib/properties/actions";
import type { PropriedadeComRelacionamentos } from "../../lib/properties/types";
import { AmenitiesForm } from "./amenities-form";
import { MediaGallery } from "./media-gallery";
import { PropertyForm } from "./property-form";
import { PropertyRulesPanel } from "./property-rules-panel";

/**
 * Card compacto de casa.
 *
 * A listagem prioriza leitura operacional: publicacao, valores, capacidade e
 * acao principal ficam visiveis. Acoes destrutivas continuam protegidas por
 * confirmacao para preservar dados do tenant.
 */
export type PropertyCardProps = {
  comodidadesDisponiveis: PropriedadeComRelacionamentos["comodidades"];
  podeGerenciar: boolean;
  propriedade: PropriedadeComRelacionamentos;
};

const MARKETPLACE_URL =
  process.env.NEXT_PUBLIC_MARKETPLACE_URL ??
  "https://hospedex-marketplace.vercel.app";

export function PropertyCard({
  comodidadesDisponiveis,
  podeGerenciar,
  propriedade,
}: PropertyCardProps) {
  const estaPausada = propriedade.status === "paused";
  const cidadeEstado = formatarCidadeEstado(propriedade);
  const paginaPublicaHref = `${MARKETPLACE_URL}/propriedades/${propriedade.slug}`;
  const atualizacao = formatarAtualizacao(propriedade.updated_at);
  const resumo =
    propriedade.short_description ??
    propriedade.headline ??
    propriedade.description ??
    "Sem descricao curta cadastrada.";

  const media = propriedade.imagemCapa?.url ? (
    <img
      alt={propriedade.imagemCapa.alt ?? `Imagem de ${propriedade.name}`}
      className="h-40 w-full object-cover sm:h-44"
      decoding="async"
      loading="lazy"
      src={propriedade.imagemCapa.url}
    />
  ) : (
    <div className="flex h-40 items-center justify-center bg-primary/15 text-primary sm:h-44">
      <Building2 className="h-10 w-10" />
    </div>
  );

  return (
    <EntityCard
      className={cn("flex flex-col border-l-2", obterClasseStatus(propriedade))}
      contentClassName="!h-auto min-h-0 flex-1"
      media={media}
    >
      <EntityCardHeader
        badges={
          <>
            <Badge variant={obterVariantStatusPropriedade(propriedade.status)}>
              {obterLabelStatusPropriedade(propriedade.status)}
            </Badge>
            <Badge variant={obterVariantPublicacao(propriedade)}>
              {obterLabelPublicacao(propriedade)}
            </Badge>
            <Badge variant="outline">
              {obterLabelTipo(propriedade.property_type)}
            </Badge>
          </>
        }
        icon={<MapPin />}
        subtitle={cidadeEstado}
        title={propriedade.name}
      />

      <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
        {resumo}
      </p>

      <section className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <MetricaCard
          icon={<CircleDollarSign />}
          label="Diaria"
          valor={formatarMoeda(propriedade.valores.valorDiaria)}
        />
        <MetricaCard
          icon={<Users />}
          label="Hospedes"
          valor={`${propriedade.estrutura.hospedesMaximos}`}
        />
        <MetricaCard
          icon={<BedDouble />}
          label="Quartos"
          valor={`${propriedade.estrutura.quartos}`}
        />
        <MetricaCard
          icon={<Bath />}
          label="Banheiros"
          valor={`${propriedade.estrutura.banheiros}`}
        />
      </section>

      <section className="grid gap-2 rounded-xl border border-cyan-400/10 bg-background/35 p-3 sm:grid-cols-2">
        <InfoRodape
          icon={<CalendarDays />}
          label="Atualizada"
          valor={atualizacao}
        />
        <InfoRodape
          icon={<CalendarDays />}
          label="Proxima reserva"
          valor="Sem reserva futura"
        />
      </section>

      <footer className="mt-auto grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <a
          className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-cyan-400/35 bg-cyan-500/8 px-3.5 py-2 text-sm font-semibold text-cyan-700 shadow-sm transition hover:border-cyan-300/60 hover:bg-cyan-500/15 dark:text-cyan-200 [&_svg]:h-4 [&_svg]:w-4"
          href={paginaPublicaHref}
          rel="noreferrer"
          target="_blank"
        >
          Ver pagina
          <ExternalLink />
        </a>

        <EntityModal
          description="Atualize as informacoes da casa usadas no painel e na pagina publica."
          disabled={!podeGerenciar}
          eyebrow="EDICAO"
          size="full"
          title="Editar casa"
          triggerAction="edit"
          triggerClassName="h-9 justify-center"
          triggerIcon={<Pencil className="h-4 w-4" />}
          triggerLabel="Editar"
        >
          <PropertyForm
            comodidadesDisponiveis={comodidadesDisponiveis}
            modo="editar"
            podeGerenciar={podeGerenciar}
            propriedade={propriedade}
          />
        </EntityModal>

        <MenuMaisAcoesCasa
          comodidadesDisponiveis={comodidadesDisponiveis}
          estaPausada={estaPausada}
          paginaPublicaHref={paginaPublicaHref}
          podeGerenciar={podeGerenciar}
          propriedade={propriedade}
          propriedadeId={propriedade.id}
        />
      </footer>
    </EntityCard>
  );
}

function DetalhesCasa({
  comodidadesDisponiveis,
  estaPausada,
  podeGerenciar,
  propriedade,
  triggerClassName,
}: {
  comodidadesDisponiveis: PropriedadeComRelacionamentos["comodidades"];
  estaPausada: boolean;
  podeGerenciar: boolean;
  propriedade: PropriedadeComRelacionamentos;
  triggerClassName?: string;
}) {
  return (
    <EntityViewModal
      description="Resumo operacional da casa selecionada."
      title={`Detalhes de ${propriedade.name}`}
      triggerAction="view"
      triggerClassName={triggerClassName}
      triggerIcon={<Building2 className="h-4 w-4" />}
      triggerLabel="Ver detalhes"
    >
      <div className="grid gap-3 text-sm md:grid-cols-2">
        <InfoModal label="Tipo" valor={obterLabelTipo(propriedade.property_type)} />
        <InfoModal
          label="Status"
          valor={obterLabelStatusPropriedade(propriedade.status)}
        />
        <InfoModal label="Publicacao" valor={obterLabelPublicacao(propriedade)} />
        <InfoModal label="Cidade" valor={propriedade.enderecoFormatado.cidade} />
        <InfoModal label="Estado" valor={propriedade.enderecoFormatado.estado} />
        <InfoModal label="Endereco" valor={propriedade.enderecoFormatado.linha1} />
        <InfoModal
          label="Diaria"
          valor={formatarMoeda(propriedade.valores.valorDiaria)}
        />
        <InfoModal
          label="Capacidade"
          valor={`${propriedade.estrutura.hospedesMaximos} hospede(s)`}
        />
      </div>

      {propriedade.description ? (
        <p className="mt-4 rounded-lg border bg-background/55 p-3 text-sm leading-6 text-muted-foreground">
          {propriedade.description}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {propriedade.comodidades.length > 0 ? (
          propriedade.comodidades.map((comodidade) => (
            <Badge key={comodidade.id} variant="outline">
              {comodidade.name}
            </Badge>
          ))
        ) : (
          <Badge variant="outline">Sem comodidades cadastradas</Badge>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <AcaoStatusCasa
          estaPausada={estaPausada}
          podeGerenciar={podeGerenciar}
          propriedadeId={propriedade.id}
        />

        <EntityModal
          description="Defina os itens exibidos como comodidades da casa."
          disabled={!podeGerenciar}
          eyebrow="Comodidades"
          title="Comodidades da casa"
          triggerIcon={<Settings2 className="h-4 w-4" />}
          triggerLabel="Comodidades"
        >
          <AmenitiesForm
            comodidades={comodidadesDisponiveis}
            comodidadesSelecionadas={propriedade.comodidades}
            podeGerenciar={podeGerenciar}
            propriedadeId={propriedade.id}
          />
        </EntityModal>

        <EntityModal
          description="Ajuste regras da casa, reserva e cancelamento."
          disabled={!podeGerenciar}
          eyebrow="Politicas"
          size="xl"
          title="Politicas e regras"
          triggerIcon={<Settings2 className="h-4 w-4" />}
          triggerLabel="Politicas"
        >
          <PropertyRulesPanel
            podeGerenciar={podeGerenciar}
            propriedade={propriedade}
          />
        </EntityModal>
      </div>

      <div className="mt-5">
        <MediaGallery
          imagens={propriedade.imagens}
          podeGerenciar={podeGerenciar}
          propriedadeId={propriedade.id}
          retorno="/propriedades"
        />
      </div>
    </EntityViewModal>
  );
}

function MenuMaisAcoesCasa({
  comodidadesDisponiveis,
  estaPausada,
  paginaPublicaHref,
  podeGerenciar,
  propriedade,
  propriedadeId,
}: {
  comodidadesDisponiveis: PropriedadeComRelacionamentos["comodidades"];
  estaPausada: boolean;
  paginaPublicaHref: string;
  podeGerenciar: boolean;
  propriedade: PropriedadeComRelacionamentos;
  propriedadeId: string;
}) {
  return (
    <EntityModal
      description="Acoes secundarias da casa selecionada."
      eyebrow="ACOES"
      size="sm"
      title="Mais acoes"
      triggerAction="settings"
      triggerClassName="h-9 w-full px-0 sm:w-9"
      triggerIcon={<MoreHorizontal className="h-4 w-4" />}
      triggerLabel="Mais acoes"
      triggerSize="icon"
    >
      <div className="grid gap-3">
        <DetalhesCasa
          comodidadesDisponiveis={comodidadesDisponiveis}
          estaPausada={estaPausada}
          podeGerenciar={podeGerenciar}
          propriedade={propriedade}
          triggerClassName="w-full justify-center"
        />

        <ActionButton
          className="w-full justify-center"
          icon={<Copy />}
          onClick={() => copiarLinkPublico(paginaPublicaHref)}
          variant="view"
        >
          Copiar link
        </ActionButton>

        <AcaoStatusCasa
          estaPausada={estaPausada}
          podeGerenciar={podeGerenciar}
          propriedadeId={propriedadeId}
          triggerClassName="w-full justify-center"
        />

        <AcaoExcluirCasa
          podeGerenciar={podeGerenciar}
          propriedadeId={propriedadeId}
          triggerClassName="w-full justify-center"
        />
      </div>
    </EntityModal>
  );
}

function MetricaCard({
  icon,
  label,
  valor,
}: {
  icon: ReactNode;
  label: string;
  valor: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-cyan-400/10 bg-background/35 p-3">
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="text-cyan-300 [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
        {label}
      </span>
      <strong className="mt-1 block truncate text-sm font-semibold text-foreground">
        {valor}
      </strong>
    </div>
  );
}

function InfoRodape({
  icon,
  label,
  valor,
}: {
  icon: ReactNode;
  label: string;
  valor: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2 text-xs">
      <span className="mt-0.5 text-cyan-300 [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
      <span className="min-w-0">
        <span className="block uppercase tracking-normal text-muted-foreground">
          {label}
        </span>
        <span className="block truncate text-sm font-medium text-foreground">
          {valor}
        </span>
      </span>
    </div>
  );
}

function AcaoStatusCasa({
  estaPausada,
  podeGerenciar,
  propriedadeId,
  triggerClassName,
}: {
  estaPausada: boolean;
  podeGerenciar: boolean;
  propriedadeId: string;
  triggerClassName?: string;
}) {
  return (
    <ConfirmDialog
      description="Esta acao altera a disponibilidade operacional da casa."
      disabled={!podeGerenciar}
      title={estaPausada ? "Ativar casa" : "Pausar casa"}
      triggerClassName={triggerClassName}
      triggerIcon={
        estaPausada ? (
          <PlayCircle className="h-4 w-4" />
        ) : (
          <PauseCircle className="h-4 w-4" />
        )
      }
      triggerLabel={estaPausada ? "Ativar" : "Pausar"}
      triggerVariant="outline"
    >
      <form action={alternarStatusPropriedadeAction} className="grid gap-3">
        <input name="propriedadeId" type="hidden" value={propriedadeId} />
        <p className="text-sm text-muted-foreground">
          Confirme para {estaPausada ? "ativar" : "pausar"} esta casa.
        </p>
        <FormSubmitButton
          disabled={!podeGerenciar}
          pendingLabel="Atualizando..."
          variant="outline"
        >
          {estaPausada ? <PlayCircle /> : <PauseCircle />}
          {estaPausada ? "Ativar" : "Pausar"}
        </FormSubmitButton>
      </form>
    </ConfirmDialog>
  );
}

function AcaoExcluirCasa({
  podeGerenciar,
  propriedadeId,
  triggerClassName,
}: {
  podeGerenciar: boolean;
  propriedadeId: string;
  triggerClassName?: string;
}) {
  return (
    <ConfirmDialog
      description="Esta acao remove a casa da operacao do tenant."
      disabled={!podeGerenciar}
      title="Excluir casa"
      triggerAction="delete"
      triggerClassName={triggerClassName}
      triggerIcon={<Trash2 className="h-4 w-4" />}
      triggerLabel="Excluir"
    >
      <form action={excluirPropriedadeAction} className="grid gap-3">
        <input name="propriedadeId" type="hidden" value={propriedadeId} />
        <label className="flex items-start gap-2 text-sm text-muted-foreground">
          <input
            className="mt-1"
            disabled={!podeGerenciar}
            name="confirmarExclusao"
            required
            type="checkbox"
            value="confirmado"
          />
          Confirmo que desejo remover esta propriedade da operacao do tenant.
        </label>
        <FormActionButton
          disabled={!podeGerenciar}
          pendingLabel="Excluindo..."
          variant="delete"
        >
          Excluir casa
        </FormActionButton>
      </form>
    </ConfirmDialog>
  );
}

function InfoModal({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-lg border bg-background/55 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 break-words font-medium">{valor || "Nao informado"}</p>
    </div>
  );
}

function copiarLinkPublico(url: string) {
  void navigator.clipboard.writeText(url).catch(() => {
    window.prompt("Copie o link publico da casa:", url);
  });
}

function formatarCidadeEstado(propriedade: PropriedadeComRelacionamentos) {
  const cidade = propriedade.enderecoFormatado.cidade || "Cidade nao informada";
  const estado = propriedade.enderecoFormatado.estado || "UF";
  return `${cidade} - ${estado}`;
}

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(valor);
}

function formatarAtualizacao(valor: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(valor));
}

function obterLabelStatusPropriedade(
  status: PropriedadeComRelacionamentos["status"],
): string {
  if (status === "published") return "Ativa";
  if (status === "paused" || status === "archived") return "Inativa";
  return "Rascunho";
}

function obterVariantStatusPropriedade(
  status: PropriedadeComRelacionamentos["status"],
) {
  if (status === "published") return "success";
  if (status === "paused" || status === "archived") return "warning";
  return "secondary";
}

function obterLabelPublicacao(propriedade: PropriedadeComRelacionamentos): string {
  if (propriedade.is_public) return "Publicada";
  if (propriedade.status === "draft") return "Rascunho";
  return "Nao publicada";
}

function obterVariantPublicacao(propriedade: PropriedadeComRelacionamentos) {
  if (propriedade.is_public) return "info";
  if (propriedade.status === "draft") return "secondary";
  return "outline";
}

function obterLabelTipo(
  tipo: PropriedadeComRelacionamentos["property_type"],
): string {
  if (tipo === "inn") return "Pousada";
  if (tipo === "small_hotel") return "Pequeno hotel";
  return "Casa de temporada";
}

function obterClasseStatus(propriedade: PropriedadeComRelacionamentos) {
  if (propriedade.status === "published") return "border-l-emerald-400/80";
  if (propriedade.status === "paused" || propriedade.status === "archived") {
    return "border-l-amber-400/80";
  }
  return "border-l-slate-500/70";
}
