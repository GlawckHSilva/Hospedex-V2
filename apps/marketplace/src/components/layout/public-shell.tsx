import {
  ArrowUpRight,
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
      { label: "Início", href: "/" },
      { label: "Hospedagens", href: "/propriedades" },
      { label: "Buscar", href: "/propriedades", icon: Search },
      { label: "Minhas reservas", href: "/minhas-reservas" },
      { label: "Favoritos", href: "/favoritos", icon: Heart },
    ],
  },
  {
    title: "Proprietários",
    links: [
      { label: "Anunciar hospedagem", href: "/anunciar" },
      { label: "Como funciona", href: "/#proprietarios" },
      {
        label: "Acessar Gerenciamento",
        href:
          process.env.NEXT_PUBLIC_ADMIN_URL?.trim() ||
          "https://hospedex.vercel.app",
        external: true,
      },
    ],
  },
  {
    title: "Informações",
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
      <footer className="bg-[#061323] text-white shadow-[0_-24px_80px_rgba(0,0,0,0.24)]">
        <div className="h-px bg-gradient-to-r from-transparent via-cyan-300/75 to-transparent" />
        <div className="mx-auto grid max-w-7xl gap-7 px-4 py-7 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.12fr_0.72fr_0.95fr_0.78fr] lg:gap-10 lg:py-8">
          <section className="max-w-sm">
            <FooterBrand />
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Casas, pousadas e pequenos hotéis independentes para sua próxima
              viagem.
            </p>

            {canais.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {canais.map(({ href, label, Icone }) => (
                  <a
                    aria-label={label}
                    className="inline-flex h-9 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 text-sm text-slate-300 transition hover:border-cyan-300/45 hover:bg-cyan-300/10 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/45"
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

          {footerNavigation.map((grupo) => (
            <nav aria-label={grupo.title} className="min-w-0" key={grupo.title}>
              <strong className="text-sm font-semibold text-white">
                {grupo.title}
              </strong>
              <ul className="mt-3 grid gap-1.5 text-sm">
                {grupo.links.map((link) => (
                  <li key={link.label}>
                    <FooterLink {...link} />
                  </li>
                ))}
              </ul>
              {grupo.title === "Informações" ? (
                <p className="mt-3 text-sm leading-5 text-slate-400">
                  Novidades por e-mail em breve.
                </p>
              ) : null}
            </nav>
          ))}
        </div>
        <div className="border-t border-white/10 bg-white/[0.025]">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-3 text-center text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:text-left">
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
    "inline-flex min-h-7 max-w-full items-center gap-1.5 rounded-lg text-slate-300 transition hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/45";

  if (external) {
    return (
      <a
        className={className}
        href={href}
        rel="noreferrer noopener"
        target="_blank"
      >
        {Icone ? <Icone className="h-3.5 w-3.5" /> : null}
        <span className="whitespace-nowrap">{label}</span>
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

function FooterBrand() {
  return (
    <Link
      aria-label="Ir para o início do Marketplace Hospedex"
      className="inline-flex min-w-0 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-2.5 py-1.5 shadow-sm shadow-black/20 backdrop-blur-xl transition hover:border-cyan-300/35"
      href="/"
    >
      <img
        alt=""
        className="h-9 w-9 shrink-0 rounded-xl object-contain"
        src="/brand/hospedex-logo-white.png"
      />
      <span className="min-w-0 truncate text-lg font-bold leading-none tracking-normal">
        <span className="text-cyan-300">Hospe</span>
        <span className="text-white">dex</span>
      </span>
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
