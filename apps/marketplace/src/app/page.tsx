import {
  ArrowRight,
  BadgeCheck,
  BedDouble,
  Building2,
  CalendarDays,
  Hotel,
  House,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { GlassCard, StatusBadge, buttonVariants, cn } from "@hospedex/ui";

import { PublicShell } from "../components/layout/public-shell";
import { FavoriteButton } from "../components/properties/favorite-button";
import {
  carregarPropriedadesPublicas,
  obterDestinosEmDestaque,
  type DestinoEmDestaque,
  type PropriedadePublica,
} from "../lib/marketplace/data";

// A home precisa refletir hospedagens recem-publicadas sem cache antigo.
export const dynamic = "force-dynamic";

const categoriasMarketplace = [
  {
    description: "Casas completas para família, grupos e estadias longas.",
    href: "/propriedades?tipo=seasonal_home",
    icon: House,
    title: "Casas",
  },
  {
    description: "Hospedagem acolhedora com atendimento local.",
    href: "/propriedades?tipo=inn",
    icon: Building2,
    title: "Pousadas",
  },
  {
    description: "Operação compacta, quartos e estrutura profissional.",
    href: "/propriedades?tipo=small_hotel",
    icon: Hotel,
    title: "Hotéis compactos",
  },
] as const;

const beneficios = [
  {
    description: "Sem pagamento antecipado pelo Marketplace.",
    icon: ShieldCheck,
    title: "Reserva segura",
  },
  {
    description: "Fale com o anfitrião antes de confirmar.",
    icon: BadgeCheck,
    title: "Contato direto",
  },
  {
    description: "Fotos, regras, datas e valores em uma pagina.",
    icon: Sparkles,
    title: "Tudo organizado",
  },
] as const;

export default async function MarketplaceHomePage() {
  const resultado = await carregarPropriedadesPublicas({ limite: 8 });
  const propriedades = resultado.propriedades;
  const destinos = obterDestinosEmDestaque(propriedades);
  const propriedadesDestaque = propriedades.slice(0, 4);

  return (
    <PublicShell>
      <section className="marketplace-home-hero relative isolate overflow-hidden border-b border-white/10 text-white">
        <div
          aria-hidden="true"
          className="marketplace-home-hero-overlay absolute inset-0 -z-10"
        />

        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:py-14">
          <div className="mx-auto max-w-4xl text-center">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <StatusBadge
                className="border-cyan-300/30 bg-cyan-300/15 text-cyan-50"
                tone="info"
              >
                Hospedagens verificadas
              </StatusBadge>
              <StatusBadge
                className="border-white/20 bg-white/12 text-white"
                tone="neutral"
              >
                Casas, pousadas e pequenos hotéis
              </StatusBadge>
            </div>

            <h1 className="mt-5 break-words text-[2.35rem] font-semibold leading-[1.08] tracking-normal sm:text-5xl lg:text-[4rem]">
              Hospedagens para sua{" "}
              <span className="text-cyan-300">próxima viagem.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl break-words text-base leading-7 text-cyan-50/82 sm:text-lg">
              Busque casas, pousadas e hotéis independentes.
              <br className="sm:hidden" /> Veja fotos, regras e fale direto com
              o anfitrião.
            </p>
          </div>

          <div className="mx-auto mt-7 min-w-0 max-w-6xl">
            <MarketplaceSearchCard />
          </div>

          <div className="mx-auto mt-4 grid max-w-6xl gap-3 md:grid-cols-3">
            {beneficios.map((beneficio) => {
              const Icone = beneficio.icon;

              return (
                <GlassCard
                  className="marketplace-home-benefit flex min-h-24 items-center gap-4 p-4 text-left text-white"
                  key={beneficio.title}
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300">
                    <Icone className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 text-white">
                    <h2 className="text-sm font-semibold">{beneficio.title}</h2>
                    <p className="mt-1 break-words text-sm leading-5 text-cyan-50/80">
                      {beneficio.description}
                    </p>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </div>
      </section>

      <main className="overflow-x-hidden bg-background">
        <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
          <SectionHeader
            actionHref="/propriedades"
            actionLabel="Ver todas"
            description="Veja algumas opções disponíveis para sua próxima viagem."
            eyebrow="Hospedagens"
            title="Hospedagens em destaque"
          />

          {resultado.erro ? (
            <div className="mt-5 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {resultado.erro}
            </div>
          ) : null}

          {propriedadesDestaque.length ? (
            <div className="hospedex-horizontal-scroll -mx-4 mt-5 flex snap-x gap-4 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6">
              {propriedadesDestaque.map((propriedade) => (
                <div
                  className="w-[78vw] max-w-[19rem] shrink-0 snap-start sm:w-[18rem] lg:w-[19rem]"
                  key={propriedade.id}
                >
                  <PropertyShowcaseCard propriedade={propriedade} />
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5">
              <EmptyFeatureCard />
            </div>
          )}
        </section>

        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <SectionHeader
            actionHref="/propriedades"
            actionLabel="Ver todos"
            description="Encontre hospedagens por cidade."
            eyebrow="Destinos"
            title="Cidades com hospedagens publicadas"
          />

          <div
            className={cn(
              "mt-5 grid gap-3",
              destinos.length > 1 && "sm:grid-cols-2",
              destinos.length > 2 && "lg:grid-cols-3",
              destinos.length > 3 && "xl:grid-cols-4",
            )}
          >
            {destinos.length ? (
              destinos
                .slice(0, 4)
                .map((destino) => (
                  <DestinationCard
                    destino={destino}
                    key={`${destino.cidade}-${destino.estado}`}
                  />
                ))
            ) : (
              <CompactEmptyState
                description="Quando houver casas publicadas, os destinos aparecem aqui automaticamente."
                title="Nenhum destino publicado ainda"
              />
            )}
          </div>
        </section>

        <section
          className="mt-3 border-t border-border/70 bg-card/20"
          id="categorias"
        >
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
            <SectionHeader
              eyebrow="Categorias"
              title="Escolha o tipo de hospedagem"
            />
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {categoriasMarketplace.map((categoria) => {
                const Icone = categoria.icon;

                return (
                  <Link
                    className="group rounded-3xl border border-border bg-card/72 p-5 shadow-sm transition hover:border-primary/45 hover:bg-accent-soft/55"
                    href={categoria.href}
                    key={categoria.title}
                  >
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent-soft text-primary">
                      <Icone className="h-5 w-5" />
                    </span>
                    <h3 className="mt-5 text-lg font-semibold">
                      {categoria.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {categoria.description}
                    </p>
                    <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary transition group-hover:text-primary-hover">
                      Ver opções
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-background px-4 py-7 sm:px-6" id="proprietarios">
          <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[1.75rem] border border-border bg-[radial-gradient(circle_at_top_right,rgba(34,199,230,0.18),transparent_34%),linear-gradient(135deg,#ffffff,#f3fbfd_54%,#ddf5f8)] p-5 text-foreground shadow-2xl shadow-cyan-950/10 dark:border-cyan-200/15 dark:bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.22),transparent_34%),linear-gradient(135deg,#061323,#082338_52%,#064457)] dark:text-white dark:shadow-black/25 sm:p-6">
            <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_center,rgba(0,122,158,0.16),transparent_62%)] dark:bg-[radial-gradient(circle_at_center,rgba(103,232,249,0.22),transparent_62%)] lg:block" />
            <div className="relative grid gap-5 lg:grid-cols-[1.12fr_auto_auto] lg:items-center">
              <div>
                <span className="inline-flex rounded-full border border-primary/20 bg-accent-soft px-3 py-1 text-xs font-semibold text-primary dark:border-cyan-200/25 dark:bg-cyan-300/12 dark:text-cyan-100">
                  Para proprietários
                </span>
                <h2 className="mt-3 max-w-2xl text-balance text-2xl font-semibold tracking-normal text-foreground dark:text-white sm:text-[2rem] sm:leading-tight">
                  Transforme sua hospedagem em uma nova fonte de renda.
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground dark:text-slate-300">
                  Cadastre sua propriedade, organize reservas e receba
                  solicitações pelo Hospedex.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 lg:justify-center">
                <OwnerStep number="1" text="Cadastre" />
                <OwnerStep number="2" text="Publique" />
                <OwnerStep number="3" text="Receba solicitações" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:min-w-56 lg:grid-cols-1">
                <Link
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "justify-center bg-primary text-primary-foreground hover:bg-primary-hover dark:bg-cyan-300 dark:text-slate-950 dark:hover:bg-cyan-200",
                  )}
                  href="/anunciar"
                >
                  Anunciar hospedagem
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  className={cn(
                    buttonVariants({ size: "lg", variant: "outline" }),
                    "justify-center border-border bg-white text-foreground hover:border-primary/45 hover:text-primary dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:hover:text-cyan-100",
                  )}
                  href={
                    process.env.NEXT_PUBLIC_ADMIN_URL?.trim() ||
                    "https://hospedex.vercel.app"
                  }
                >
                  Acessar Gerenciamento
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}

function MarketplaceSearchCard() {
  return (
    <form
      action="/propriedades"
      className="marketplace-home-search grid w-full max-w-full gap-1 overflow-hidden rounded-2xl p-2 md:grid-cols-2 lg:grid-cols-[minmax(240px,1.35fr)_180px_180px_140px_auto] lg:items-center"
    >
      <SearchField
        icon={<MapPin className="h-5 w-5" />}
        label="Destino"
        name="cidade"
        placeholder="Para onde?"
      />
      <SearchField
        icon={<CalendarDays className="h-5 w-5" />}
        label="Entrada"
        name="dataInicio"
        type="date"
      />
      <SearchField
        icon={<CalendarDays className="h-5 w-5" />}
        label="Saida"
        name="dataFim"
        type="date"
      />
      <SearchField
        icon={<Users className="h-5 w-5" />}
        label="Hóspedes"
        min={1}
        name="hospedes"
        placeholder="2"
        type="number"
      />
      <button
        className="mt-2 inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-lg shadow-cyan-950/20 transition hover:bg-primary-hover dark:bg-cyan-400 dark:text-slate-950 dark:shadow-cyan-500/30 dark:hover:bg-cyan-300 md:col-span-2 lg:col-span-1 lg:mt-0 lg:w-auto"
        type="submit"
      >
        <Search className="h-4 w-4" />
        Buscar
      </button>
    </form>
  );
}

function SearchField({
  icon,
  label,
  min,
  name,
  placeholder,
  type = "text",
}: {
  icon: ReactNode;
  label: string;
  min?: number;
  name: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="grid min-w-0 gap-1 rounded-[1.5rem] px-4 py-3 text-cyan-50 transition hover:bg-white/8 lg:border-r lg:border-cyan-100/12 lg:last:border-r-0">
      <span className="text-xs font-bold uppercase tracking-normal text-cyan-200/78">
        {label}
      </span>
      <span className="relative block min-w-0">
        <span className="pointer-events-none absolute left-0 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center text-cyan-300">
          {icon}
        </span>
        <input
          className="w-full min-w-0 bg-transparent pl-8 text-sm font-semibold text-white outline-none placeholder:text-cyan-50/70"
          min={min}
          name={name}
          placeholder={placeholder}
          type={type}
        />
      </span>
    </label>
  );
}

function PropertyShowcaseCard({
  propriedade,
}: {
  propriedade: PropriedadePublica;
}) {
  return (
    <article className="group h-full overflow-hidden rounded-[1.35rem] border border-border bg-card shadow-sm transition hover:border-primary/45 dark:hover:border-cyan-300/40">
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
        <Link
          aria-label={`Ver ${propriedade.name}`}
          href={`/propriedades/${propriedade.slug}`}
        >
          {propriedade.coverImage ? (
            <img
              alt={propriedade.coverImage.alt}
              className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
              loading="lazy"
              src={propriedade.coverImage.url}
            />
          ) : (
            <div className="grid h-full place-items-center bg-cyan-500/10 text-sm font-semibold">
            Fotos em preparação
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950/78 to-transparent" />
        </Link>
        <StatusBadge
          className="absolute left-2.5 top-2.5 bg-cyan-500/85 text-[11px] text-white"
          tone="info"
        >
          {propriedade.propertyTypeLabel}
        </StatusBadge>
        <FavoriteButton
          className="absolute right-2.5 top-2.5"
          property={propriedade}
          variant="card"
        />
      </div>
      <div className="grid gap-2.5 p-3.5">
        <div className="flex items-start justify-between gap-3">
          <Link className="min-w-0" href={`/propriedades/${propriedade.slug}`}>
            <h3 className="line-clamp-1 text-base font-semibold transition group-hover:text-primary">
              {propriedade.name}
            </h3>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {propriedade.locationLabel}
            </p>
          </Link>
        </div>
        <p className="line-clamp-1 text-sm text-muted-foreground">
          {propriedade.headline}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {propriedade.maxGuests} hóspede
            {propriedade.maxGuests === 1 ? "" : "s"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <BedDouble className="h-3.5 w-3.5" />
            {propriedade.bedrooms} quarto{propriedade.bedrooms === 1 ? "" : "s"}
          </span>
          {propriedade.reviews.average ? (
            <span className="inline-flex items-center gap-1 text-warning dark:text-amber-300">
              <Star className="h-3.5 w-3.5 fill-current" />
              {propriedade.reviews.average.toFixed(1)}
            </span>
          ) : null}
        </div>
        <div className="flex items-end justify-between gap-3 border-t border-border pt-3">
          <div>
            <p className="text-xs text-muted-foreground">A partir de</p>
            <strong className="text-lg">
              {formatarPrecoCurto(propriedade.minPrice)}
            </strong>
            {propriedade.minPrice ? (
              <span className="text-xs text-muted-foreground">/noite</span>
            ) : null}
          </div>
          <Link
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition hover:text-primary-hover"
            href={`/propriedades/${propriedade.slug}`}
          >
            Ver
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function DestinationCard({ destino }: { destino: DestinoEmDestaque }) {
  return (
    <Link
      className="group relative overflow-hidden rounded-2xl border border-border bg-card/72 p-5 shadow-sm transition duration-300 hover:border-primary/45 hover:bg-accent-soft/55 hover:shadow-lg hover:shadow-cyan-950/10"
      href={`/propriedades?cidade=${encodeURIComponent(destino.cidade)}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_90%_10%,rgba(34,211,238,0.12),transparent_42%)]" />
      <div className="relative flex min-h-32 flex-col">
        <div className="flex items-start justify-between gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl border border-primary/20 bg-accent-soft text-primary">
            <MapPin className="h-5 w-5" />
          </span>
          <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
        </div>
        <div className="mt-5">
          <h3 className="line-clamp-1 text-lg font-semibold">
            {destino.cidade}
          </h3>
          <p className="mt-1 text-sm font-medium text-primary">
            {destino.estado}
          </p>
        </div>
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border/70 pt-3 text-xs">
          <span className="text-muted-foreground">
            {destino.total} hospedagem{destino.total === 1 ? "" : "s"}
          </span>
          <span className="font-semibold text-primary">Explorar</span>
        </div>
      </div>
    </Link>
  );
}

function SectionHeader({
  actionHref,
  actionLabel,
  description,
  eyebrow,
  title,
}: {
  actionHref?: string;
  actionLabel?: string;
  description?: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-normal text-primary">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-normal">{title}</h2>
        {description ? (
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actionHref && actionLabel ? (
        <Link
          className={cn(
            buttonVariants({ size: "sm", variant: "outline" }),
            "w-fit",
          )}
          href={actionHref}
        >
          {actionLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      ) : null}
    </div>
  );
}

function OwnerStep({ number, text }: { number: string; text: string }) {
  return (
    <div className="flex min-h-11 items-center gap-2 rounded-2xl border border-border bg-surface-raised px-3 py-2 text-foreground shadow-sm shadow-cyan-950/5 dark:border-white/14 dark:bg-white/[0.055] dark:text-white dark:shadow-none">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground dark:bg-cyan-300 dark:text-slate-950">
        {number}
      </span>
      <span className="whitespace-nowrap text-sm font-medium leading-tight">
        {text}
      </span>
    </div>
  );
}

function EmptyFeatureCard() {
  return (
    <div className="md:col-span-2 xl:col-span-4">
      <CompactEmptyState
        description="Assim que as primeiras casas forem publicadas, elas aparecem nesta vitrine."
        title="Nenhuma hospedagem publicada ainda"
      />
    </div>
  );
}

function CompactEmptyState({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <GlassCard className="p-5">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </GlassCard>
  );
}

function formatarPrecoCurto(valor: number | null) {
  if (!valor) return "Sob consulta";

  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(valor);
}
