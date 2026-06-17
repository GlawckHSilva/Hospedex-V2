"use client";

import { Check, Trash2 } from "lucide-react";

import { Button } from "@hospedex/ui";

import {
  excluirNotificacaoAction,
  marcarNotificacaoLidaAction
} from "../../lib/notifications/actions";

type NotificationRowActionsProps = {
  lida: boolean;
  notificationKey: string;
};

export function NotificationRowActions({
  lida,
  notificationKey
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
      <form
        action={excluirNotificacaoAction}
        onSubmit={(evento) => {
          if (!window.confirm("Excluir esta notificacao da sua lista?")) {
            evento.preventDefault();
          }
        }}
      >
        <input name="notificationKey" type="hidden" value={notificationKey} />
        <Button size="sm" type="submit" variant="ghost">
          <Trash2 className="h-4 w-4" />
          Excluir
        </Button>
      </form>
    </div>
  );
}
