import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarDays,
  Heart,
  Hotel,
  House,
  MapPin,
  ShieldCheck,
  Sparkles,
  Users
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { FadeIn, GlassCard, StatusBadge, buttonVariants, cn } from "@hospedex/ui";

import { PublicShell } from "../components/layout/public-shell";
import { PropertySearchForm } from "../components/marketplace/property-search-form";
import {
  carregarPropriedadesPublicas,
  obterDestinosEmDestaque,
  type DestinoEmDestaque,
  type PropriedadePublica
} from "../lib/marketplace/data";

const HERO_FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1800&q=80";

// A home depende das hospedagens publicadas no banco. Leitura dinâmica evita
// exibir casa removida ou recém-publicada com cache antigo.
export const dynamic = "force-dynamic";

const categoriasMarketplace = [
  {
    title: "Casas de temporada",
    description: "Espaços completos para famílias, grupos e estadias com mais autonomia.",
    href: "/propriedades?tipo=seasonal_home",
    icon: House
  },
  {
    title: "Pousadas",
    description: "Hospedagens charmosas com atendimento acolhedor e experiências locais.",
    href: "/propriedades?tipo=inn",
    icon: Building2
  },
  {
    title: "Pequenos hotéis",
    description: "Estrutura profissional, operação compacta e atenção aos detalhes.",
    href: "/propriedades?tipo=small_hotel",
    icon: Hotel
  }
] as const;

const beneficios = [
  {
    title: "Contato direto",
    description: "Converse com o anfitrião antes de reservar.",
    icon: BadgeCheck
  },
  {
    title: "Informações organizadas",
    description: "Fotos, regras e valores claros em uma só página.",
    icon: Sparkles
  },
  {
    title: "Solicitação acompanhada",
    description: "Acompanhe sua solicitação com mais segurança.",
    icon: ShieldCheck
  }
] as const;

