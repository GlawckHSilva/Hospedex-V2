"use client";

import { useEffect, useState } from "react";

/**
 * Toast reutilizável dos módulos administrativos.
 *
 * As mensagens vêm das server actions por query string para manter feedback
 * simples, sem adicionar dependência de notificações antes da necessidade real.
 */

export type ModuleToastProps = {
  sucesso?: string | undefined;
  erro?: string | undefined;
  mensagensSucesso?: Record<string, string>;
};

export function ModuleToast({ sucesso, erro, mensagensSucesso = {} }: ModuleToastProps) {
  const [visivel, setVisivel] = useState(Boolean(sucesso || erro));

  useEffect(() => {
    setVisivel(Boolean(sucesso || erro));
    const timer = window.setTimeout(() => setVisivel(false), 4200);
    return () => window.clearTimeout(timer);
  }, [sucesso, erro]);

  if (!visivel || (!sucesso && !erro)) return null;

  const mensagem = erro ?? mensagensSucesso[sucesso ?? ""] ?? sucesso;

  return (
    <div
      className={`fixed right-4 top-4 z-50 max-w-sm rounded-lg border px-4 py-3 text-sm shadow-lg backdrop-blur ${
        erro
          ? "border-destructive/30 bg-destructive/15 text-destructive"
          : "border-success/30 bg-success/15 text-success"
      }`}
      role="status"
    >
      {mensagem}
    </div>
  );
}
