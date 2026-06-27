"use client";

import { useState, useTransition } from "react";
import { Copy, ExternalLink } from "lucide-react";

import { Button } from "@hospedex/ui";

import {
  registrarMensagemWhatsappAbertaAction,
  registrarMensagemWhatsappCopiadaAction,
} from "../../lib/confirmations/actions";
import type { ReservaConfirmacao } from "../../lib/confirmations/types";

/**
 * Acoes manuais da mensagem de WhatsApp.
 *
 * O envio real ainda nao existe. Por isso o componente registra apenas copia ou
 * abertura do WhatsApp, preservando a timeline sem afirmar que a mensagem foi enviada.
 */

export function ReservationWhatsappActions({
  reserva,
}: {
  reserva: ReservaConfirmacao;
}) {
  const mensagem = reserva.mensagemWhatsapp;
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();

  if (!mensagem) {
    return (
      <p className="rounded-lg border bg-background/50 p-3 text-sm text-muted-foreground">
        A mensagem de WhatsApp sera preparada depois que a reserva for confirmada.
      </p>
    );
  }

  async function copiarMensagem() {
    if (!mensagem) return;
    await navigator.clipboard.writeText(mensagem.message_body);
    setFeedback("Mensagem copiada.");

    startTransition(() => {
      void registrarMensagemWhatsappCopiadaAction(mensagem.id);
    });
  }

  function abrirWhatsapp() {
    if (!mensagem?.whatsapp_url) {
      setFeedback(mensagem?.review_reason ?? "Telefone do hospede nao informado.");
      return;
    }

    window.open(mensagem.whatsapp_url, "_blank", "noopener,noreferrer");
    setFeedback("WhatsApp aberto com texto preenchido.");

    startTransition(() => {
      void registrarMensagemWhatsappAbertaAction(mensagem.id);
    });
  }

  return (
    <div className="grid gap-3">
      {mensagem.requires_manual_review ? (
        <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-200">
          {mensagem.review_reason ?? "Revise a mensagem antes de enviar."}
        </div>
      ) : null}

      <textarea
        className="min-h-48 w-full resize-y rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        readOnly
        value={mensagem.message_body}
      />

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button disabled={pendente} onClick={copiarMensagem} type="button">
          <Copy />
          Copiar mensagem
        </Button>
        <Button
          disabled={pendente || !mensagem.whatsapp_url}
          onClick={abrirWhatsapp}
          type="button"
          variant="outline"
        >
          <ExternalLink />
          Abrir WhatsApp
        </Button>
      </div>

      {feedback ? (
        <p className="text-sm text-muted-foreground" role="status">
          {feedback}
        </p>
      ) : null}
    </div>
  );
}
