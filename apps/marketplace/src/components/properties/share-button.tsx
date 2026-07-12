"use client";

import { Check, Copy, Share2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@hospedex/ui";

export type ShareButtonProps = {
  compact?: boolean;
  iconOnly?: boolean;
};

export function ShareButton({ compact = false, iconOnly = false }: ShareButtonProps) {
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

  if (iconOnly) {
    return (
      <Button
        aria-label="Compartilhar hospedagem"
        className="h-10 w-10 rounded-full border-transparent bg-transparent p-0 text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.75)] hover:bg-transparent hover:text-cyan-100"
        onClick={compartilhar}
        variant="ghost"
      >
        <Share2 className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <div className="grid min-w-0 grid-cols-2 gap-2 sm:flex sm:flex-none">
      <Button
        className={
          compact
            ? "h-9 min-w-0 rounded-xl px-2 text-[11px] sm:h-10 sm:flex-none sm:px-3 sm:text-xs"
            : "min-w-0 px-2 text-xs sm:flex-none sm:px-4 sm:text-sm"
        }
        onClick={compartilhar}
        variant="outline"
      >
        <Share2 className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        Compartilhar
      </Button>
      <Button
        className={
          compact
            ? "h-9 min-w-0 rounded-xl px-2 text-[11px] sm:h-10 sm:flex-none sm:px-3 sm:text-xs"
            : "min-w-0 px-2 text-xs sm:flex-none sm:px-4 sm:text-sm"
        }
        onClick={copiarLink}
        variant="outline"
      >
        {copiado ? (
          <Check className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        ) : (
          <Copy className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        )}
        {copiado ? "Copiado" : "Copiar"}
      </Button>
    </div>
  );
}
