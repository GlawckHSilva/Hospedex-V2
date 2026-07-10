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
  const propriedadesDestaque = propriedades.slice(0, 4);

  return (
    <PublicShell>
      <section className="relative isolate overflow-hidden border-b border-white/10 bg-slate-950 text-white">
        <div className="absolute inset-0 -z-20 bg-[linear-gradient(135deg,#020617_0%,#06172a_52%,#020817_100%)]" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_76%_22%,rgba(6,182,212,0.18),transparent_30%),radial-gradient(circle_at_14%_82%,rgba(14,116,144,0.12),transparent_28%)]" />

        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:py-14">
          <div className="mx-auto max-w-4xl text-center">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <StatusBadge className="border-cyan-300/30 bg-cyan-300/15 text-cyan-50" tone="info">
                Hospedagens verificadas
              </StatusBadge>
              <StatusBadge className="border-white/20 bg-white/12 text-white" tone="neutral">
                Casas, pousadas e pequenos hoteis
              </StatusBadge>
            </div>

            <h1 className="mt-5 break-words text-[2.35rem] font-semibold leading-[1.08] tracking-normal sm:text-5xl lg:text-[4rem]">
              Hospedagens para sua <span className="text-cyan-300">proxima viagem.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl break-words text-base leading-7 text-cyan-50/82 sm:text-lg">
              Busque casas, pousadas e hoteis independentes.
              <br className="sm:hidden" /> Veja fotos, regras e fale direto com
              o anfitriao.
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
                  className="flex min-h-24 items-center gap-4 border-cyan-300/15 bg-slate-900/45 p-4 text-left text-white"
                  key={beneficio.title}
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300">
                    <Icone className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold">{beneficio.title}</h2>
                    <p className="mt-1 break-words text-sm leading-5 text-cyan-50/65">
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
            description="Veja algumas opcoes disponiveis para sua proxima viagem."
            eyebrow="Hospedagens"
            title="Hospedagens em destaque"
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
      className="grid w-full max-w-full gap-1 overflow-hidden rounded-2xl border border-cyan-300/18 bg-slate-950/55 p-2 shadow-2xl shadow-cyan-950/35 backdrop-blur-2xl md:grid-cols-2 lg:grid-cols-[minmax(240px,1.35fr)_180px_180px_140px_auto] lg:items-center"
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
        className="mt-2 inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-6 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/30 transition hover:bg-cyan-300 md:col-span-2 lg:col-span-1 lg:mt-0 lg:w-auto"
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
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              {propriedade.maxGuests} hospede{propriedade.maxGuests === 1 ? "" : "s"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BedDouble className="h-3.5 w-3.5" />
              {propriedade.bedrooms} quarto{propriedade.bedrooms === 1 ? "" : "s"}
            </span>
            {propriedade.reviews.average ? (
              <span className="inline-flex items-center gap-1 text-amber-300">
                <Star className="h-3.5 w-3.5 fill-current" />
                {propriedade.reviews.average.toFixed(1)}
              </span>
            ) : null}
          </div>
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
  description,
  eyebrow,
  title
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
        <p className="text-xs font-bold uppercase tracking-normal text-cyan-300">{eyebrow}</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-normal">{title}</h2>
        {description ? (
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        ) : null}
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
