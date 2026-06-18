import {
  Building2,
  Eye,
  MapPin,
  Pencil,
  PauseCircle,
  PlayCircle,
  Plus,
  Settings2,
  Trash2,
} from "lucide-react";

import { Badge, Button, Card, CardContent } from "@hospedex/ui";

import {
  ConfirmDialog,
  EntityModal,
  EntityViewModal,
} from "../management/entity-modal";
import {
  alternarStatusPropriedadeAction,
  excluirPropriedadeAction,
} from "../../lib/properties/actions";
import type { PropriedadeComRelacionamentos } from "../../lib/properties/types";
import { AmenitiesForm } from "./amenities-form";
import { MediaGallery } from "./media-gallery";
import { PropertyForm } from "./property-form";
import { PropertyRulesPanel } from "./property-rules-panel";
import { UnitCard } from "./unit-card";
import { UnitForm } from "./unit-form";

/**
 * Card de propriedade com suas unidades.
 *
 * A composição mantém propriedade como agrupador principal, preparando casas
 * únicas, pousadas e pequenos hotéis sem implementar reservas nesta etapa.
 */

export type PropertyCardProps = {
  propriedade: PropriedadeComRelacionamentos;
  propriedades: PropriedadeComRelacionamentos[];
  comodidadesDisponiveis: PropriedadeComRelacionamentos["comodidades"];
  podeGerenciar: boolean;
  multiUnidadesAtivo: boolean;
};

