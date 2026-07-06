"use client";

import { useState, useTransition } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@hospedex/ui";

/**
 * Botao isolado para copiar a URL do webhook Mercado Pago.
 *
 * A URL contem apenas o tenant usado para roteamento do webhook. Segredos como
 * Access Token e Webhook Secret continuam restritos ao servidor.
 */

export function CopyWebhookUrlButton({ url }: { url: string }) {
  const [copiado, setCopiado] = useState(false);
  const [pendente, iniciarTransicao] = useTransition();

  function copiarUrl() {
    iniciarTransicao(async () => {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1800);
    });
  }

  return (
    <Button
      disabled={pendente}
      onClick={copiarUrl}
      size="sm"
      type="button"
      variant="outline"
    >
      {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copiado ? "Copiada" : "Copiar URL"}
    </Button>
  );
}
