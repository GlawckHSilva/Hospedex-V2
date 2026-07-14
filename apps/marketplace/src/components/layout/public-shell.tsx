import {
  ArrowUpRight,
  Bell,
  Camera,
  Heart,
  Mail,
  MessageCircle,
  Search,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { GradientBackground, TopNav } from "@hospedex/ui";

import { marketplaceNavigation } from "../../config/navigation";
import { GuestAccountMenu } from "../guest/guest-account-menu";
import { MobileMarketplaceMenu } from "./mobile-marketplace-menu";

export type PublicShellProps = {
  children: ReactNode;
};

const footerNavigation = [
  {
    title: "Explorar",
    links: [
      { label: "Inicio", href: "/" },
      { label: "Hospedagens", href: "/propriedades" },
      { label: "Buscar", href: "/propriedades", icon: Search },
      { label: "Minhas reservas", href: "/minhas-reservas" },
      { label: "Favoritos", href: "/favoritos", icon: Heart },
    ],
  },
  {
    title: "Para proprietarios",
    links: [
      { label: "Anunciar hospedagem", href: "/anunciar" },
      { label: "Como funciona", href: "/#proprietarios" },
      {
        label: "Ir para o Gerenciamento",
        href:
          process.env.NEXT_PUBLIC_ADMIN_URL?.trim() ||
          "https://hospedex.vercel.app",
        external: true,
      },
    ],
  },
  {
    title: "Informacoes",
    links: [
      { label: "Sobre o Hospedex", href: "/#categorias" },
      { label: "Contato", href: contatoEmailHref() },
    ].filter((link) => Boolean(link.href)),
  },
] satisfies Array<{
  title: string;
  links: Array<{
    label: string;
    href: string;
    icon?: LucideIcon;
    external?: boolean;
  }>;
}>;

export function PublicShell({ children }: PublicShellProps) {
  const canais = canaisOficiais();

  return (
    <GradientBackground className="min-h-screen overflow-hidden text-foreground">
      <TopNav
        actions={
          <div className="flex shrink-0 items-center gap-2">
            <GuestAccountMenu />
            <MobileMarketplaceMenu />
          </div>
        }
        brand={<MarketplaceBrand />}
        className="glass-navbar bg-background/72 shadow-sm shadow-cyan-950/5"
        items={marketplaceNavigation}
        label="Hospedex"
        themeToggleClassName="hidden md:block"
      />
      <main>{children}</main>
      <footer className="border-t border-border/80 bg-slate-50/92 text-foreground shadow-[0_-18px_60px_rgba(20,32,51,0.06)] dark:border-cyan-300/10 dark:bg-slate-950/92 dark:shadow-[0_-18px_70px_rgba(0,0,0,0.28)]">
        <div className="h-px bg-gradient-to-r from-transparent via-primary/75 to-transparent dark:via-cyan-300/70" />
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-9 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.15fr_1.45fr_0.9fr] lg:gap-10">
          <section className="max-w-md">
            <MarketplaceBrand />
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Encontre casas, pousadas e pequenos hoteis independentes com mais
              confianca, transparencia e contato direto.
            </p>
            <p className="mt-3 text-xs font-medium uppercase tracking-[0.22em] text-primary dark:text-cyan-300">
              Marketplace de hospedagens independentes
            </p>

            {canais.length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {canais.map(({ href, label, Icone }) => (
                  <a
                    aria-label={label}
                    className="group inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-background/75 px-3 text-sm font-medium text-muted-foreground transition hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 dark:bg-white/[0.03] dark:hover:text-cyan-200 dark:focus-visible:ring-cyan-300/40"
                    href={href}
                    key={label}
                    rel={
                      href.startsWith("http")
                        ? "noreferrer noopener"
                        : undefined
                    }
                    target={href.startsWith("http") ? "_blank" : undefined}
                    title={label}
                  >
                    <Icone className="h-4 w-4" />
                    <span>{label}</span>
                  </a>
                ))}
              </div>
            ) : null}
          </section>

          <nav
            aria-label="Rodape do Marketplace"
            className="grid gap-7 sm:grid-cols-3"
          >
            {footerNavigation.map((grupo) => (
              <div className="min-w-0" key={grupo.title}>
                <strong className="text-sm font-semibold text-foreground">
                  {grupo.title}
                </strong>
                <ul className="mt-3 grid gap-2.5 text-sm">
                  {grupo.links.map((link) => (
                    <li key={link.label}>
                      <FooterLink {...link} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          <section className="rounded-2xl border border-border bg-background/72 p-4 shadow-sm shadow-cyan-950/5 dark:bg-white/[0.035] dark:shadow-cyan-950/15">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-primary dark:bg-cyan-300/10 dark:text-cyan-200">
                <Bell className="h-4 w-4" />
              </span>
              <div>
                <strong className="text-sm font-semibold text-foreground">
                  Novidades e inspiracoes
                </strong>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Receba novas hospedagens, destinos e novidades do Hospedex.
                </p>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-dashed border-border-active/45 bg-accent-soft/65 px-3 py-3 text-sm text-muted-foreground dark:bg-cyan-300/5">
              A inscricao por e-mail estara disponivel em breve. Nenhum cadastro
              e simulado enquanto a integracao nao existir.
            </div>
          </section>
        </div>
        <div className="border-t border-border/80 bg-background/60 dark:bg-white/[0.02]">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <span>
              © {new Date().getFullYear()} Hospedex. Todos os direitos
              reservados.
            </span>
            <span>Marketplace de hospedagens independentes.</span>
          </div>
        </div>
      </footer>
    </GradientBackground>
  );
}

type FooterLinkProps = {
  label: string;
  href: string;
  external?: boolean;
  icon?: LucideIcon;
};

function FooterLink({ external, href, icon: Icone, label }: FooterLinkProps) {
  const className =
    "inline-flex min-h-9 items-center gap-1.5 rounded-lg text-muted-foreground transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 dark:hover:text-cyan-200 dark:focus-visible:ring-cyan-300/40";

  if (external) {
    return (
      <a
        className={className}
        href={href}
        rel="noreferrer noopener"
        target="_blank"
      >
        {Icone ? <Icone className="h-3.5 w-3.5" /> : null}
        <span>{label}</span>
        <ArrowUpRight className="h-3.5 w-3.5" />
      </a>
    );
  }

  return (
    <Link className={className} href={href}>
      {Icone ? <Icone className="h-3.5 w-3.5" /> : null}
      <span>{label}</span>
    </Link>
  );
}

function canaisOficiais() {
  return [
    {
      href: normalizarUrl(process.env.NEXT_PUBLIC_MARKETPLACE_INSTAGRAM_URL),
      label: "Instagram",
      Icone: Camera,
    },
    {
      href: normalizarWhatsapp(
        process.env.NEXT_PUBLIC_MARKETPLACE_WHATSAPP_URL,
      ),
      label: "WhatsApp",
      Icone: MessageCircle,
    },
    {
      href: contatoEmailHref(),
      label: "E-mail",
      Icone: Mail,
    },
  ].filter(
    (canal): canal is { href: string; label: string; Icone: LucideIcon } =>
      Boolean(canal.href),
  );
}

function contatoEmailHref() {
  const email = process.env.NEXT_PUBLIC_MARKETPLACE_CONTACT_EMAIL?.trim();
  return email ? `mailto:${email}` : "";
}

function normalizarUrl(valor?: string) {
  const url = valor?.trim();
  if (!url) {
    return "";
  }

  return url.startsWith("http") ? url : `https://${url}`;
}

function normalizarWhatsapp(valor?: string) {
  const contato = valor?.trim();
  if (!contato) {
    return "";
  }

  if (contato.startsWith("http")) {
    return contato;
  }

  const somenteNumeros = contato.replace(/\D/g, "");
  return somenteNumeros ? `https://wa.me/${somenteNumeros}` : "";
}

/**
 * Marca publica do Marketplace.
 *
 * Usa o asset oficial da marca para manter a navegacao coerente com o produto.
 */
function MarketplaceBrand() {
  return (
    <Link
      aria-label="Ir para o inicio do Marketplace Hospedex"
      className="inline-flex min-w-0 items-center gap-2 rounded-2xl border border-cyan-300/25 bg-card/82 px-2.5 py-1.5 shadow-sm shadow-cyan-950/10 backdrop-blur-xl dark:bg-slate-950/72 dark:shadow-cyan-950/20"
      href="/"
    >
      <img
        alt=""
        className="h-9 w-9 shrink-0 rounded-xl bg-slate-950 p-1 object-contain dark:bg-transparent dark:p-0"
        src="/brand/hospedex-logo-white.png"
      />
      <span className="min-w-0 truncate text-lg font-bold leading-none tracking-normal">
        <span className="text-primary dark:text-cyan-300">Hospe</span>
        <span className="text-foreground dark:text-white">dex</span>
      </span>
    </Link>
  );
}