export default async function MarketplaceHomePage() {
  const resultado = await carregarPropriedadesPublicas({ limite: 6 });
  const propriedades = resultado.propriedades;
  const destinos = obterDestinosEmDestaque(propriedades);
  const destaque = propriedades[0] ?? null;
  const heroImage = destaque?.coverImage?.url ?? HERO_FALLBACK_IMAGE;

  return (
    <PublicShell>
      <section className="relative isolate overflow-hidden border-b">
        <div
          className="absolute inset-0 -z-20 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(2,6,23,0.9),rgba(8,47,73,0.68),rgba(2,6,23,0.5))]" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_68%_20%,rgba(34,211,238,0.16),transparent_32%)]" />

        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 text-white sm:px-6 lg:py-10">
          <FadeIn className="max-w-5xl space-y-5">
            <div className="flex flex-wrap gap-2">
              <StatusBadge className="border-white/20 bg-white/15 text-white" tone="neutral">
                Hospedagens independentes
              </StatusBadge>
              <StatusBadge className="border-cyan-200/30 bg-cyan-300/20 text-cyan-50" tone="info">
                Reserva direta
              </StatusBadge>
              <StatusBadge className="border-white/20 bg-white/15 text-white" tone="neutral">
                Casas, pousadas e pequenos hotéis
              </StatusBadge>
            </div>

            <div className="max-w-4xl space-y-3">
              <h1 className="text-4xl font-semibold leading-tight tracking-normal sm:text-5xl lg:text-6xl">
                Encontre hospedagens independentes com reserva{" "}
                <span className="text-cyan-300">simples e direta.</span>
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-cyan-50/85 sm:text-base">
                Casas de temporada, pousadas e pequenos hotéis publicados por anfitriões.
                Conecte-se direto, escolha seu destino e viva experiências incríveis.
              </p>
            </div>

            <PropertySearchForm />

            <div className="grid gap-3 text-sm text-cyan-50/85 md:grid-cols-3">
              <MetricCard
                icon={<House className="h-5 w-5" />}
                label={`hospedagem${propriedades.length === 1 ? "" : "s"} publicada${propriedades.length === 1 ? "" : "s"}`}
                value={String(propriedades.length)}
              />
              <MetricCard
                icon={<MapPin className="h-5 w-5" />}
                label={`destino${destinos.length === 1 ? "" : "s"} disponível${destinos.length === 1 ? "" : "s"}`}
                value={String(destinos.length)}
              />
              <MetricCard
                icon={<ShieldCheck className="h-5 w-5" />}
                label="reserva com anfitrião"
                value="Direto"
              />
            </div>
          </FadeIn>
        </div>
      </section>

      <main className="border-b bg-background/95">
        <div className="mx-auto grid max-w-7xl gap-0 px-4 py-5 sm:px-6 lg:grid-cols-[0.78fr_1.72fr]">
          <section className="border-b pb-5 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-6" id="destinos">
            <SectionHeader
              actionHref="/propriedades"
              actionLabel="Ver todos"
              eyebrow="Destinos disponíveis"
              title="Explore cidades com hospedagens publicadas."
            />
            <div className="mt-4 grid gap-4">
              {destinos.length ? (
                destinos.slice(0, 2).map((destino) => (
                  <DestinationCard destino={destino} key={`${destino.cidade}-${destino.estado}`} />
                ))
              ) : (
                <CompactEmptyState
                  description="Assim que novas hospedagens forem publicadas, os destinos aparecerão aqui."
                  title="Nenhum destino disponível ainda"
                />
              )}
            </div>
          </section>

          <section className="pt-5 lg:pl-6 lg:pt-0">
            <SectionHeader
              actionHref="/propriedades"
              actionLabel="Ver todos"
              eyebrow="Hospedagens"
              title="Hospedagens em destaque"
            />
            {resultado.erro ? (
              <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                {resultado.erro}
              </div>
            ) : null}
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              {propriedades.length ? (
                propriedades.slice(0, 2).map((propriedade) => (
                  <FeaturedPropertyCard key={propriedade.id} propriedade={propriedade} />
                ))
              ) : (
                <CompactEmptyState
                  description="As primeiras hospedagens aparecerão aqui em breve."
                  title="Nenhuma hospedagem publicada ainda"
                />
              )}
            </div>
          </section>
        </div>

        <div className="mx-auto grid max-w-7xl gap-0 border-t px-4 py-5 sm:px-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="border-b pb-5 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-6" id="categorias">
            <SectionHeader eyebrow="Categorias" title="Escolha o tipo de hospedagem" />
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {categoriasMarketplace.map((categoria) => {
                const Icone = categoria.icon;

                return (
                  <Link className="glass-card group p-4 transition hover:border-primary/40" href={categoria.href} key={categoria.title}>
                    <span className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
                      <Icone className="h-5 w-5" />
                    </span>
                    <h3 className="mt-4 text-sm font-semibold">{categoria.title}</h3>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                      {categoria.description}
                    </p>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                      Ver opções
                      <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="pt-5 lg:pl-6 lg:pt-0" id="por-que">
            <SectionHeader eyebrow="Benefícios" title="Por que reservar pelo Hospedex?" />
            <div className="mt-4 grid gap-3">
              {beneficios.map((beneficio) => {
                const Icone = beneficio.icon;

                return (
                  <GlassCard className="flex gap-3 p-4" key={beneficio.title}>
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                      <Icone className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold">{beneficio.title}</h3>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {beneficio.description}
                      </p>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          </section>
        </div>

        <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6" id="proprietarios">
          <GlassCard className="grid gap-5 p-5 lg:grid-cols-[1.2fr_1.6fr_auto] lg:items-center">
            <div>
              <StatusBadge tone="info">Para proprietários</StatusBadge>
              <h2 className="mt-3 text-2xl font-semibold tracking-normal">
                Anuncie sua propriedade no Hospedex
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Publique sua casa, pousada ou pequeno hotel e gerencie reservas,
                calendário, hóspedes e financeiro em um só lugar.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <OwnerStep number="1" text="Cadastre sua propriedade" />
              <OwnerStep number="2" text="Publique no marketplace" />
              <OwnerStep number="3" text="Receba solicitações" />
            </div>
            <div className="grid gap-3">
              <Link className={cn(buttonVariants({ size: "lg" }), "min-w-44 justify-center")} href="/anunciar">
                Quero anunciar
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                className={cn(buttonVariants({ size: "lg", variant: "outline" }), "min-w-44 justify-center")}
                href="https://hospedex.vercel.app/cadastro"
              >
                Conhecer a gestão
              </Link>
            </div>
          </GlassCard>
        </section>
      </main>
    </PublicShell>
  );
}

function MetricCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/20 bg-slate-950/45 p-3 shadow-lg shadow-cyan-950/20 backdrop-blur-xl">
      <span className="grid h-10 w-10 place-items-center rounded-md bg-cyan-300/15 text-cyan-200">
        {icon}
      </span>
      <div>
        <strong className="block text-sm text-white">{value} {label}</strong>
        <span className="text-xs text-cyan-50/70">Mais confiança e transparência</span>
      </div>
    </div>
  );
}

function SectionHeader({
  actionHref,
  actionLabel,
  eyebrow,
  title
}: {
  actionHref?: string;
  actionLabel?: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-normal text-primary">{eyebrow}</p>
        <h2 className="mt-1 text-xl font-semibold tracking-normal">{title}</h2>
      </div>
      {actionHref && actionLabel ? (
        <Link className={cn(buttonVariants({ size: "sm", variant: "outline" }), "hidden sm:inline-flex")} href={actionHref}>
          {actionLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      ) : null}
    </div>
  );
}

function DestinationCard({ destino }: { destino: DestinoEmDestaque }) {
  return (
    <Link
      className="glass-card group grid overflow-hidden transition hover:border-primary/40 sm:grid-cols-[0.9fr_1.1fr]"
      href={`/propriedades?cidade=${encodeURIComponent(destino.cidade)}`}
    >
      <div className="relative min-h-40 bg-secondary">
        {destino.imagem ? (
          <img
            alt={`Hospedagem em ${destino.cidade}`}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            loading="lazy"
            src={destino.imagem.url}
          />
        ) : (
          <div className="h-full w-full bg-[linear-gradient(135deg,var(--secondary),var(--accent))]" />
        )}
      </div>
      <div className="grid content-between gap-6 p-4">
        <div>
          <h3 className="text-lg font-semibold">{destino.cidade}</h3>
          <p className="text-sm text-muted-foreground">{destino.estado}</p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">
            {destino.total} hospedagem{destino.total === 1 ? "" : "s"}
          </span>
          <ArrowRight className="h-4 w-4 text-primary transition group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}

function FeaturedPropertyCard({ propriedade }: { propriedade: PropriedadePublica }) {
  return (
    <Link
      className="glass-card group grid overflow-hidden transition hover:border-primary/40 sm:grid-cols-[0.9fr_1.1fr]"
      href={`/propriedades/${propriedade.slug}`}
    >
      <div className="relative min-h-48 bg-secondary">
        {propriedade.coverImage ? (
          <img
            alt={propriedade.coverImage.alt}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            loading="lazy"
            src={propriedade.coverImage.url}
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-[linear-gradient(135deg,var(--secondary),var(--accent))] text-sm font-semibold">
            Fotos em preparação
          </div>
        )}
        <StatusBadge className="absolute right-3 top-3 bg-cyan-500/80 text-white" tone="info">
          {propriedade.propertyTypeLabel}
        </StatusBadge>
      </div>
      <div className="grid gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold leading-tight">{propriedade.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{propriedade.locationLabel}</p>
          </div>
          <span className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground">
            <Heart className="h-4 w-4" />
          </span>
        </div>
        <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
          {propriedade.headline}
        </p>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {propriedade.maxGuests} hóspedes
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            Reserva direta
          </span>
        </div>
        <div className="mt-auto flex items-end justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">A partir de</p>
            <strong className="text-2xl text-foreground">{formatarPreco(propriedade.minPrice)}</strong>
            {propriedade.minPrice ? <span className="ml-1 text-xs text-muted-foreground">/noite</span> : null}
          </div>
          <span className="inline-flex items-center gap-2 rounded-md border border-primary/40 px-3 py-2 text-xs font-semibold text-primary">
            Ver hospedagem
          </span>
        </div>
      </div>
    </Link>
  );
}

function OwnerStep({ number, text }: { number: string; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card/50 p-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
        {number}
      </span>
      <span className="text-sm font-medium">{text}</span>
    </div>
  );
}

function CompactEmptyState({ description, title }: { description: string; title: string }) {
  return (
    <GlassCard className="p-5">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
    </GlassCard>
  );
}

function formatarPreco(valor: number | null) {
  if (!valor) return "Sob consulta";

  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    maximumFractionDigits: 0,
    style: "currency"
  }).format(valor);
}