export function PropertyCard({
  propriedade,
  propriedades,
  comodidadesDisponiveis,
  podeGerenciar,
  multiUnidadesAtivo,
}: PropertyCardProps) {
  const estaPausada = propriedade.status === "paused";

  return (
    <Card className="admin-glass-card overflow-hidden">
      {propriedade.imagemCapa?.url ? (
        <img
          alt={propriedade.imagemCapa.alt ?? `Imagem de ${propriedade.name}`}
          className="h-44 w-full object-cover"
          src={propriedade.imagemCapa.url}
        />
      ) : (
        <div className="flex h-32 items-center justify-center bg-primary/15 text-primary">
          <Building2 className="h-10 w-10" />
        </div>
      )}

      <CardContent className="space-y-5 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold">{propriedade.name}</h2>
              <Badge
                variant={obterVariantStatusPropriedade(propriedade.status)}
              >
                {obterLabelStatusPropriedade(propriedade.status)}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {obterLabelTipo(propriedade.property_type)}
            </p>
          </div>

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
            <form
              action={alternarStatusPropriedadeAction}
              className="grid gap-3"
            >
              <input
                name="propriedadeId"
                type="hidden"
                value={propriedade.id}
              />
              <p className="text-sm text-muted-foreground">
                Confirme para {estaPausada ? "ativar" : "pausar"} esta casa.
              </p>
              <Button disabled={!podeGerenciar} type="submit" variant="outline">
                {estaPausada ? <PlayCircle /> : <PauseCircle />}
                {estaPausada ? "Ativar" : "Pausar"}
              </Button>
            </form>
          </ConfirmDialog>
        </div>

        <div className="grid gap-3 text-sm md:grid-cols-[1fr_auto]">
          <p className="flex items-start gap-2 text-muted-foreground">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {propriedade.enderecoFormatado.linha1},{" "}
              {propriedade.enderecoFormatado.cidade} -{" "}
              {propriedade.enderecoFormatado.estado}
            </span>
          </p>
          <Badge variant={multiUnidadesAtivo ? "info" : "warning"}>
            {multiUnidadesAtivo ? "Multiunidades ativo" : "Unidade única"}
          </Badge>
        </div>

        {propriedade.description ? (
          <p className="text-sm text-muted-foreground">
            {propriedade.description}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {propriedade.comodidades.map((comodidade) => (
            <Badge key={comodidade.id} variant="outline">
              {comodidade.name}
            </Badge>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <EntityViewModal
            description="Resumo operacional da casa selecionada."
            title={`Detalhes de ${propriedade.name}`}
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
                label="Endereço"
                valor={propriedade.enderecoFormatado.linha1}
              />
              <InfoModal
                label="Unidades"
                valor={String(propriedade.unidades.length)}
              />
            </div>
            {propriedade.description ? (
              <p className="mt-4 rounded-lg border bg-background/55 p-3 text-sm leading-6 text-muted-foreground">
                {propriedade.description}
              </p>
            ) : null}
          </EntityViewModal>

          <EntityModal
            description="Atualize dados principais, endereço e status público da casa."
            disabled={!podeGerenciar}
            eyebrow="Edição"
            title="Editar casa"
            triggerIcon={<Pencil className="h-4 w-4" />}
            triggerLabel="Editar"
          >
            <PropertyForm
              modo="editar"
              multiUnidadesAtivo={multiUnidadesAtivo}
              podeGerenciar={podeGerenciar}
              propriedade={propriedade}
            />
          </EntityModal>

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

          {multiUnidadesAtivo ? (
            <EntityModal
              description="Crie uma unidade já vinculada a esta casa."
              disabled={!podeGerenciar}
              eyebrow="Cadastro"
              title="Nova unidade"
              triggerIcon={<Plus className="h-4 w-4" />}
              triggerLabel="Nova unidade"
            >
              <UnitForm
                modo="criar"
                podeGerenciar={podeGerenciar}
                propriedadeInicialId={propriedade.id}
                propriedades={propriedades}
                retorno="/propriedades"
              />
            </EntityModal>
          ) : null}

          <EntityModal
            description="Ajuste regras da casa, reserva e cancelamento."
            disabled={!podeGerenciar}
            eyebrow="Políticas"
            size="xl"
            title="Políticas e regras"
            triggerIcon={<Settings2 className="h-4 w-4" />}
            triggerLabel="Políticas"
          >
            <PropertyRulesPanel
              podeGerenciar={podeGerenciar}
              propriedade={propriedade}
            />
          </EntityModal>
        </div>

        <MediaGallery
          imagens={propriedade.imagens}
          podeGerenciar={podeGerenciar}
          propriedadeId={propriedade.id}
          retorno="/propriedades"
          tipo="propriedade"
        />

        <ConfirmDialog
          description="Esta ação remove a casa da operação do tenant."
          disabled={!podeGerenciar}
          title="Excluir casa"
          triggerIcon={<Trash2 className="h-4 w-4" />}
          triggerLabel="Excluir casa"
        >
          <form action={excluirPropriedadeAction} className="mt-4 grid gap-3">
            <input name="propriedadeId" type="hidden" value={propriedade.id} />
            <label className="flex items-start gap-2 text-sm text-muted-foreground">
              <input
                className="mt-1"
                disabled={!podeGerenciar}
                name="confirmarExclusao"
                required
                type="checkbox"
                value="confirmado"
              />
              Confirmo que desejo remover esta propriedade da operação do
              tenant.
            </label>
            <div>
              <Button
                disabled={!podeGerenciar}
                type="submit"
                variant="destructive"
              >
                Excluir casa
              </Button>
            </div>
          </form>
        </ConfirmDialog>

        {multiUnidadesAtivo ? (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold">Unidades</h3>
              <span className="text-sm text-muted-foreground">
                {propriedade.unidades.length} cadastrada(s)
              </span>
            </div>

            {propriedade.unidades.length > 0 ? (
              <div className="grid gap-3">
                {propriedade.unidades.map((unidade) => (
                  <UnitCard
                    key={unidade.id}
                    podeGerenciar={podeGerenciar}
                    propriedades={propriedades}
                    retorno="/propriedades"
                    unidade={unidade}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed bg-background/45 p-4 text-sm text-muted-foreground">
                Nenhuma unidade cadastrada para esta casa.
              </div>
            )}
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}

function InfoModal({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-lg border bg-background/55 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 break-words font-medium">{valor || "Não informado"}</p>
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
