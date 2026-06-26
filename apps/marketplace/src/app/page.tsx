import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Hotel,
  House,
  MapPin,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import Link from "next/link";

import {
  FadeIn,
  GlassCard,
  GlassPanel,
  PremiumEmptyState,
  StatusBadge,
  buttonVariants,
  cn
} from "@hospedex/ui";

import { PublicShell } from "../components/layout/public-shell";
import { PropertySearchForm } from "../components/marketplace/property-search-form";
import { PropertyCard } from "../components/properties/property-card";
import {
  carregarPropriedadesPublicas,
  obterDestinosEmDestaque
} from "../lib/marketplace/data";

const HERO_FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1800&q=80";

const motivosReserva = [
  {
    title: "Canal direto",
    description: "Contato claro com hospedagens independentes, sem ruído de intermediários.",
    icon: BadgeCheck
  },
  {
    title: "Operação organizada",
    description: "Propriedades publicadas a partir da gestão multi-tenant da V2.",
    icon: ShieldCheck
  },
  {
    title: "Curadoria visual",
    description: "Fotos, estrutura e comodidades reunidas em uma experiência premium.",
    icon: Sparkles
  }
] as const;

const categoriasMarketplace = [
  {
    title: "Casas de temporada",
    description: "Espaços completos para famílias, grupos e estadias com mais autonomia.",
    href: "/propriedades?tipo=seasonal_home",
    icon: House
  },
  {
    title: "Pousadas",
    description: "Hospedagens independentes com atendimento próximo e operação organizada.",
    href: "/propriedades?tipo=inn",
    icon: Building2
  },
  {
    title: "Hotéis compactos",
    description: "Pequenos hotéis preparados para receber reservas com gestão profissional.",
    href: "/propriedades?tipo=small_hotel",
    icon: Hotel
  }
] as const;

