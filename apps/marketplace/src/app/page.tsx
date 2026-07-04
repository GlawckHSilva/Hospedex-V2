import {
  ArrowRight,
  BadgeCheck,
  BedDouble,
  Building2,
  CalendarDays,
  Heart,
  Hotel,
  House,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Users
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import {
  GlassCard,
  StatusBadge,
  buttonVariants,
  cn
} from "@hospedex/ui";

import { PublicShell } from "../components/layout/public-shell";
import {
  carregarPropriedadesPublicas,
  obterDestinosEmDestaque,
  type DestinoEmDestaque,
  type PropriedadePublica
} from "../lib/marketplace/data";

const HERO_FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1800&q=80";

// A home precisa refletir hospedagens recem-publicadas sem cache antigo.
export const dynamic = "force-dynamic";

const categoriasMarketplace = [
  {
    description: "Casas completas para familia, grupos e estadias longas.",
    href: "/propriedades?tipo=seasonal_home",
    icon: House,
    title: "Casas"
  },
  {
    description: "Hospedagem acolhedora com atendimento local.",
    href: "/propriedades?tipo=inn",
    icon: Building2,
    title: "Pousadas"
  },
  {
    description: "Operacao compacta, quartos e estrutura profissional.",
    href: "/propriedades?tipo=small_hotel",
    icon: Hotel,
    title: "Hoteis compactos"
  }
] as const;

const beneficios = [
  {
    description: "Sem pagamento antecipado pelo Marketplace.",
    icon: ShieldCheck,
    title: "Reserva segura"
  },
  {
    description: "Fale com o anfitriao antes de confirmar.",
    icon: BadgeCheck,
    title: "Contato direto"
  },
  {
    description: "Fotos, regras, datas e valores em uma pagina.",
    icon: Sparkles,
    title: "Tudo organizado"
  }
] as const;

export default async function MarketplaceHomePage() {
  const resultado = await carregarPropriedadesPublicas({ limite: 8 });
  const propriedades = resultado.propriedades;
  const destinos = obterDestinosEmDestaque(propriedades);
  const destaque = propriedades[0] ?? null;
  const heroImage = destaque?.coverImage?.url ?? HERO_FALLBACK_IMAGE;
  const propriedadesDestaque = propriedades.slice(0, 4);

  return (
    <PublicShell>
      <section className="relative isolate overflow-hidden border-b border-white/10 bg-slate-950 text-white">
        <div className="absolute inset-0 -z-30">
          <img
            alt=""
            className="h-full w-full object-cover"
            src={heroImage}
          />
        </div>
        <div className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(2,6,23,0.96)_0%,rgba(2,6,23,0.78)_42%,rgba(2,6,23,0.32)_100%)]" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_72%_24%,rgba(34,211,238,0.26),transparent_30%),linear-gradient(180deg,rgba(2,6,23,0.08),rgba(2,6,23,0.92))]" />

        <div className="mx-auto grid min-w-0 max-w-7xl gap-8 px-4 pb-10 pt-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end lg:pb-16 lg:pt-16">
          <div className="min-w-0 max-w-4xl">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge className="border-cyan-300/30 bg-cyan-300/15 text-cyan-50" tone="info">
                Hospedagens verificadas
              </StatusBadge>
              <StatusBadge className="hidden border-white/20 bg-white/12 text-white sm:inline-flex" tone="neutral">
                Casas, pousadas e pequenos hoteis
              </StatusBadge>
            </div>

            <h1 className="mt-5 max-w-4xl break-words text-[2rem] font-semibold leading-[1.08] tracking-normal sm:text-6xl lg:text-7xl">
              Hospedagens para sua proxima viagem.
            </h1>
            <p className="mt-5 max-w-2xl break-words text-base leading-7 text-cyan-50/82 sm:text-lg">
              Busque casas, pousadas e hoteis independentes.
              <br className="sm:hidden" /> Veja fotos, regras e fale direto com
              o anfitriao.
            </p>

            <div className="mt-8 max-w-5xl">
              <MarketplaceSearchCard />
            </div>
          </div>

          <div className="hidden lg:block">
            <HeroPreview propriedade={destaque} />
          </div>
        </div>
      </section>

      <main className="overflow-x-hidden bg-background">
        <section className="mx-auto grid max-w-7xl gap-3 px-4 py-5 sm:px-6 lg:grid-cols-3">
          {beneficios.map((beneficio) => {
            const Icone = beneficio.icon;

            return (
              <GlassCard className="flex items-center gap-4 p-4" key={beneficio.title}>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-cyan-400/10 text-cyan-200">
                  <Icone className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold">{beneficio.title}</h2>
                  <p className="mt-1 break-words text-sm leading-5 text-muted-foreground">
                    {beneficio.description}
                  </p>
                </div>
              </GlassCard>
            );
          })}
        </section>

        <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
          <SectionHeader
            actionHref="/propriedades"
            actionLabel="Ver todas"
            eyebrow="Hospedagens"
            title="Destaques para sua proxima viagem"
          />

          {resultado.erro ? (
            <div className="mt-5 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {resultado.erro}
            </div>
          ) : null}

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {propriedadesDestaque.length ? (
              propriedadesDestaque.map((propriedade) => (
                <PropertyShowcaseCard key={propriedade.id} propriedade={propriedade} />
              ))
            ) : (
              <EmptyFeatureCard />
            )}
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[0.9fr_1.35fr]">
          <div>
            <SectionHeader
              actionHref="/propriedades"
              actionLabel="Explorar"
              eyebrow="Destinos"
              title="Cidades com hospedagens publicadas"
            />
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              Atalhos visuais para encontrar rapidamente hospedagens por cidade.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {destinos.length ? (
              destinos.slice(0, 4).map((destino) => (
                <DestinationCard destino={destino} key={`${destino.cidade}-${destino.estado}`} />
              ))
            ) : (
              <CompactEmptyState
                description="Quando houver casas publicadas, os destinos aparecem aqui automaticamente."
                title="Nenhum destino publicado ainda"
              />
            )}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6" id="categorias">
          <SectionHeader eyebrow="Categorias" title="Escolha o tipo de hospedagem" />
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {categoriasMarketplace.map((categoria) => {
              const Icone = categoria.icon;

              return (
                <Link
                  className="group rounded-3xl border border-border bg-card/72 p-5 shadow-sm transition hover:border-cyan-300/40 hover:bg-cyan-400/5"
                  href={categoria.href}
                  key={categoria.title}
                >
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-400/10 text-cyan-200">
                    <Icone className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold">{categoria.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {categoria.description}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-cyan-200">
                    Ver opcoes
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-8 pt-5 sm:px-6" id="proprietarios">
          <GlassCard className="relative overflow-hidden p-5 sm:p-6">
            <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.18),transparent_58%)] lg:block" />
            <div className="relative grid gap-6 lg:grid-cols-[1.1fr_1fr_auto] lg:items-center">
              <div>
                <StatusBadge tone="info">Para proprietarios</StatusBadge>
                <h2 className="mt-3 text-2xl font-semibold tracking-normal">
                  Tem uma casa, pousada ou pequeno hotel?
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Publique sua hospedagem e gerencie solicitacoes, calendario,
                  pagamentos manuais e operacao no painel Hospedex.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <OwnerStep number="1" text="Cadastre" />
                <OwnerStep number="2" text="Publique" />
                <OwnerStep number="3" text="Receba pedidos" />
              </div>
              <div className="grid gap-3">
                <Link className={cn(buttonVariants({ size: "lg" }), "justify-center")} href="/anunciar">
                  Anunciar
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  className={cn(buttonVariants({ size: "lg", variant: "outline" }), "justify-center")}
                  href="https://hospedex.vercel.app/cadastro"
                >
                  Ir para gestao
                </Link>
              </div>
            </div>
          </GlassCard>
        </section>
      </main>
    </PublicShell>
  );
}

