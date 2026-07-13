"use client";

import { ChevronDown, LogOut, TicketCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { buttonVariants, cn } from "@hospedex/ui";

import { sairHospede, useGuestProfile } from "./use-guest-profile";

/**
 * Entrada visivel da Area do Hospede.
 *
 * O menu roda no client apenas para refletir a sessao atual no header. A
 * autorizacao real continua nas Server Components e nas policies RLS.
 */
export function GuestAccountMenu() {
  const [aberto, setAberto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { carregando, iniciais, perfil } = useGuestProfile();

  useEffect(() => {
    function fecharAoClicarFora(evento: MouseEvent) {
      if (!menuRef.current?.contains(evento.target as Node)) {
        setAberto(false);
      }
    }

    document.addEventListener("mousedown", fecharAoClicarFora);
    return () => document.removeEventListener("mousedown", fecharAoClicarFora);
  }, []);

  if (carregando) {
    return (
      <div className="hidden h-9 w-24 animate-pulse rounded-full border bg-secondary/60 md:block" />
    );
  }

  if (!perfil) {
    return (
      <Link
        className={cn(
          "inline-flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full border border-transparent bg-transparent text-foreground transition hover:text-primary dark:text-slate-100 dark:hover:text-cyan-200 md:h-8 md:w-auto md:px-2 md:text-sm md:font-semibold",
        )}
        href="/login"
      >
        <UserRound className="h-4 w-4" />
        <span className="hidden md:inline">Entrar</span>
      </Link>
    );
  }

  return (
    <div
      className="relative hidden shrink-0 items-center gap-2 md:flex"
      ref={menuRef}
    >
      <Link
        className={cn(
          buttonVariants({ size: "sm", variant: "secondary" }),
          "hidden border border-cyan-300/20 bg-cyan-400/10 text-primary hover:bg-cyan-400/15 dark:text-cyan-50 md:inline-flex",
        )}
        href="/minhas-reservas"
      >
        <TicketCheck className="h-4 w-4 text-primary" />
        Minhas reservas
      </Link>
      <button
        aria-expanded={aberto}
        className="inline-flex h-10 items-center gap-2 rounded-full border border-cyan-300/20 bg-background/70 px-2 pr-3 text-sm font-medium shadow-sm shadow-cyan-950/10 transition hover:border-cyan-300/45 hover:bg-secondary/70"
        onClick={() => setAberto((valor) => !valor)}
        type="button"
      >
        {perfil.avatar_url ? (
          <img
            alt="Avatar do hospede"
            className="h-7 w-7 rounded-full object-cover"
            src={perfil.avatar_url}
          />
        ) : (
          <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/15 text-xs text-primary">
            {iniciais}
          </span>
        )}
        <span className="hidden max-w-28 truncate sm:inline">
          {perfil.full_name ?? perfil.email}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-primary/75" />
      </button>

      {aberto ? (
        <div className="absolute right-0 top-12 z-50 w-56 rounded-2xl border bg-background/95 p-2 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl">
          <Link
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            href="/minhas-reservas"
            onClick={() => setAberto(false)}
          >
            <TicketCheck className="h-4 w-4" />
            Minhas reservas
          </Link>
          <Link
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            href="/perfil"
            onClick={() => setAberto(false)}
          >
            <UserRound className="h-4 w-4" />
            Perfil
          </Link>
          <button
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            onClick={sairHospede}
            type="button"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      ) : null}
    </div>
  );
}
