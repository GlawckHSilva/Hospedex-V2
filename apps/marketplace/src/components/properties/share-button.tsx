"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@hospedex/ui";

export function ShareButton() {
  const [copiado, setCopiado] = useState(false);

  async function copiarLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopiado(true);
    window.setTimeout(() => setCopiado(false), 1800);
  }

  return (
    <Button onClick={copiarLink} variant="outline">
      {copiado ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
      {copiado ? "Copiado" : "Compartilhar"}
    </Button>
  );
}
