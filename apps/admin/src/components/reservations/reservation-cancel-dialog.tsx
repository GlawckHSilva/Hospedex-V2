"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";

import { ActionButton } from "../management/action-button";
import { AppModal } from "../management/entity-modal";
import { cancelarReservaAction } from "../../lib/reservations/actions";

/**
 * Confirmacao compacta para remover/cancelar uma reserva.
 *
 * A acao real permanece na server action para respeitar tenant, permissoes e a
 * regra atual de cancelamento logico com historico.
 */
type ReservationCancelDialogProps = {
  codigoReserva: string;
  disabled: boolean;
  reservaId: string;
};

export function ReservationCancelDialog({
  codigoReserva,
  disabled,
  reservaId,
}: ReservationCancelDialogProps) {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <ActionButton
        aria-label={`Remover reserva ${codigoReserva}`}
        className="h-9 w-9 px-0 [&>span.relative>span:first-child]:sr-only"
        disabled={disabled}
        icon={<Trash2 className="h-4 w-4" />}
        onClick={() => setAberto(true)}
        type="button"
        variant="delete"
      >
        Remover reserva
      </ActionButton>

      <AppModal
        description="Tem certeza que deseja remover esta reserva? Esta acao pode cancelar a reserva e preservar o historico, conforme as regras do sistema."
        eyebrow="Confirmacao"
        onOpenChange={setAberto}
        open={aberto}
        size="sm"
        title="Remover reserva"
      >
        <form action={cancelarReservaAction} className="grid gap-4">
          <input name="reservaId" type="hidden" value={reservaId} />
          <input
            name="motivo"
            type="hidden"
            value="Reserva removida pela listagem compacta do gerenciamento."
          />

          <p className="rounded-lg border bg-background/55 p-3 text-sm leading-6 text-muted-foreground">
            A reserva <strong className="text-foreground">{codigoReserva}</strong>{" "}
            seguira a regra atual do sistema: cancelamento logico quando
            permitido, com registro no historico.
          </p>

          <div className="grid gap-2 sm:grid-cols-2">
            <ActionButton
              onClick={() => setAberto(false)}
              type="button"
              variant="cancel"
            >
              Cancelar
            </ActionButton>
            <ActionButton disabled={disabled} type="submit" variant="delete">
              Confirmar remocao
            </ActionButton>
          </div>
        </form>
      </AppModal>
    </>
  );
}
