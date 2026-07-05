"use client";

import { Copy, Eye, Printer } from "lucide-react";
import { useState } from "react";

import { GlassButton } from "@hospedex/ui";

export function VoucherActions({
  disponivel,
  texto
}: {
  disponivel: boolean;
  texto: string;
}) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    if (!disponivel) return;

    await navigator.clipboard.writeText(texto);
    setCopiado(true);
    window.setTimeout(() => setCopiado(false), 1800);
  }

  function verVoucher() {
    document.getElementById("voucher-hospedagem")?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  function imprimir() {
    if (!disponivel) return;

    // A classe limita o CSS de impressao ao voucher, evitando imprimir navbar,
    // botoes e fundos escuros da area do hospede.
    document.body.classList.add("printing-voucher");
    window.setTimeout(() => window.print(), 50);

    const limparClasse = () => {
      document.body.classList.remove("printing-voucher");
      window.removeEventListener("afterprint", limparClasse);
    };

    window.addEventListener("afterprint", limparClasse);
    window.setTimeout(limparClasse, 1200);
  }

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <GlassButton disabled={!disponivel} onClick={verVoucher} size="sm" variant="secondary">
        <Eye className="h-4 w-4" />
        Ver voucher
      </GlassButton>
      <GlassButton disabled={!disponivel} onClick={copiar} size="sm" variant="secondary">
        <Copy className="h-4 w-4" />
        {copiado ? "Copiado" : "Copiar resumo"}
      </GlassButton>
      <GlassButton disabled={!disponivel} onClick={imprimir} size="sm" variant="secondary">
        <Printer className="h-4 w-4" />
        Imprimir
      </GlassButton>
    </div>
  );
}
