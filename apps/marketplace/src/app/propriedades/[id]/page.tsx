import {
  BedDouble,
  CheckCircle2,
  Clock,
  MapPin,
  ShieldCheck,
  Star,
  Users
} from "lucide-react";
import { notFound } from "next/navigation";

import { GlassButton, GlassCard, StatusBadge } from "@hospedex/ui";

import { PublicShell } from "../../../components/layout/public-shell";
import { PropertyGallery } from "../../../components/properties/property-gallery";
import { ShareButton } from "../../../components/properties/share-button";
import { carregarPropriedadePublica } from "../../../lib/marketplace/data";

type Params = Promise<{ id: string }>;

export default async function PropriedadePage({ params }: { params: Params }) {
  const { id } = await params;
  const resultado = await carregarPropriedadePublica(id);

  if (!resultado.propriedade) {
    notFound();
  }

  const propriedade = resultado.propriedade;

  return (
    <PublicShell>
      <section className="premium-grid-bg border-b bg-[linear-gradient(135deg,var(--background),var(--secondary))]">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:py-10">
          <PropertyGallery property={propriedade} />
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="max-w-4xl">
              <div className="flex flex-wrap gap-2">
                <StatusBadge tone="info">{propriedade.propertyTypeLabel}</StatusBadge>
                <StatusBadge tone="success">Publicado</StatusBadge>
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-normal sm:text-5xl">
                {propriedade.name}
              </h1>
              <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground sm:text-base">
                <MapPin className="h-4 w-4" />
                {propriedade.locationLabel}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <ShareButton />
              <GlassButton disabled>
                <Clock className="h-4 w-4" />
                Reservar
              </GlassButton>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-background">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_340px] lg:py-14">
          <div className="grid gap-8">
            <GlassCard className="p-6">
              <h2 className="text-xl font-semibold">Descrição</h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">
                {propriedade.description}
              </p>
            </GlassCard>

            <GlassCard className="p-6">
              <h2 className="text-xl font-semibold">Comodidades</h2>
              {propriedade.amenities.length ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {propriedade.amenities.map((comodidade) => (
                    <span
                      className="inline-flex items-center gap-2 rounded-md border bg-background/70 px-3 py-2 text-sm"
                      key={comodidade.id}
                    >
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      {comodidade.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">
                  Comodidades públicas serão exibidas assim que forem vinculadas.
                </p>
              )}
            </GlassCard>

            <GlassCard className="p-6" id="unidades">
              <h2 className="text-xl font-semibold">Unidades</h2>
              {propriedade.units.length ? (
                <div className="mt-5 grid gap-4">
                  {propriedade.units.map((unidade) => (
                    <article
                      className="grid gap-4 rounded-lg border bg-background/70 p-4 shadow-sm transition hover:border-primary/40 hover:bg-background/82 sm:grid-cols-[1fr_auto] sm:items-center"
                      key={unidade.id}
                    >
                      <div>
                        <h3 className="font-semibold">{unidade.name}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {unidade.categoryName ?? "Unidade"}
                          {unidade.description ? ` · ${unidade.description}` : ""}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <Users className="h-4 w-4" />
                            {unidade.capacity} hóspedes
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <BedDouble className="h-4 w-4" />
                            {unidade.beds} cama{unidade.beds === 1 ? "" : "s"}
                          </span>
                        </div>
                      </div>
                      <p className="font-semibold">{formatarPreco(unidade.basePrice)}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">
                  Unidades ativas serão exibidas assim que forem publicadas.
                </p>
              )}
            </GlassCard>

            <GlassCard className="p-6">
              <h2 className="text-xl font-semibold">Regras</h2>
              <div className="mt-5 grid gap-3">
                {propriedade.rules.map((regra) => (
                  <p
                    className="flex items-start gap-2 text-sm leading-6 text-muted-foreground"
                    key={regra}
                  >
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {regra}
                  </p>
                ))}
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <h2 className="text-xl font-semibold">Avaliações</h2>
              <div className="mt-5 rounded-lg border bg-background/70 p-5">
                <div className="flex items-center gap-1 text-warning">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star className="h-4 w-4 fill-current" key={index} />
                  ))}
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Avaliações públicas serão ativadas em uma etapa futura.
                </p>
              </div>
            </GlassCard>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <GlassCard className="p-5 shadow-xl shadow-cyan-950/10">
              <p className="text-sm text-muted-foreground">Diária inicial</p>
              <p className="mt-2 text-3xl font-semibold">
                {formatarPreco(propriedade.minPrice)}
              </p>
              <div className="mt-5 grid gap-3 text-sm text-muted-foreground">
                <span className="flex items-center justify-between">
                  Capacidade
                  <strong className="text-foreground">{propriedade.maxGuests} hóspedes</strong>
                </span>
                <span className="flex items-center justify-between">
                  Unidades
                  <strong className="text-foreground">{propriedade.units.length || 1}</strong>
                </span>
              </div>
              <GlassButton className="mt-6 w-full" disabled size="lg">
                Reservar
              </GlassButton>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Reserva online será conectada em etapa futura.
              </p>
            </GlassCard>
          </aside>
        </div>
      </section>
    </PublicShell>
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
