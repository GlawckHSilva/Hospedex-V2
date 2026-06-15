"use client";

import { AlertCircle, RotateCcw } from "lucide-react";

import { Button } from "@hospedex/ui";

export default function PropriedadesError({ reset }: { reset: () => void }) {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 text-foreground">
      <div className="max-w-md rounded-lg border bg-card p-6 text-center shadow-sm">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-md bg-destructive/10 text-destructive">
          <AlertCircle className="h-5 w-5" />
        </span>
        <h1 className="mt-5 text-xl font-semibold">Erro ao carregar propriedades</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Tente novamente para recarregar a vitrine pública.
        </p>
        <Button className="mt-5" onClick={reset}>
          <RotateCcw className="h-4 w-4" />
          Tentar novamente
        </Button>
      </div>
    </div>
  );
}
