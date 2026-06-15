import { Building2, MapPin, PauseCircle, PlayCircle, Plus } from "lucide-react";

import { Badge, Button, Card, CardContent } from "@hospedex/ui";

import { alternarStatusPropriedadeAction } from "../../lib/properties/actions";
import type { PropriedadeComRelacionamentos } from "../../lib/properties/types";
import { AmenitiesForm } from "./amenities-form";
import { MediaGallery } from "./media-gallery";
import { PropertyForm } from "./property-form";
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
  multiUnidadesAtivo
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
              <Badge variant={obterVariantStatusPropriedade(propriedade.status)}>
                {obterLabelStatusPropriedade(propriedade.status)}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {obterLabelTipo(propriedade.property_type)}
            </p>
          </div>

          <form action={alternarStatusPropriedadeAction}>
            <input name="propriedadeId" type="hidden" value={propriedade.id} />
            <Button disabled={!podeGerenciar} size="sm" type="submit" variant="outline">
              {estaPausada ? <PlayCircle /> : <PauseCircle />}
              {estaPausada ? "Ativar" : "Pausar"}
            </Button>
          </form>
        </div>

        <div className="grid gap-3 text-sm md:grid-cols-[1fr_auto]">
          <p className="flex items-start gap-2 text-muted-foreground">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {propriedade.enderecoFormatado.linha1}, {propriedade.enderecoFormatado.cidade} -{" "}
              {propriedade.enderecoFormatado.estado}
            </span>
          </p>
          <Badge variant={multiUnidadesAtivo ? "info" : "warning"}>
            {multiUnidadesAtivo ? "Multiunidades ativo" : "Unidade única"}
          </Badge>
        </div>

        {propriedade.description ? (
          <p className="text-sm text-muted-foreground">{propriedade.description}</p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {propriedade.comodidades.map((comodidade) => (
            <Badge key={comodidade.id} variant="outline">
              {comodidade.name}
            </Badge>
          ))}
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <details className="rounded-lg border bg-background/45 p-3">
            <summary className="cursor-pointer text-sm font-semibold">Editar propriedade</summary>
            <div className="mt-4">
              <PropertyForm
                modo="editar"
                podeGerenciar={podeGerenciar}
                propriedade={propriedade}
              />
            </div>
          </details>

          <details className="rounded-lg border bg-background/45 p-3">
            <summary className="cursor-pointer text-sm font-semibold">Comodidades</summary>
            <div className="mt-4">
              <AmenitiesForm
                comodidades={comodidadesDisponiveis}
                comodidadesSelecionadas={propriedade.comodidades}
                podeGerenciar={podeGerenciar}
                propriedadeId={propriedade.id}
              />
            </div>
          </details>

          <details className="rounded-lg border bg-background/45 p-3">
            <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
              <Plus className="h-4 w-4" />
              Nova unidade
            </summary>
            <div className="mt-4">
              <UnitForm
                modo="criar"
                podeGerenciar={podeGerenciar}
                propriedadeInicialId={propriedade.id}
                propriedades={propriedades}
                retorno="/propriedades"
              />
            </div>
          </details>
        </div>

        <MediaGallery
          imagens={propriedade.imagens}
          podeGerenciar={podeGerenciar}
          propriedadeId={propriedade.id}
          retorno="/propriedades"
          tipo="propriedade"
        />

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
              Nenhuma unidade cadastrada para esta propriedade.
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  );
}

function obterLabelStatusPropriedade(status: PropriedadeComRelacionamentos["status"]): string {
  if (status === "published") return "Ativa";
  if (status === "paused") return "Pausada";
  if (status === "archived") return "Arquivada";
  return "Rascunho";
}

function obterVariantStatusPropriedade(status: PropriedadeComRelacionamentos["status"]) {
  if (status === "published") return "success";
  if (status === "paused") return "warning";
  return "secondary";
}

function obterLabelTipo(tipo: PropriedadeComRelacionamentos["property_type"]): string {
  if (tipo === "inn") return "Pousada";
  if (tipo === "small_hotel") return "Pequeno hotel";
  return "Casa de temporada";
}
