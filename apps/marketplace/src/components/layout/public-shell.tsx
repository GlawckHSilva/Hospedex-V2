import { Camera, Mail, MessageCircle, Search, Send } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { GradientBackground, TopNav } from "@hospedex/ui";

import { marketplaceNavigation } from "../../config/navigation";
import { GuestAccountMenu } from "../guest/guest-account-menu";
import { MobileMarketplaceMenu } from "./mobile-marketplace-menu";

export type PublicShellProps = {
  children: ReactNode;
};

export function PublicShell({ children }: PublicShellProps) {
  return (
    <GradientBackground className="min-h-screen overflow-hidden text-foreground">
      <TopNav
        actions={
          <div className="flex shrink-0 items-center gap-2">
            <MobileMarketplaceMenu />
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
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_1.35fr]">
          <div className="max-w-sm">
            <MarketplaceBrand />
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Conectamos viajantes a hospedagens independentes com mais confiança,
              transparência e experiência.
            </p>
            <div className="mt-4 flex gap-2">
              {[Camera, MessageCircle, Mail].map((Icone) => (
                <span
                  className="grid h-9 w-9 place-items-center rounded-md border border-border bg-card/60 text-muted-foreground"
                  key={Icone.displayName ?? Icone.name}
                >
                  <Icone className="h-4 w-4" />
                </span>
              ))}
            </div>
          </div>

          <nav className="grid gap-2 text-sm text-muted-foreground">
            <strong className="mb-1 text-sm text-foreground">Navegação</strong>
            <Link className="transition-colors hover:text-foreground" href="/">
              Início
            </Link>
            <Link className="transition-colors hover:text-foreground" href="/propriedades">
              Hospedagens
            </Link>
            <Link className="transition-colors hover:text-foreground" href="/#destinos">
              Destinos
            </Link>
            <Link className="transition-colors hover:text-foreground" href="/minhas-reservas">
              Minhas reservas
            </Link>
          </nav>

          <nav className="grid gap-2 text-sm text-muted-foreground">
            <strong className="mb-1 text-sm text-foreground">Para proprietários</strong>
            <Link className="transition-colors hover:text-foreground" href="/anunciar">
              Anunciar
            </Link>
            <Link className="transition-colors hover:text-foreground" href="/#por-que">
              Como funciona
            </Link>
            <Link className="transition-colors hover:text-foreground" href="/propriedades">
              Central de ajuda
            </Link>
          </nav>

          <nav className="grid gap-2 text-sm text-muted-foreground">
            <strong className="mb-1 text-sm text-foreground">Informações</strong>
            <Link className="transition-colors hover:text-foreground" href="/propriedades">
              <Search className="mr-1 inline h-3.5 w-3.5" />
              Buscar
            </Link>
            <span>Termos de uso</span>
            <span>Privacidade</span>
          </nav>

          <div>
            <strong className="text-sm text-foreground">Fique por dentro das novidades</strong>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Receba dicas de viagens e novidades do Hospedex.
            </p>
            <div className="mt-4 flex rounded-lg border border-border bg-background/60 p-1">
              <span className="min-w-0 flex-1 px-3 py-2 text-sm text-muted-foreground">
                Seu melhor e-mail
              </span>
              <span className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground">
                <Send className="h-4 w-4" />
              </span>
            </div>
          </div>
        </div>
        <div className="border-t">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <span>© {new Date().getFullYear()} Hospedex. Todos os direitos reservados.</span>
            <span>Hospedex é um marketplace independente.</span>
          </div>
        </div>
      </footer>
    </GradientBackground>
  );
}

/**
 * Marca pública do Marketplace.
 *
 * Usa o asset oficial da marca para manter a navegação coerente com o produto.
 */
function MarketplaceBrand() {
  return (
    <Link
      aria-label="Ir para o início do Marketplace Hospedex"
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
