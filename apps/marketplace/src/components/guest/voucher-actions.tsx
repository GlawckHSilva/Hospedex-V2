"use client";

import { Copy, Eye, Printer } from "lucide-react";
import { useState } from "react";

import { GlassButton } from "@hospedex/ui";

export function VoucherActions({
  disponivel,
  mostrarVerComprovante = true,
  onImprimir,
  onVerComprovante,
  texto
}: {
  disponivel: boolean;
  mostrarVerComprovante?: boolean;
  onImprimir: () => void;
  onVerComprovante: () => void;
  texto: string;
}) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    await navigator.clipboard.writeText(texto);
    setCopiado(true);
    window.setTimeout(() => setCopiado(false), 1800);
  }

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      {mostrarVerComprovante ? (
        <GlassButton disabled={!disponivel} onClick={onVerComprovante} size="sm" variant="secondary">
          <Eye className="h-4 w-4" />
          Ver comprovante
        </GlassButton>
      ) : null}
      <GlassButton onClick={copiar} size="sm" variant="secondary">
        <Copy className="h-4 w-4" />
        {copiado ? "Copiado" : "Copiar resumo"}
      </GlassButton>
      <GlassButton disabled={!disponivel} onClick={onImprimir} size="sm" variant="secondary">
        <Printer className="h-4 w-4" />
        Imprimir
      </GlassButton>
    </div>
  );
}
