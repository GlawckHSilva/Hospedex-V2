"use client";

import { Copy, Printer } from "lucide-react";
import { useState } from "react";

import { GlassButton } from "@hospedex/ui";

export function VoucherActions({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    await navigator.clipboard.writeText(texto);
    setCopiado(true);
    window.setTimeout(() => setCopiado(false), 1800);
  }

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <GlassButton onClick={copiar} size="sm" variant="secondary">
        <Copy className="h-4 w-4" />
        {copiado ? "Copiado" : "Copiar"}
      </GlassButton>
      <GlassButton onClick={() => window.print()} size="sm" variant="secondary">
        <Printer className="h-4 w-4" />
        Imprimir
      </GlassButton>
    </div>
  );
}
