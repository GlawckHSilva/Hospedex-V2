import {
  Building2,
  Eye,
  MapPin,
  PauseCircle,
  Pencil,
  PlayCircle,
  Plus,
  Settings2,
  Trash2,
} from "lucide-react";

import { Badge, Button } from "@hospedex/ui";

import {
  EntityCard,
  EntityCardActions,
  EntityCardHeader,
} from "../management/entity-card";
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
 * Card compacto de casa.
 *
 * A listagem exibe apenas dados essenciais. Acoes secundarias ficam dentro da
 * modal de visualizacao para evitar cards gigantes e excesso de botoes.
 */
export type PropertyCardProps = {
  comodidadesDisponiveis: PropriedadeComRelacionamentos["comodidades"];
  multiUnidadesAtivo: boolean;
  podeGerenciar: boolean;
  propriedade: PropriedadeComRelacionamentos;
  propriedades: PropriedadeComRelacionamentos[];
};

export function PropertyCard({
  comodidadesDisponiveis,
  multiUnidadesAtivo,
  podeGerenciar,
  propriedade,
  propriedades,
}: PropertyCardProps) {
  const estaPausada = propriedade.status === "paused";
  const cidadeEstado = `${propriedade.enderecoFormatado.cidade} - ${propriedade.enderecoFormatado.estado}`;

  const media = propriedade.imagemCapa?.url ? (
    <img
      alt={propriedade.imagemCapa.alt ?? `Imagem de ${propriedade.name}`}
      className="h-40 w-full object-cover"
      src={propriedade.imagemCapa.url}
    />
  ) : (
    <div className="flex h-36 items-center justify-center bg-primary/15 text-primary">
      <Building2 className="h-10 w-10" />
    </div>
  );

  return (
    <EntityCard media={media}>
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
              label="Unidades"
              valor={String(propriedade.unidades.length)}
            />
          </div>

          {propriedade.description ? (
            <p className="mt-4 rounded-lg border bg-background/55 p-3 text-sm leading-6 text-muted-foreground">
              {propriedade.description}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant={multiUnidadesAtivo ? "info" : "warning"}>
              {multiUnidadesAtivo ? "Multiunidades ativo" : "Unidade unica"}
            </Badge>
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

            {multiUnidadesAtivo ? (
              <EntityModal
                description="Crie uma unidade vinculada a esta casa."
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
              tipo="propriedade"
            />
          </div>

          {multiUnidadesAtivo ? (
            <section className="mt-5 space-y-3">
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
        </EntityViewModal>

        <EntityModal
          description="Atualize dados principais, endereco e status publico da casa."
          disabled={!podeGerenciar}
          eyebrow="Edicao"
          title="Editar casa"
          triggerClassName="h-9 justify-center"
          triggerIcon={<Pencil className="h-4 w-4" />}
          triggerLabel="Editar"
        >
          <div className="space-y-5">
            <PropertyForm
              modo="editar"
              multiUnidadesAtivo={multiUnidadesAtivo}
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
        <Button disabled={!podeGerenciar} type="submit" variant="outline">
          {estaPausada ? <PlayCircle /> : <PauseCircle />}
          {estaPausada ? "Ativar" : "Pausar"}
        </Button>
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
        <Button disabled={!podeGerenciar} type="submit" variant="destructive">
          Excluir casa
        </Button>
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
