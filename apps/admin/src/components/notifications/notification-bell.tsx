"use client";

import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Badge, Button, cn } from "@hospedex/ui";

import { marcarTodasNotificacoesLidasAction } from "../../lib/notifications/actions";
import type { ResumoNotificacoesGerenciamento } from "../../lib/notifications/types";

type NotificationBellProps = {
  resumo: ResumoNotificacoesGerenciamento;
};

export function NotificationBell({ resumo }: NotificationBellProps) {
  const [aberto, setAberto] = useState(false);
  const temNaoLidas = resumo.totalNaoLidas > 0;

  return (
    <div className="relative">
      <Button
        aria-label="Abrir notificacoes"
        className="relative"
        onClick={() => setAberto((valor) => !valor)}
        size="icon"
        type="button"
        variant="ghost"
      >
        <Bell className="h-4 w-4" />
        {temNaoLidas ? (
          <span className="absolute right-1.5 top-1.5 flex h-2.5 w-2.5 rounded-full bg-cyan-400 ring-2 ring-background" />
        ) : null}
      </Button>

      {aberto ? (
        <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-cyan-300/20 bg-background/92 p-3 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Notificacoes</p>
              <p className="text-xs text-muted-foreground">
                {resumo.totalNaoLidas} nao lida{resumo.totalNaoLidas === 1 ? "" : "s"}
              </p>
            </div>
            {temNaoLidas ? (
              <form action={marcarTodasNotificacoesLidasAction}>
                <Button size="sm" type="submit" variant="ghost">
                  <CheckCheck className="h-4 w-4" />
                </Button>
              </form>
            ) : null}
          </div>

          <div className="mt-3 space-y-2">
            {resumo.itens.length ? (
              resumo.itens.map((item) => (
                <Link
                  className={cn(
                    "block rounded-lg border p-3 text-sm transition hover:border-cyan-300/50 hover:bg-cyan-500/10",
                    item.lida ? "bg-background/40" : "border-cyan-300/30 bg-cyan-500/10"
                  )}
                  href={item.href}
                  key={item.key}
                  onClick={() => setAberto(false)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">{item.titulo}</p>
                    {!item.lida ? <Badge variant="info">novo</Badge> : null}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {item.descricao}
                  </p>
                </Link>
              ))
            ) : (
              <div className="rounded-lg border bg-background/40 p-3 text-sm text-muted-foreground">
                Nenhuma notificacao pendente.
              </div>
            )}
          </div>

          <Link
            className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-cyan-300/20 px-3 py-2 text-sm font-medium text-cyan-700 transition hover:bg-cyan-500/10 dark:text-cyan-200"
            href="/notificacoes"
            onClick={() => setAberto(false)}
          >
            Ver todas <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      ) : null}
    </div>
  );
}
