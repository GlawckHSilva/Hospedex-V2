"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { cn } from "@hospedex/ui";

import { marketplaceNavigation } from "../../config/navigation";

/**
 * Menu principal do Marketplace em telas pequenas.
 *
 * O TopNav esconde os links abaixo de md para preservar espaco. Este menu
 * garante que o hospede continue com acesso claro a Inicio, Hospedagens,
 * Destinos e Anunciar no mobile, sem misturar com a area logada.
 */
export function MobileMarketplaceMenu() {
  const [aberto, setAberto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
          "grid h-10 w-10 place-items-center rounded-xl border border-cyan-300/20",
          "bg-slate-950/72 text-cyan-100 shadow-sm shadow-cyan-950/20 backdrop-blur-xl",
          "transition hover:border-cyan-300/45 hover:bg-cyan-400/10"
        )}
        onClick={() => setAberto((valor) => !valor)}
        type="button"
      >
        {aberto ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      {aberto ? (
        <nav
          aria-label="Navegacao mobile do Marketplace"
          className="absolute right-0 top-12 z-50 w-60 rounded-2xl border border-cyan-300/20 bg-slate-950/96 p-2 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl"
        >
          {marketplaceNavigation.map((item) => (
            <Link
              className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-cyan-400/10 hover:text-cyan-100"
              href={item.href}
              key={item.href}
              onClick={() => setAberto(false)}
            >
              {item.label}
            </Link>
          ))}
          <div className="my-2 h-px bg-cyan-300/10" />
          <Link
            className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/10"
            href="/login"
            onClick={() => setAberto(false)}
          >
            Entrar
          </Link>
          <Link
            className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-cyan-400/10 hover:text-cyan-100"
            href="/minhas-reservas"
            onClick={() => setAberto(false)}
          >
            Minhas reservas
          </Link>
        </nav>
      ) : null}
    </div>
  );
}
