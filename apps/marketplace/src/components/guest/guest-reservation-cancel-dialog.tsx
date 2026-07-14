"use client";

import { AlertTriangle, Loader2, X } from "lucide-react";
import { useState } from "react";
import { useFormStatus } from "react-dom";

import { GlassButton } from "@hospedex/ui";

import { cancelarReservaHospedeAction } from "../../lib/guest/actions";
import { formatarMoedaHospede } from "../../lib/guest/format";
import type { ReservaHospedeDetalhe } from "../../lib/guest/types";

export function GuestReservationCancelDialog({
  reserva
}: {
  reserva: ReservaHospedeDetalhe;
}) {
  const [aberto, setAberto] = useState(false);
  const cancelamento = reserva.cancelamento;

  if (!cancelamento.podeCancelar) {
    return (
      <p className="rounded-xl border border-dashed bg-background/35 p-4 text-sm text-muted-foreground">
        {cancelamento.mensagemBloqueio}
      </p>
    );
  }

  return (
    <>
      <GlassButton
        className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 dark:border-red-400/30 dark:text-red-200 dark:hover:bg-red-500/10"
        onClick={() => setAberto(true)}
        variant="secondary"
      >
        Cancelar reserva
      </GlassButton>

      {aberto ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-destructive/25 bg-background p-5 shadow-2xl dark:border-red-400/25">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-destructive dark:text-red-300">
                  Cancelamento
                </p>
                <h2 className="mt-2 text-2xl font-semibold">Cancelar reserva</h2>
              </div>
              <button
                aria-label="Fechar cancelamento"
                className="rounded-full border p-2 text-muted-foreground transition hover:text-foreground"
                onClick={() => setAberto(false)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning dark:border-amber-300/25 dark:bg-amber-500/10 dark:text-amber-100">
              <AlertTriangle className="mb-2 h-4 w-4" />
              O cancelamento segue a politica definida pelo proprietario. O
              proprietario sera notificado e o financeiro da reserva sera
              atualizado.
            </div>

            <div className="mt-5 grid gap-3 text-sm text-muted-foreground">
              {cancelamento.itens.map((item) => (
                <p className="rounded-xl border bg-background/45 p-3" key={item}>
                  {item}
                </p>
              ))}
              {cancelamento.observacoes ? (
                <p className="rounded-xl border bg-background/45 p-3">
                  {cancelamento.observacoes}
                </p>
              ) : null}
            </div>

            <div className="mt-5 rounded-xl border bg-background/45 p-4 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Reembolso estimado</span>
                <strong>
                  {formatarMoedaHospede(cancelamento.valorReembolsoEstimado)}
                </strong>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Percentual aplicado agora: {cancelamento.percentualReembolsoEstimado}%.
                Valores dependem de confirmacao do proprietario e do meio de
                pagamento usado.
              </p>
            </div>

            <form action={cancelarReservaHospedeAction} className="mt-5 grid gap-4">
              <input name="reservaId" type="hidden" value={reserva.id} />
              <label className="grid gap-2 text-sm font-medium">
                Motivo do cancelamento
                <textarea
                  className="min-h-24 rounded-xl border bg-background/60 p-3 text-sm outline-none focus:border-primary dark:focus:border-cyan-300"
                  name="motivo"
                  placeholder="Opcional. Explique o motivo para o proprietario."
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <GlassButton onClick={() => setAberto(false)} type="button" variant="secondary">
                  Voltar
                </GlassButton>
                <ConfirmarCancelamentoButton />
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ConfirmarCancelamentoButton() {
  const { pending } = useFormStatus();

  return (
    <GlassButton disabled={pending} type="submit" variant="destructive">
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {pending ? "Cancelando..." : "Confirmar cancelamento"}
    </GlassButton>
  );
}
