"use client";

import { Check, Trash2 } from "lucide-react";

import { Button } from "@hospedex/ui";

import { ConfirmDialog } from "../management/entity-modal";
import {
  excluirNotificacaoAction,
  marcarNotificacaoLidaAction,
} from "../../lib/notifications/actions";

type NotificationRowActionsProps = {
  lida: boolean;
  notificationKey: string;
};

export function NotificationRowActions({
  lida,
  notificationKey,
}: NotificationRowActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {!lida ? (
        <form action={marcarNotificacaoLidaAction}>
          <input name="notificationKey" type="hidden" value={notificationKey} />
          <Button size="sm" type="submit" variant="outline">
            <Check className="h-4 w-4" />
            Marcar como lida
          </Button>
        </form>
      ) : null}
      <ConfirmDialog
        description="Esta notificação será removida apenas da sua lista."
        title="Excluir notificação"
        triggerIcon={<Trash2 className="h-4 w-4" />}
        triggerLabel="Excluir"
      >
        <form action={excluirNotificacaoAction} className="grid gap-3">
          <input name="notificationKey" type="hidden" value={notificationKey} />
          <Button size="sm" type="submit" variant="destructive">
            <Trash2 className="h-4 w-4" />
            Excluir notificação
          </Button>
        </form>
      </ConfirmDialog>
    </div>
  );
}
