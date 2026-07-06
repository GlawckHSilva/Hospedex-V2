import {
  Bath,
  BedDouble,
  Building2,
  CalendarDays,
  CircleDollarSign,
  Eye,
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

import { Badge, cn } from "@hospedex/ui";

import {
  EntityCard,
  EntityCardHeader,
} from "../management/entity-card";
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
 * A listagem exibe dados essenciais e mantem as acoes principais visiveis.
 * Acoes destrutivas ficam dentro da modal de edicao para evitar exclusao acidental.
 */
export type PropertyCardProps = {
  comodidadesDisponiveis: PropriedadeComRelacionamentos["comodidades"];
  podeGerenciar: boolean;
  propriedade: PropriedadeComRelacionamentos;
};

const MARKETPLACE_URL =
  process.env.NEXT_PUBLIC_MARKETPLACE_URL ?? "https://hospedex-marketplace.vercel.app";

export function PropertyCard({
  comodidadesDisponiveis,
  podeGerenciar,
  propriedade,
}: PropertyCardProps) {
  const estaPausada = propriedade.status === "paused";
  const cidadeEstado = `${propriedade.enderecoFormatado.cidade} - ${propriedade.enderecoFormatado.estado}`;
  const paginaPublicaHref = `${MARKETPLACE_URL}/propriedades/${propriedade.slug}`;
  const atualizacao = formatarAtualizacao(propriedade.updated_at);

  const media = propriedade.imagemCapa?.url ? (
    <img
      alt={propriedade.imagemCapa.alt ?? `Imagem de ${propriedade.name}`}
      className="h-44 w-full object-cover"
      decoding="async"
      loading="lazy"
      src={propriedade.imagemCapa.url}
    />
  ) : (
    <div className="flex h-44 items-center justify-center bg-primary/15 text-primary">
      <Building2 className="h-10 w-10" />
    </div>
  );

  return (
    <EntityCard className="flex flex-col" contentClassName="!h-auto min-h-0 flex-1" media={media}>
      <EntityCardHeader
        badges={
          <>
            <Badge variant={obterVariantStatusPropriedade(propriedade.status)}>
              {obterLabelStatusPropriedade(propriedade.status)}
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

      <EntityCardActions>
        <EntityViewModal
          description="Resumo operacional da casa selecionada."
          title={`Detalhes de ${propriedade.name}`}
          triggerAction="view"
          triggerClassName="h-9 justify-center"
          triggerIcon={<Eye className="h-4 w-4" />}
          triggerLabel="Visualizar"
        >
          <div className="grid gap-3 text-sm md:grid-cols-2">
            <InfoModal
              label="Tipo"
              valor={obterLabelTipo(propriedade.property_type)}
            />
            <InfoModal
              label="Status"
              valor={obterLabelStatusPropriedade(propriedade.status)}
            />
            <InfoModal
              label="Cidade"
              valor={propriedade.enderecoFormatado.cidade}
            />
            <InfoModal
              label="Estado"
              valor={propriedade.enderecoFormatado.estado}
            />
            <InfoModal
              label="Endereco"
              valor={propriedade.enderecoFormatado.linha1}
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
            {propriedade.comodidades.map((comodidade) => (
              <Badge key={comodidade.id} variant="outline">
                {comodidade.name}
              </Badge>
            ))}
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

        <EntityModal
          description="Atualize as informações da casa usadas no painel e na página pública."
          disabled={!podeGerenciar}
          eyebrow="EDIÇÃO"
          size="full"
          title="Editar casa"
          triggerAction="edit"
          triggerClassName="h-9 justify-center"
          triggerIcon={<Pencil className="h-4 w-4" />}
          triggerLabel="Editar"
        >
          <div className="space-y-5">
            <PropertyForm
              comodidadesDisponiveis={comodidadesDisponiveis}
              modo="editar"
              podeGerenciar={podeGerenciar}
              propriedade={propriedade}
            />

            <div className="border-t pt-4">
              <AcaoExcluirCasa
                podeGerenciar={podeGerenciar}
                propriedadeId={propriedade.id}
              />
            </div>
          </div>
        </EntityModal>
      </EntityCardActions>
    </EntityCard>
  );
}

function AcaoStatusCasa({
  estaPausada,
  podeGerenciar,
  propriedadeId,
}: {
  estaPausada: boolean;
  podeGerenciar: boolean;
  propriedadeId: string;
}) {
  return (
    <ConfirmDialog
      description="Esta acao altera a disponibilidade operacional da casa."
      disabled={!podeGerenciar}
      title={estaPausada ? "Ativar casa" : "Pausar casa"}
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
}: {
  podeGerenciar: boolean;
  propriedadeId: string;
}) {
  return (
    <ConfirmDialog
      description="Esta acao remove a casa da operacao do tenant."
      disabled={!podeGerenciar}
      title="Excluir casa"
      triggerAction="delete"
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

function obterLabelStatusPropriedade(
  status: PropriedadeComRelacionamentos["status"],
): string {
  if (status === "published") return "Ativa";
  if (status === "paused") return "Pausada";
  if (status === "archived") return "Arquivada";
  return "Rascunho";
}

function obterVariantStatusPropriedade(
  status: PropriedadeComRelacionamentos["status"],
) {
  if (status === "published") return "success";
  if (status === "paused") return "warning";
  return "secondary";
}

function obterLabelTipo(
  tipo: PropriedadeComRelacionamentos["property_type"],
): string {
  if (tipo === "inn") return "Pousada";
  if (tipo === "small_hotel") return "Pequeno hotel";
  return "Casa de temporada";
}
