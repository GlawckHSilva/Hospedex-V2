"use client";

import { CheckCircle2, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@hospedex/ui";

import type { PropriedadePublica } from "../../lib/marketplace/data";

type PropertyAmenitiesSectionProps = {
  amenities: PropriedadePublica["amenities"];
};

const LIMITE_INICIAL = 8;

/**
 * Comodidades públicas agrupadas.
 *
 * Mantém a página legível em casas com muitas comodidades e permite expansão
 * sem criar uma lista gigante no primeiro carregamento.
 */
export function PropertyAmenitiesSection({ amenities }: PropertyAmenitiesSectionProps) {
  const [expandido, setExpandido] = useState(false);
  const comodidadesVisiveis = expandido ? amenities : amenities.slice(0, LIMITE_INICIAL);
  const grupos = useMemo(() => agruparComodidades(comodidadesVisiveis), [comodidadesVisiveis]);

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
      {grupos.map((grupo) => (
        <div className="grid gap-2" key={grupo.categoria}>
          <h3 className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
            {formatarCategoria(grupo.categoria)}
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {grupo.itens.map((comodidade) => (
              <span
                className="inline-flex min-w-0 items-center gap-2 rounded-xl border border-slate-700/55 bg-slate-950/54 px-2.5 py-2 text-xs font-medium text-slate-100 sm:px-3 sm:text-sm"
                key={comodidade.id}
              >
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-cyan-100" />
                <span className="truncate">{comodidade.name}</span>
              </span>
            ))}
          </div>
        </div>
      ))}

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

function agruparComodidades(comodidades: PropertyAmenitiesSectionProps["amenities"]) {
  const grupos = new Map<string, PropertyAmenitiesSectionProps["amenities"]>();

  for (const comodidade of comodidades) {
    const categoria = comodidade.category ?? "geral";
    grupos.set(categoria, [...(grupos.get(categoria) ?? []), comodidade]);
  }

  return [...grupos.entries()].map(([categoria, itens]) => ({
    categoria,
    itens
  }));
}

function formatarCategoria(categoria: string) {
  return categoria.replace(/[_-]/g, " ").replace(/\b\w/g, (letra) =>
    letra.toUpperCase()
  );
}
