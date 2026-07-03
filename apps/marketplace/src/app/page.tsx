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

// A home do Marketplace depende das casas publicadas no banco. Forcar leitura
// dinamica evita manter em cache uma casa excluida pelo proprietario.
export const dynamic = "force-dynamic";

const motivosReserva = [
  {
    title: "Contato direto",
    description: "Converse diretamente com o anfitrião e tire suas dúvidas antes de reservar.",
    icon: BadgeCheck
  },
  {
    title: "Informações organizadas",
    description: "Encontre fotos, regras, comodidades e valores em uma só página.",
    icon: ShieldCheck
  },
  {
    title: "Solicitação acompanhada",
    description: "Acompanhe suas reservas e comunique-se com mais segurança.",
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
    description: "Hospedagens charmosas com atendimento acolhedor e experiências locais.",
    href: "/propriedades?tipo=inn",
    icon: Building2
  },
  {
    title: "Pequenos hotéis",
    description: "Hotéis compactos com estrutura profissional e atenção aos detalhes.",
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
                Reserva direta
              </StatusBadge>
              <StatusBadge className="border-cyan-200/30 bg-cyan-300/20 text-cyan-50" tone="info">
                Hospedagens independentes
              </StatusBadge>
              <StatusBadge className="border-white/20 bg-white/15 text-white" tone="neutral">
                Casas, pousadas e pequenos hotéis
              </StatusBadge>
            </div>
            <div className="space-y-5">
              <h1 className="max-w-3xl text-5xl font-semibold leading-none tracking-normal sm:text-6xl lg:text-7xl">
                Encontre hospedagens independentes com reserva simples e direta.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-cyan-50/85 sm:text-lg">
                Casas de temporada, pousadas e pequenos hotéis publicados por anfitriões.
                Conecte-se direto, escolha seu destino e viva experiências incríveis.
              </p>
            </div>
            <PropertySearchForm />
            <div className="grid max-w-3xl gap-3 text-sm text-cyan-50/85 sm:grid-cols-3">
              <div className="rounded-lg border border-white/20 bg-white/10 p-4 shadow-lg shadow-cyan-950/20 backdrop-blur-xl">
                <strong className="block text-2xl text-white">{propriedades.length}</strong>
                hospedagem{propriedades.length === 1 ? "" : "s"} publicada{propriedades.length === 1 ? "" : "s"}
              </div>
              <div className="rounded-lg border border-white/20 bg-white/10 p-4 shadow-lg shadow-cyan-950/20 backdrop-blur-xl">
                <strong className="block text-2xl text-white">{destinos.length}</strong>
                destino{destinos.length === 1 ? "" : "s"} disponível{destinos.length === 1 ? "" : "s"}
              </div>
              <div className="rounded-lg border border-white/20 bg-white/10 p-4 shadow-lg shadow-cyan-950/20 backdrop-blur-xl">
                <strong className="block text-2xl text-white">Direto</strong>
                reserva com anfitrião
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
                Destinos disponíveis
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-normal sm:text-4xl">
                Explore cidades com hospedagens publicadas
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
                        {destino.total} hospedagem{destino.total === 1 ? "" : "s"}
                      </p>
                      <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-cyan-100">
                        Ver hospedagens
                        <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <PremiumEmptyState
              description="Assim que novas hospedagens forem publicadas, os destinos aparecerão aqui."
              title="Nenhum destino disponível ainda"
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
              Hospedagens em destaque
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
              description="As primeiras hospedagens aparecerão aqui em breve."
              title="Nenhuma hospedagem publicada ainda"
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
              Benefícios para hóspedes
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-normal sm:text-4xl">
              Por que reservar pelo Hospedex?
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
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:py-20">
          <div className="max-w-3xl">
            <StatusBadge tone="info">Para proprietários</StatusBadge>
            <h2 className="mt-4 text-3xl font-semibold tracking-normal sm:text-4xl">
              Anuncie sua propriedade no Hospedex
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">
              Publique sua casa, pousada ou pequeno hotel e gerencie reservas, calendário,
              hóspedes e financeiro em um só lugar.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                className={cn(buttonVariants({ size: "lg" }), "justify-center")}
                href="/anunciar"
              >
                Quero anunciar
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                className={cn(buttonVariants({ size: "lg", variant: "outline" }), "justify-center")}
                href="https://hospedex.vercel.app/cadastro"
              >
                Conhecer a gestão
              </Link>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["1", "Cadastre sua propriedade", "Informe os detalhes e envie fotos."],
              ["2", "Publique no marketplace", "Sua hospedagem fica visível para viajantes."],
              ["3", "Receba solicitações", "Gerencie reservas e calendário com facilidade."]
            ].map(([numero, titulo, texto]) => (
              <GlassCard className="p-5" key={numero}>
                <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {numero}
                </span>
                <h3 className="mt-4 font-semibold">{titulo}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{texto}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </GlassPanel>
    </PublicShell>
  );
}
