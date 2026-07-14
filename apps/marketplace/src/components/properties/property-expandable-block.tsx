"use client";

import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

import { Button, cn } from "@hospedex/ui";

/**
 * Bloco compacto reutilizavel da pagina publica da casa.
 *
 * Mantem informacoes secundarias recolhidas no primeiro carregamento para
 * reduzir altura da pagina sem esconder dados importantes do hospede.
 */
export function PropertyExpandableBlock({
  children,
  className,
  defaultOpen = false,
  preview
}: {
  children: ReactNode;
  className?: string;
  defaultOpen?: boolean;
  preview: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn("grid gap-4", className)}>
      {preview}
      {open ? <div className="grid gap-4">{children}</div> : null}
      <Button
        className="w-fit"
        onClick={() => setOpen((value) => !value)}
        type="button"
        variant="outline"
      >
        {open ? "Ver menos" : "Ver mais"}
        <ChevronDown
          className={cn("h-4 w-4 text-primary transition dark:text-cyan-100", open && "rotate-180")}
        />
      </Button>
    </div>
  );
}