function MarketplaceSearchCard() {
  return (
    <form
      action="/propriedades"
      className="grid w-full max-w-full gap-1 overflow-hidden rounded-[2rem] border border-cyan-300/18 bg-slate-950/55 p-2 shadow-2xl shadow-cyan-950/35 backdrop-blur-2xl lg:grid-cols-[minmax(0,1.25fr)_170px_170px_140px_auto] lg:items-center"
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
        label="Hospedes"
        min={1}
        name="hospedes"
        placeholder="2"
        type="number"
      />
      <button
        className="mt-2 inline-flex h-14 w-full items-center justify-center gap-2 rounded-[1.5rem] bg-cyan-400 px-6 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/30 transition hover:bg-cyan-300 lg:mt-0 lg:w-auto"
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
  type = "text"
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
      <span className="text-xs font-bold uppercase tracking-normal text-cyan-200/78">{label}</span>
      <span className="flex items-center gap-2">
        <span className="text-cyan-300">{icon}</span>
        <input
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-cyan-50/70"
          min={min}
          name={name}
          placeholder={placeholder}
          type={type}
        />
      </span>
    </label>
  );
}

function HeroPreview({ propriedade }: { propriedade: PropriedadePublica | null }) {
  if (!propriedade) {
    return (
      <GlassCard className="p-5 text-white">
        <h2 className="text-xl font-semibold">Primeiras hospedagens em breve</h2>
        <p className="mt-2 text-sm leading-6 text-cyan-50/70">
          Quando houver casas publicadas, um destaque visual aparece aqui.
        </p>
      </GlassCard>
    );
  }

  return (
    <Link
      className="group block overflow-hidden rounded-[2rem] border border-white/18 bg-slate-950/68 shadow-2xl shadow-cyan-950/35 backdrop-blur-xl"
      href={`/propriedades/${propriedade.slug}`}
    >
      <div className="relative h-80 overflow-hidden">
        {propriedade.coverImage ? (
          <img
            alt={propriedade.coverImage.alt}
            className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
            src={propriedade.coverImage.url}
          />
        ) : (
          <div className="h-full bg-cyan-500/10" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/18 to-transparent" />
        <div className="absolute left-4 top-4 flex gap-2">
          <StatusBadge className="bg-cyan-500/80 text-white" tone="info">
            Destaque
          </StatusBadge>
          <StatusBadge className="bg-white/16 text-white" tone="neutral">
            Reserva direta
          </StatusBadge>
        </div>
        <span
          aria-label="Favoritar hospedagem"
          className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-white/16 text-white backdrop-blur transition hover:bg-white/24"
        >
          <Heart className="h-5 w-5" />
        </span>
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">{propriedade.name}</h2>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-cyan-50/75">
              <MapPin className="h-4 w-4" />
              {propriedade.locationLabel}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-cyan-50/60">A partir de</p>
            <strong className="text-xl text-cyan-200">
              {formatarPrecoCurto(propriedade.minPrice)}
            </strong>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2 text-sm text-cyan-50/78">
          <MiniMetric icon={<Users />} text={`${propriedade.maxGuests} hospedes`} />
          <MiniMetric icon={<BedDouble />} text={`${propriedade.bedrooms} quartos`} />
          <MiniMetric icon={<Star />} text="Anfitriao local" />
        </div>
      </div>
    </Link>
  );
}

function PropertyShowcaseCard({ propriedade }: { propriedade: PropriedadePublica }) {
  return (
    <Link className="group block" href={`/propriedades/${propriedade.slug}`}>
      <article className="overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-sm transition hover:border-cyan-300/40">
        <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
          {propriedade.coverImage ? (
            <img
              alt={propriedade.coverImage.alt}
              className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
              loading="lazy"
              src={propriedade.coverImage.url}
            />
          ) : (
            <div className="grid h-full place-items-center bg-cyan-500/10 text-sm font-semibold">
              Fotos em preparacao
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/78 to-transparent" />
          <StatusBadge className="absolute left-3 top-3 bg-cyan-500/85 text-white" tone="info">
            {propriedade.propertyTypeLabel}
          </StatusBadge>
        </div>
        <div className="grid gap-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="line-clamp-1 text-base font-semibold">{propriedade.name}</h3>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {propriedade.locationLabel}
              </p>
            </div>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border text-muted-foreground">
              <Heart className="h-4 w-4" />
            </span>
          </div>
          <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
            {propriedade.headline}
          </p>
          <div className="flex items-end justify-between gap-3 border-t border-border pt-3">
            <div>
              <p className="text-xs text-muted-foreground">A partir de</p>
              <strong className="text-lg">{formatarPrecoCurto(propriedade.minPrice)}</strong>
              {propriedade.minPrice ? <span className="text-xs text-muted-foreground">/noite</span> : null}
            </div>
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-200">
              Ver
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

function DestinationCard({ destino }: { destino: DestinoEmDestaque }) {
  return (
    <Link
      className="group relative min-h-48 overflow-hidden rounded-[1.75rem] border border-border bg-card"
      href={`/propriedades?cidade=${encodeURIComponent(destino.cidade)}`}
    >
      {destino.imagem ? (
        <img
          alt={`Hospedagem em ${destino.cidade}`}
          className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
          loading="lazy"
          src={destino.imagem.url}
        />
      ) : (
        <div className="absolute inset-0 bg-cyan-500/10" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/28 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4 text-white">
        <h3 className="text-xl font-semibold">{destino.cidade}</h3>
        <p className="mt-1 text-sm text-cyan-50/76">{destino.estado}</p>
        <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/14 px-3 py-1 text-xs font-semibold backdrop-blur">
          {destino.total} hospedagem{destino.total === 1 ? "" : "s"}
          <ArrowRight className="h-3.5 w-3.5" />
        </p>
      </div>
    </Link>
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
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-normal text-cyan-300">{eyebrow}</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-normal">{title}</h2>
      </div>
      {actionHref && actionLabel ? (
        <Link className={cn(buttonVariants({ size: "sm", variant: "outline" }), "w-fit")} href={actionHref}>
          {actionLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      ) : null}
    </div>
  );
}

function MiniMetric({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <span className="flex items-center gap-1.5 rounded-xl border border-white/12 bg-white/8 px-2.5 py-2 text-xs">
      <span className="text-cyan-200 [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
      {text}
    </span>
  );
}

function OwnerStep({ number, text }: { number: string; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-background/55 p-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-cyan-400/10 text-sm font-semibold text-cyan-200">
        {number}
      </span>
      <span className="text-sm font-medium">{text}</span>
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

function CompactEmptyState({ description, title }: { description: string; title: string }) {
  return (
    <GlassCard className="p-5">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
    </GlassCard>
  );
}

function formatarPrecoCurto(valor: number | null) {
  if (!valor) return "Sob consulta";

  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    maximumFractionDigits: 0,
    style: "currency"
  }).format(valor);
}
