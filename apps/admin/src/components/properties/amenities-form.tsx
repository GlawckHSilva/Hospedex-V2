import type { AmenityRow } from "@hospedex/types";

import { Button } from "@hospedex/ui";

import { atualizarComodidadesPropriedadeAction } from "../../lib/properties/amenities-actions";

/**
 * Formulário de comodidades da propriedade.
 *
 * Usa comodidades globais reutilizáveis e grava somente o vínculo do tenant com
 * a propriedade, preservando isolamento multi-tenant.
 */

export type AmenitiesFormProps = {
  comodidades: AmenityRow[];
  comodidadesSelecionadas: AmenityRow[];
  podeGerenciar: boolean;
  propriedadeId: string;
};

export function AmenitiesForm({
  comodidades,
  comodidadesSelecionadas,
  podeGerenciar,
  propriedadeId
}: AmenitiesFormProps) {
  const selecionadas = new Set(comodidadesSelecionadas.map((comodidade) => comodidade.id));

  return (
    <form action={atualizarComodidadesPropriedadeAction} className="space-y-4">
      <input name="propriedadeId" type="hidden" value={propriedadeId} />

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {comodidades.map((comodidade) => (
          <label
            className="flex items-center gap-2 rounded-lg border bg-background/45 px-3 py-2 text-sm"
            key={comodidade.id}
          >
            <input
              defaultChecked={selecionadas.has(comodidade.id)}
              disabled={!podeGerenciar}
              name="comodidadeIds"
              type="checkbox"
              value={comodidade.id}
            />
            {comodidade.name}
          </label>
        ))}
      </div>

      <div className="flex justify-end">
        <Button disabled={!podeGerenciar} size="sm" type="submit" variant="outline">
          Salvar comodidades
        </Button>
      </div>
    </form>
  );
}
