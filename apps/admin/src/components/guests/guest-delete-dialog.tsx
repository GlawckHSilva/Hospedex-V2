"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";

import { excluirHospedeAction } from "../../lib/guests/actions";
import { ActionButton } from "../management/action-button";
import { AppModal } from "../management/entity-modal";

/**
 * Confirmação segura para remover hóspede do CRM do tenant.
 *
 * A remoção não exclui conta pública, profile global nem histórico financeiro.
 * A Server Action valida novamente reservas e pagamentos antes do soft delete.
 */

type GuestDeleteDialogProps = {
  disabled: boolean;
  hospedeId: string;
  motivo: string;
  nome: string;
};

export function GuestDeleteDialog({
  disabled,
  hospedeId,
  motivo,
  nome
}: GuestDeleteDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <span className="inline-flex" title={disabled ? motivo : "Remover hóspede do CRM"}>
        <ActionButton
          disabled={disabled}
          icon={<Trash2 className="h-4 w-4" />}
          onClick={() => setOpen(true)}
          size="md"
          type="button"
          variant="delete"
        >
          Apagar
        </ActionButton>
      </span>

      <AppModal
        description="Confirme apenas se deseja remover o vínculo deste hóspede com o seu CRM."
        onOpenChange={setOpen}
        open={open}
        size="sm"
        title="Remover hóspede do CRM?"
      >
        <form action={excluirHospedeAction} className="space-y-4">
          <input name="hospedeId" type="hidden" value={hospedeId} />
          <input name="confirmarExclusao" type="hidden" value="confirmado" />

          <div className="rounded-xl border border-cyan-300/20 bg-cyan-500/8 p-4 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">{nome}</p>
            <p className="mt-2">
              Este hóspede será removido da sua lista de hóspedes, mas o cadastro
              dele no site não será excluído.
            </p>
            <p className="mt-2">
              Reservas, histórico e registros vinculados serão preservados.
            </p>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <ActionButton
              onClick={() => setOpen(false)}
              size="md"
              type="button"
              variant="cancel"
            >
              Cancelar
            </ActionButton>
            <ActionButton size="md" type="submit" variant="delete">
              Remover do CRM
            </ActionButton>
          </div>
        </form>
      </AppModal>
    </>
  );
}
