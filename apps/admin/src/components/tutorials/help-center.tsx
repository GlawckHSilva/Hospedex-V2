"use client";

import { ArrowRight, PlayCircle, RotateCcw, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@hospedex/ui";

import { reiniciarBoasVindasAction } from "../../lib/tutorials/actions";
import type { TutorialTourKey } from "../../lib/tutorials/tour-registry";
import type { TutorialResumoGerenciamento } from "../../lib/tutorials/types";

export function HelpCenter({ resumo }: { resumo: TutorialResumoGerenciamento | null }) {
  const [busca, setBusca] = useState("");
  const tours = resumo?.tours ?? [];
  const filtrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    if (!termo) return tours;
    return tours.filter((tour) =>
      `${tour.title} ${tour.description}`.toLocaleLowerCase("pt-BR").includes(termo)
    );
  }, [busca, tours]);

  return (
    <section className="space-y-5">
      <div className="admin-glass-panel p-5" data-tour-id="ajuda-contextual">
        <Badge variant="info">Ajuda</Badge>
        <h1 className="mt-3 text-2xl font-semibold">Ajuda e tutoriais</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Encontre guias rápidos para casas, reservas, pagamentos e operação diária.
        </p>
        <label className="mt-4 block max-w-xl">
          <span className="sr-only">Buscar tutorial</span>
          <span className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
            <input
              className="h-11 w-full rounded-xl border bg-background/65 pl-10 pr-3 text-sm outline-none transition focus:border-primary"
              onChange={(evento) => setBusca(evento.target.value)}
              placeholder="Buscar por cadastrar casa, aprovar reserva, pagamento..."
              value={busca}
            />
          </span>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {filtrados.map((tour) => (
          <div className="admin-glass-card p-4" key={tour.key}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <Badge variant={tour.status === "completed" ? "success" : tour.status === "in_progress" ? "info" : "secondary"}>
                  {labelStatus(tour.status)}
                </Badge>
                <p className="mt-3 font-semibold">{tour.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{tour.description}</p>
                <p className="mt-2 text-xs text-muted-foreground">Duração aproximada: {tour.duration}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-primary" />
            </div>
            <button
              className="mt-4 inline-flex items-center rounded-lg border px-3 py-2 text-sm font-semibold text-primary"
              onClick={() => iniciarTour(tour.key as TutorialTourKey)}
              type="button"
            >
              <PlayCircle className="mr-2 h-4 w-4" />
              {tour.status === "completed" ? "Ver novamente" : "Iniciar"}
            </button>
          </div>
        ))}
      </div>

      <form action={reiniciarBoasVindasAction} className="admin-glass-card p-4">
        <p className="font-semibold">Rever boas-vindas</p>
        <p className="mt-1 text-sm text-muted-foreground">Reabre o modal inicial sem alterar dados operacionais.</p>
        <button className="mt-3 inline-flex items-center rounded-lg border px-3 py-2 text-sm font-semibold text-primary" type="submit">
          <RotateCcw className="mr-2 h-4 w-4" />
          Reabrir tutorial inicial
        </button>
      </form>
    </section>
  );
}

function iniciarTour(tourKey: TutorialTourKey) {
  window.dispatchEvent(new CustomEvent("hospedex:start-tour", { detail: { tourKey } }));
}

function labelStatus(status: string) {
  if (status === "completed") return "Concluído";
  if (status === "in_progress") return "Em andamento";
  if (status === "dismissed") return "Pulado";
  return "Não iniciado";
}