export default async function MarketplaceHomePage() {
  const resultado = await carregarPropriedadesPublicas({ limite: 6 });
  const propriedades = resultado.propriedades;
  const destaque = propriedades[0] ?? null;
  const destinos = obterDestinosEmDestaque(propriedades);
  const heroImage = destaque?.coverImage?.url ?? HERO_FALLBACK_IMAGE;

  return (
    <PublicShell>
      <section className="premium-grid-bg relative isolate overflow-hidden border-b">
        <div
          className="absolute inset-0 -z-20 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(3,7,18,0.82),rgba(8,47,73,0.58),rgba(8,145,178,0.18))]" />
        <div className="mx-auto grid min-h-[calc(100svh-7rem)] max-w-7xl content-center gap-10 px-4 py-16 text-white sm:px-6 lg:py-20">
          <FadeIn className="max-w-4xl space-y-7">
            <div className="flex flex-wrap gap-2">
              <StatusBadge className="border-white/20 bg-white/15 text-white" tone="neutral">
                Marketplace V2
              </StatusBadge>
              <StatusBadge className="border-cyan-200/30 bg-cyan-300/20 text-cyan-50" tone="info">
                Hospedagens independentes
              </StatusBadge>
            </div>
            <div className="space-y-5">
              <h1 className="max-w-3xl text-5xl font-semibold leading-none tracking-normal sm:text-6xl lg:text-7xl">
                Hospedex
              </h1>
              <p className="max-w-2xl text-base leading-8 text-cyan-50/85 sm:text-lg">
                Encontre casas, pousadas e pequenos hotéis publicados por
                proprietários que operam com a gestão Hospedex.
              </p>
            </div>
            <PropertySearchForm />
            <div className="grid max-w-3xl gap-3 text-sm text-cyan-50/85 sm:grid-cols-3">
              <div className="rounded-lg border border-white/20 bg-white/10 p-4 shadow-lg shadow-cyan-950/20 backdrop-blur-xl">
                <strong className="block text-2xl text-white">{propriedades.length}</strong>
                propriedades publicadas
              </div>
              <div className="rounded-lg border border-white/20 bg-white/10 p-4 shadow-lg shadow-cyan-950/20 backdrop-blur-xl">
                <strong className="block text-2xl text-white">{destinos.length}</strong>
                destinos ativos
              </div>
              <div className="rounded-lg border border-white/20 bg-white/10 p-4 shadow-lg shadow-cyan-950/20 backdrop-blur-xl">
                <strong className="block text-2xl text-white">V2</strong>
                base multi-tenant
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      <section className="bg-background" id="destinos">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:py-20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-normal text-primary">
                Destinos em destaque
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-normal sm:text-4xl">
                Propriedades publicadas por cidade
              </h2>
            </div>
            <Link
              className={cn(buttonVariants({ variant: "outline" }), "self-start sm:self-auto")}
              href="/propriedades"
            >
              Ver todas
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {resultado.erro ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive">
              {resultado.erro}
            </div>
          ) : null}

          {destinos.length ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {destinos.map((destino) => (
                <Link
                  className="glass-card group overflow-hidden transition duration-300 hover:-translate-y-1"
                  href={`/propriedades?cidade=${encodeURIComponent(destino.cidade)}`}
                  key={`${destino.cidade}-${destino.estado}`}
                >
                  <div className="relative aspect-[4/3] bg-secondary">
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
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-cyan-950/85 to-transparent p-4 text-white">
                      <p className="flex items-center gap-1.5 text-sm">
                        <MapPin className="h-4 w-4" />
                        {destino.cidade}
                        {destino.estado ? `, ${destino.estado}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-cyan-50/75">
                        {destino.total} propriedade{destino.total === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <PremiumEmptyState
              description="As primeiras propriedades publicadas aparecerão aqui."
              title="Nenhum destino publicado"
            />
          )}
        </div>
      </section>

      <section className="border-y bg-secondary/35">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-normal text-primary">
              Hospedagens
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-normal sm:text-4xl">
              Propriedades em destaque
            </h2>
          </div>
          {propriedades.length ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {propriedades.slice(0, 3).map((propriedade) => (
                <PropertyCard key={propriedade.id} property={propriedade} />
              ))}
            </div>
          ) : (
            <PremiumEmptyState
              description="Nenhuma propriedade publicada foi encontrada no momento."
              title="Vitrine em preparação"
            />
          )}
        </div>
      </section>

      <section className="bg-background" id="categorias">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-normal text-primary">
              Categorias
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-normal sm:text-4xl">
              Escolha o tipo de hospedagem
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {categoriasMarketplace.map((categoria) => {
              const Icone = categoria.icon;

              return (
                <Link
                  className="glass-card group p-6 transition duration-300 hover:-translate-y-1"
                  href={categoria.href}
                  key={categoria.title}
                >
                  <span className="grid h-11 w-11 place-items-center rounded-md bg-primary/10 text-primary">
                    <Icone className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold">{categoria.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {categoria.description}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                    Ver opções
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-background" id="por-que">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-normal text-primary">
              Por que reservar pelo Hospedex
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-normal sm:text-4xl">
              Uma vitrine pública ligada à operação real
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {motivosReserva.map((motivo) => {
              const Icone = motivo.icon;

              return (
                <GlassCard className="p-6" key={motivo.title}>
                  <span className="grid h-11 w-11 place-items-center rounded-md bg-primary/10 text-primary">
                    <Icone className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold">{motivo.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {motivo.description}
                  </p>
                </GlassCard>
              );
            })}
          </div>
        </div>
      </section>

      <GlassPanel className="rounded-none border-x-0 border-b-0" id="proprietarios">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center lg:py-20">
          <div className="max-w-3xl">
            <StatusBadge tone="info">Para proprietários</StatusBadge>
            <h2 className="mt-4 text-3xl font-semibold tracking-normal sm:text-4xl">
              Publique sua propriedade a partir da gestão Hospedex
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">
              A vitrine pública nasce conectada à estrutura de propriedades,
              estrutura, mídia e comodidades da V2.
            </p>
          </div>
          <Link className={cn(buttonVariants({ size: "lg" }), "justify-self-start")} href="/propriedades">
            <Building2 className="h-4 w-4" />
            Conhecer a gestão
          </Link>
        </div>
      </GlassPanel>
    </PublicShell>
  );
}
