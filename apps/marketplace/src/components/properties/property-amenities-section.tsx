"use client";

import { CheckCircle2, Sparkles } from "lucide-react";
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
export function PropertyAmenitiesSection({ amenities }: PropertyAmenitiesSectionProps) {
  const [expandido, setExpandido] = useState(false);
  const comodidadesVisiveis = expandido ? amenities : amenities.slice(0, LIMITE_INICIAL);

  if (!amenities.length) {
    return (
      <div className="rounded-lg border border-dashed bg-background/60 p-4 text-sm text-muted-foreground">
        <Sparkles className="mb-3 h-5 w-5 text-primary" />
        <p className="font-semibold text-foreground">Comodidades ainda não informadas.</p>
        <p className="mt-1 leading-6">
          O proprietário ainda não cadastrou comodidades públicas para esta hospedagem.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
        {comodidadesVisiveis.map((comodidade) => (
          <span
            className="inline-flex min-w-0 items-center gap-3 text-sm font-medium text-slate-100 sm:text-base"
            key={comodidade.id}
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-cyan-200" />
            <span className="truncate">{comodidade.name}</span>
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
