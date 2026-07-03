import { Home, Search } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { GradientBackground, TopNav } from "@hospedex/ui";

import { GuestAccountMenu } from "../guest/guest-account-menu";
import { marketplaceNavigation } from "../../config/navigation";

export type PublicShellProps = {
  children: ReactNode;
};

export function PublicShell({ children }: PublicShellProps) {
  return (
    <GradientBackground className="min-h-screen overflow-hidden text-foreground">
      <TopNav
        actions={
          <div className="flex items-center gap-2">
            <GuestAccountMenu />
          </div>
        }
        brand={<MarketplaceBrand />}
        className="glass-navbar bg-background/72 shadow-sm shadow-cyan-950/5"
        items={marketplaceNavigation}
        label="Hospedex"
      />
      <main>{children}</main>
      <footer className="glass-panel rounded-none border-x-0 border-b-0 bg-card/70">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_auto]">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
                <Home className="h-4 w-4" />
              </span>
              Hospedex
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Encontre casas, pousadas e pequenos hotéis com reserva direta e
              informações organizadas para sua viagem.
            </p>
          </div>
          <nav className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3 sm:gap-8">
            <Link className="transition-colors hover:text-foreground" href="/">
              Inicio
            </Link>
            <Link className="transition-colors hover:text-foreground" href="/propriedades">
              Hospedagens
            </Link>
            <Link className="transition-colors hover:text-foreground" href="/minhas-reservas">
              Minhas reservas
            </Link>
            <Link className="transition-colors hover:text-foreground" href="/#destinos">
              Destinos
            </Link>
            <Link className="transition-colors hover:text-foreground" href="/anunciar">
              Anunciar
            </Link>
            <Link className="transition-colors hover:text-foreground" href="/#por-que">
              Como funciona
            </Link>
            <Link className="transition-colors hover:text-foreground" href="/propriedades">
              Central de ajuda
            </Link>
            <Link className="transition-colors hover:text-foreground" href="/propriedades">
              <Search className="mr-1 inline h-3.5 w-3.5" />
              Buscar
            </Link>
          </nav>
        </div>
        <div className="border-t">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <span>(c) {new Date().getFullYear()} Hospedex.</span>
            <span>Hospedagens independentes com reserva direta.</span>
          </div>
        </div>
      </footer>
    </GradientBackground>
  );
}

/**
 * Marca publica do Marketplace.
 *
 * Usa o asset oficial da marca para manter a navegação coerente com o produto.
 */
function MarketplaceBrand() {
  return (
    <Link
      aria-label="Ir para o inicio do Marketplace Hospedex"
      className="inline-flex min-w-0 items-center gap-2 rounded-2xl border border-cyan-300/20 bg-slate-950/72 px-2.5 py-1.5 shadow-sm shadow-cyan-950/20 backdrop-blur-xl"
      href="/"
    >
      <img
        alt=""
        className="h-9 w-9 shrink-0 object-contain"
        src="/brand/hospedex-logo-white.png"
      />
      <span className="min-w-0 truncate text-lg font-bold leading-none tracking-normal">
        <span className="text-cyan-300">Hospe</span>
        <span className="text-white">dex</span>
      </span>
    </Link>
  );
}
