"use client";

import { ChevronDown, LogIn, LogOut, TicketCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { buttonVariants, cn } from "@hospedex/ui";

import { criarClienteSupabaseBrowser } from "../../lib/supabase/client";

type PerfilMenu = {
  avatar_url: string | null;
  email: string;
  full_name: string | null;
};

/**
 * Entrada visivel da Area do Hospede.
 *
 * O menu roda no client apenas para refletir a sessao atual no header. A
 * autorizacao real continua nas Server Components e nas policies RLS.
 */
export function GuestAccountMenu() {
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [perfil, setPerfil] = useState<PerfilMenu | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = criarClienteSupabaseBrowser();
    if (!supabase) {
      setCarregando(false);
      return;
    }

    const clienteSupabase = supabase;
    let ativo = true;

    async function carregarPerfil() {
      const { data: usuarioResultado } = await clienteSupabase.auth.getUser();
      const usuario = usuarioResultado.user;

      if (!usuario) {
        if (ativo) {
          setPerfil(null);
          setCarregando(false);
        }
        return;
      }

      const { data } = await clienteSupabase
        .from("profiles")
        .select("full_name,email,avatar_url")
        .eq("id", usuario.id)
        .maybeSingle<PerfilMenu>();

      if (ativo) {
        setPerfil(
          data ?? {
            avatar_url: null,
            email: usuario.email ?? "",
            full_name: usuario.email ?? "Hospede"
          }
        );
        setCarregando(false);
      }
    }

    void carregarPerfil();

    const {
      data: { subscription }
    } = clienteSupabase.auth.onAuthStateChange(() => {
      void carregarPerfil();
    });

    return () => {
      ativo = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    function fecharAoClicarFora(evento: MouseEvent) {
      if (!menuRef.current?.contains(evento.target as Node)) {
        setAberto(false);
      }
    }

    document.addEventListener("mousedown", fecharAoClicarFora);
    return () => document.removeEventListener("mousedown", fecharAoClicarFora);
  }, []);

  const iniciais = useMemo(() => obterIniciais(perfil), [perfil]);

  if (carregando) {
    return (
      <div className="h-9 w-24 animate-pulse rounded-full border bg-secondary/60" />
    );
  }

  if (!perfil) {
    return (
      <Link
        className={cn(
          buttonVariants({ size: "sm", variant: "secondary" }),
          "shrink-0"
        )}
        href="/login"
      >
        <LogIn className="h-4 w-4" />
        <span className="hidden sm:inline">Entrar</span>
      </Link>
    );
  }

  return (
    <div className="relative flex shrink-0 items-center gap-2" ref={menuRef}>
      <Link
        className={cn(
          buttonVariants({ size: "sm", variant: "secondary" }),
          "hidden border border-cyan-300/20 bg-cyan-400/10 text-cyan-50 hover:bg-cyan-400/15 md:inline-flex"
        )}
        href="/minhas-reservas"
      >
        <TicketCheck className="h-4 w-4 text-cyan-200" />
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
        <ChevronDown className="h-3.5 w-3.5 text-cyan-100/75" />
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
            onClick={async () => {
              const supabase = criarClienteSupabaseBrowser();
              await supabase?.auth.signOut();
              window.location.href = "/login";
            }}
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

function obterIniciais(perfil: PerfilMenu | null) {
  const base = perfil?.full_name || perfil?.email || "Hospede";
  return base
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("");
}
