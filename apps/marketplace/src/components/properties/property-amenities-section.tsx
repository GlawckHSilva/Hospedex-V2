"use client";

import { CheckCircle2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@hospedex/ui";

import type { PropriedadePublica } from "../../lib/marketplace/data";

type PropertyAmenitiesSectionProps = {
  amenities: PropriedadePublica["amenities"];
};

const LIMITE_INICIAL = 8;

/**
 * Comodidades públicas em lista compacta.
 *
 * Mantém a leitura parecida com marketplaces consolidados, sem criar cards
 * desnecessários para cada item e sem alongar demais a página no mobile.
 */
export function PropertyAmenitiesSection({
  amenities,
}: PropertyAmenitiesSectionProps) {
  const [expandido, setExpandido] = useState(false);
  const comodidadesVisiveis = expandido
    ? amenities
    : amenities.slice(0, LIMITE_INICIAL);

  if (!amenities.length) {
    return null;
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
        {comodidadesVisiveis.map((comodidade) => (
          <span
            className="inline-flex min-w-0 items-center gap-3 text-sm font-medium text-foreground sm:text-base"
            key={comodidade.id}
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
            <span className="break-words">{comodidade.name}</span>
          </span>
        ))}
      </div>

      {amenities.length > LIMITE_INICIAL ? (
        <Button
          className="h-9 w-fit"
          onClick={() => setExpandido((valor) => !valor)}
          type="button"
          variant="outline"
        >
          {expandido ? "Ver menos" : `Ver mais (${amenities.length})`}
        </Button>
      ) : null}
    </div>
  );
}
