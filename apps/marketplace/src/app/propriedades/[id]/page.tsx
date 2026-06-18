import {
  BedDouble,
  CheckCircle2,
  Clock,
  Info,
  MapPin,
  Users
} from "lucide-react";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { FadeIn, GlassCard, GlassPanel, StatusBadge } from "@hospedex/ui";

import { PublicShell } from "../../../components/layout/public-shell";
import {
  PropertyRegionalGuideSection,
  PropertyReviewsSection,
  PropertyRulesSection
} from "../../../components/properties/property-detail-sections";
import { PropertyGallery } from "../../../components/properties/property-gallery";
import {
  PropertyReservationCard,
  type ReservaFeedback
} from "../../../components/properties/property-reservation-card";
import { ShareButton } from "../../../components/properties/share-button";
import { carregarPropriedadePublica } from "../../../lib/marketplace/data";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function PropriedadePage({
  params,
  searchParams
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const feedback = normalizarFeedback(await searchParams);
  const resultado = await carregarPropriedadePublica(id);

  if (!resultado.propriedade && !resultado.erro) {
    notFound();
  }

  if (resultado.erro) {
    return (
      <PublicShell>
        <section className="grid min-h-[70svh] place-items-center px-4 py-16">
          <GlassCard className="max-w-lg p-6 text-center">
            <Info className="mx-auto h-8 w-8 text-primary" />
            <h1 className="mt-5 text-2xl font-semibold">
              Não foi possível carregar esta propriedade
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {resultado.erro}
            </p>
          </GlassCard>
        </section>
      </PublicShell>
    );
  }

  const propriedade = resultado.propriedade;
  if (!propriedade) notFound();

  return (
    <PublicShell>
      <section className="premium-grid-bg border-b bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.22),transparent_34%),linear-gradient(135deg,var(--background),var(--secondary))]">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:py-10">
          <FadeIn>
            <PropertyGallery property={propriedade} />
          </FadeIn>

          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <FadeIn className="max-w-4xl">
              <div className="flex flex-wrap gap-2">
                <StatusBadge tone="info">{propriedade.propertyTypeLabel}</StatusBadge>
                <StatusBadge tone="success">Disponível para solicitação</StatusBadge>
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-normal sm:text-5xl">
                {propriedade.name}
              </h1>
              <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground sm:text-base">
                <MapPin className="h-4 w-4" />
                {propriedade.locationLabel}
              </p>
            </FadeIn>
            <FadeIn>
              <ShareButton />
            </FadeIn>
          </div>
        </div>
      </section>

      <section className="bg-background">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_360px] lg:py-14">
          <div className="grid gap-8">
            <GlassPanel className="p-6">
              <div className="grid gap-5 md:grid-cols-4">
                <ResumoItem
                  icon={Users}
                  label="Capacidade"
                  value={`${propriedade.maxGuests} hóspedes`}
                />
                <ResumoItem
                  icon={BedDouble}
                  label="Unidades"
                  value={`${propriedade.units.length} disponíveis`}
                />
                <ResumoItem icon={Clock} label="Check-in" value={propriedade.checkIn} />
                <ResumoItem icon={Clock} label="Check-out" value={propriedade.checkOut} />
              </div>
            </GlassPanel>

            <Secao title="Descrição">
              <p className="text-sm leading-7 text-muted-foreground sm:text-base">
                {propriedade.description}
              </p>
            </Secao>

            <PropertyReviewsSection reviews={propriedade.reviews} />

            <Secao title="Comodidades">
              {propriedade.amenities.length ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                <p className="text-sm text-muted-foreground">
                  Comodidades públicas serão exibidas assim que forem vinculadas.
                </p>
              )}
            </Secao>

            <Secao id="unidades" title="Unidades disponíveis">
              <div className="grid gap-4">
                {propriedade.units.map((unidade) => (
                  <article
                    className="grid gap-4 rounded-lg border bg-background/70 p-4 shadow-sm transition hover:border-primary/40 hover:bg-background/80 sm:grid-cols-[1fr_auto] sm:items-center"
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
            </Secao>

            <PropertyRulesSection rules={propriedade.houseRules} />

            <PropertyRegionalGuideSection locations={propriedade.regionalGuide} />

            <Secao title="Localização">
              <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <MapPin className="h-4 w-4 text-primary" />
                    {propriedade.locationLabel}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {propriedade.address.linha1 ||
                      "Endereço completo compartilhado após a solicitação."}
                  </p>
                </div>
                <div className="grid min-h-52 place-items-center rounded-lg border bg-[linear-gradient(135deg,rgba(14,165,233,0.16),rgba(99,102,241,0.12))] p-6 text-center">
                  <div>
                    <MapPin className="mx-auto h-8 w-8 text-primary" />
                    <p className="mt-3 text-sm font-semibold">Mapa simples</p>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      Integração com mapa real será feita em uma etapa futura.
                    </p>
                  </div>
                </div>
              </div>
            </Secao>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <PropertyReservationCard feedback={feedback} property={propriedade} />
          </aside>
        </div>
      </section>
    </PublicShell>
  );
}

function normalizarFeedback(params: Record<string, string | string[] | undefined>): ReservaFeedback {
  const status = obterParametro(params.reserva);
  const statusNormalizado: ReservaFeedback["status"] =
    status === "sucesso" || status === "erro" ? status : null;

  return {
    codigo: obterParametro(params.codigo),
    mensagem: obterParametro(params.mensagem),
    status: statusNormalizado
  };
}

function obterParametro(valor: string | string[] | undefined) {
  return Array.isArray(valor) ? valor[0] : valor;
}

function Secao({
  children,
  id,
  title
}: {
  children: ReactNode;
  id?: string;
  title: string;
}) {
  return (
    <FadeIn>
      <GlassCard className="p-6" id={id}>
        <h2 className="mb-5 text-xl font-semibold">{title}</h2>
        {children}
      </GlassCard>
    </FadeIn>
  );
}

function ResumoItem({
  icon: Icone,
  label,
  value
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border bg-background/70 p-4">
      <Icone className="h-4 w-4 text-primary" />
      <p className="mt-3 text-xs uppercase tracking-normal text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
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
