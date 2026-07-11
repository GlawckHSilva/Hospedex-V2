"use client";

import { Check, Copy, Share2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@hospedex/ui";

export function ShareButton() {
  const [copiado, setCopiado] = useState(false);

  async function compartilhar() {
    if (navigator.share) {
      await navigator.share({
        title: document.title,
        url: window.location.href
      });
      return;
    }

    await copiarLink();
  }

  async function copiarLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopiado(true);
    window.setTimeout(() => setCopiado(false), 1800);
  }

  return (
    <div className="grid min-w-0 grid-cols-2 gap-2 sm:flex sm:flex-none sm:gap-3">
      <Button
        className="min-w-0 px-2 text-xs sm:flex-none sm:px-4 sm:text-sm"
        onClick={compartilhar}
        variant="outline"
      >
        <Share2 className="h-4 w-4" />
        Compartilhar
      </Button>
      <Button
        className="min-w-0 px-2 text-xs sm:flex-none sm:px-4 sm:text-sm"
        onClick={copiarLink}
        variant="outline"
      >
        {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copiado ? "Copiado" : "Copiar"}
      </Button>
    </div>
  );
}
