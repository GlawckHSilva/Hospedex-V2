import { ArrowRight, RotateCcw } from "lucide-react";
import Link from "next/link";

import { Badge } from "@hospedex/ui";

import { reiniciarBoasVindasAction } from "../../lib/tutorials/actions";
import type { TutorialResumoGerenciamento } from "../../lib/tutorials/types";

export function HelpCenter({ resumo }: { resumo: TutorialResumoGerenciamento | null }) {
  return (
    <section className="space-y-5">
      <div className="admin-glass-panel p-5">
        <Badge variant="info">Ajuda</Badge>
        <h1 className="mt-3 text-2xl font-semibold">Central de ajuda</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Guias rápidos para configurar casas, reservas, pagamentos e operação diária.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {(resumo?.checklist ?? []).map((etapa) => (
          <Link className="admin-glass-card block p-4 transition hover:border-primary/40" href={etapa.href} key={etapa.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{etapa.titulo}</p>
                <p className="mt-1 text-sm text-muted-foreground">{etapa.descricao}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-primary" />
            </div>
          </Link>
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
