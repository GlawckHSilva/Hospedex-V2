"use client";

import {
  BadgePlus,
  BedDouble,
  Heart,
  Home,
  LogIn,
  LogOut,
  MapPinned,
  Menu,
  Moon,
  Sun,
  TicketCheck,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";

import { cn } from "@hospedex/ui";

import { marketplaceNavigation } from "../../config/navigation";
import { sairHospede, useGuestProfile } from "../guest/use-guest-profile";

const iconesNavegacao = {
  "/": Home,
  "/propriedades": BedDouble,
  "/#destinos": MapPinned,
  "/anunciar": BadgePlus,
} as const;

const classeIconeMenu =
  "shrink-0 text-slate-700 dark:text-slate-100";

const propriedadesIconeMenu = {
  size: 17,
  strokeWidth: 1.5,
} as const;

/**
 * Menu principal do Marketplace em telas pequenas.
 *
 * O TopNav esconde os links abaixo de md para preservar espaco. Este menu
 * garante que o hóspede continue com acesso claro a Início, Hospedagens,
 * Destinos e Anunciar no mobile, sem misturar com a area logada.
 */
export function MobileMarketplaceMenu() {
  const [aberto, setAberto] = useState(false);
  const [temaMontado, setTemaMontado] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme, setTheme } = useTheme();
  const { carregando, iniciais, perfil } = useGuestProfile();
  const modoEscuro = resolvedTheme === "dark";

  useEffect(() => {
    setTemaMontado(true);

    function fecharAoClicarFora(evento: MouseEvent) {
      if (!menuRef.current?.contains(evento.target as Node)) {
        setAberto(false);
      }
    }

    function fecharComEscape(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        setAberto(false);
      }
    }

    document.addEventListener("mousedown", fecharAoClicarFora);
    document.addEventListener("keydown", fecharComEscape);
    return () => {
      document.removeEventListener("mousedown", fecharAoClicarFora);
      document.removeEventListener("keydown", fecharComEscape);
    };
  }, []);

  return (
    <div className="relative md:hidden" ref={menuRef}>
      <button
        aria-expanded={aberto}
        aria-label={aberto ? "Fechar menu" : "Abrir menu"}
        className={cn(
          "grid h-10 w-10 place-items-center rounded-full border border-transparent bg-transparent",
          "text-foreground transition hover:text-primary dark:text-cyan-100 dark:hover:text-cyan-200",
        )}
        onClick={() => setAberto((valor) => !valor)}
        type="button"
      >
        {aberto ? (
          <X size={17} strokeWidth={1.5} />
        ) : (
          <Menu size={17} strokeWidth={1.5} />
        )}
      </button>

      {aberto ? (
        <nav
          aria-label="Navegacao mobile do Marketplace"
          className="absolute right-0 top-12 z-50 w-60 rounded-2xl border border-border bg-card p-2 text-foreground shadow-2xl shadow-slate-950/15 dark:border-cyan-300/20 dark:bg-slate-950 dark:shadow-cyan-950/30"
        >
          {marketplaceNavigation.map((item) => {
            const Icone = iconesNavegacao[item.href];

            return (
              <Link
                className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition hover:bg-cyan-400/10 hover:text-primary dark:text-slate-200 dark:hover:text-cyan-100"
                href={item.href}
                key={item.href}
                onClick={() => setAberto(false)}
              >
                <Icone
                  className={classeIconeMenu}
                  {...propriedadesIconeMenu}
                />
                {item.label}
              </Link>
            );
          })}
          <Link
            className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition hover:bg-cyan-400/10 hover:text-primary dark:text-slate-200 dark:hover:text-cyan-100"
            href="/favoritos"
            onClick={() => setAberto(false)}
          >
            <Heart className={classeIconeMenu} {...propriedadesIconeMenu} />
            Favoritos
          </Link>
          <div className="my-2 h-px bg-cyan-300/10" />
          <button
            className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-foreground transition hover:bg-cyan-400/10 hover:text-primary disabled:opacity-60 dark:text-slate-200 dark:hover:text-cyan-100"
            disabled={!temaMontado}
            onClick={() => setTheme(modoEscuro ? "light" : "dark")}
            type="button"
          >
            {modoEscuro ? (
              <Sun className={classeIconeMenu} {...propriedadesIconeMenu} />
            ) : (
              <Moon className={classeIconeMenu} {...propriedadesIconeMenu} />
            )}
            <span>{modoEscuro ? "Modo claro" : "Modo escuro"}</span>
          </button>

          <div className="my-2 h-px bg-cyan-300/10" />
          {carregando ? (
            <div className="h-16 animate-pulse rounded-xl bg-cyan-400/10" />
          ) : perfil ? (
            <div className="space-y-1">
              <div className="flex items-center gap-3 rounded-xl bg-accent-soft px-3 py-3 dark:bg-cyan-400/10">
                {perfil.avatar_url ? (
                  <img
                    alt="Avatar do hóspede"
                    className="h-9 w-9 rounded-full object-cover"
                    src={perfil.avatar_url}
                  />
                ) : (
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/12 text-xs font-semibold text-primary dark:bg-cyan-300/15 dark:text-cyan-100">
                    {iniciais}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground dark:text-cyan-50">
                    {perfil.full_name ?? "Hóspede"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {perfil.email}
                  </p>
                </div>
              </div>
              <Link
                className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition hover:bg-cyan-400/10 hover:text-primary dark:text-slate-200 dark:hover:text-cyan-100"
                href="/minhas-reservas"
                onClick={() => setAberto(false)}
              >
                <TicketCheck
                  className={classeIconeMenu}
                  {...propriedadesIconeMenu}
                />
                Minhas reservas
              </Link>
              <Link
                className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition hover:bg-cyan-400/10 hover:text-primary dark:text-slate-200 dark:hover:text-cyan-100"
                href="/perfil"
                onClick={() => setAberto(false)}
              >
                <UserRound
                  className={classeIconeMenu}
                  {...propriedadesIconeMenu}
                />
                Perfil
              </Link>
              <button
                className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-foreground transition hover:bg-cyan-400/10 hover:text-primary dark:text-slate-200 dark:hover:text-cyan-100"
                onClick={sairHospede}
                type="button"
              >
                <LogOut
                  className={classeIconeMenu}
                  {...propriedadesIconeMenu}
                />
                Sair
              </button>
            </div>
          ) : (
            <Link
              className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-primary transition hover:bg-cyan-400/10 dark:text-cyan-100"
              href="/login"
              onClick={() => setAberto(false)}
            >
              <LogIn className={classeIconeMenu} {...propriedadesIconeMenu} />
              Entrar
            </Link>
          )}
        </nav>
      ) : null}
    </div>
  );
}
