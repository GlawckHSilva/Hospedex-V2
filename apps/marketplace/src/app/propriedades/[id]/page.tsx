import {
  Bath,
  BedDouble,
  Car,
  ExternalLink,
  Home,
  Info,
  MapPin,
  Star,
  Users,
  WalletCards
} from "lucide-react";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { FadeIn, GlassCard, GlassPanel, StatusBadge } from "@hospedex/ui";

import { PublicShell } from "../../../components/layout/public-shell";
import { PropertyAmenitiesSection } from "../../../components/properties/property-amenities-section";
import { PropertyAvailabilityCalendar } from "../../../components/properties/property-availability-calendar";
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
import {
  carregarPropriedadePublica,
  type EnderecoPublico
} from "../../../lib/marketplace/data";

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
              Não foi possível carregar esta casa
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
                <StatusBadge tone="success">Casa publicada</StatusBadge>
                {propriedade.reviews.total ? (
                  <StatusBadge tone="warning">
                    {propriedade.reviews.average?.toFixed(1)} estrelas
                  </StatusBadge>
                ) : null}
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-normal sm:text-5xl">
                {propriedade.name}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
                {propriedade.headline}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  {propriedade.locationLabel}
                </span>
                {propriedade.reviews.total ? (
                  <span className="inline-flex items-center gap-2">
                    <Star className="h-4 w-4 fill-primary text-primary" />
                    {propriedade.reviews.total} avaliações
                  </span>
                ) : null}
              </div>
            </FadeIn>
            <FadeIn>
              <ShareButton />
            </FadeIn>
          </div>

          <FadeIn>
            <GlassPanel className="p-4 sm:p-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                <ResumoItem
                  icon={Users}
                  label="Hóspedes"
                  value={`${propriedade.maxGuests} máx.`}
                />
                <ResumoItem
                  icon={Home}
                  label="Quartos"
                  value={formatarQuantidade(propriedade.structure.bedrooms)}
                />
                <ResumoItem
                  icon={BedDouble}
                  label="Camas"
                  value={formatarQuantidade(propriedade.structure.beds)}
                />
                <ResumoItem
                  icon={Bath}
                  label="Banheiros"
                  value={formatarQuantidade(propriedade.structure.bathrooms)}
                />
                <ResumoItem
                  icon={Car}
                  label="Garagem"
                  value={formatarVagas(propriedade.structure.garageSpaces)}
                />
                <ResumoItem
                  icon={WalletCards}
                  label="Diária"
                  value={formatarPreco(propriedade.minPrice)}
                />
              </div>
            </GlassPanel>
          </FadeIn>
        </div>
      </section>

      <section className="bg-background">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_380px] lg:py-14">
          <div className="grid gap-8">
            <Secao title="Sobre a casa">
              <p className="text-sm leading-7 text-muted-foreground sm:text-base">
                {propriedade.description}
              </p>
            </Secao>

            <Secao title="Calendário de disponibilidade">
              <PropertyAvailabilityCalendar availability={propriedade.availability} />
              <p className="mt-4 text-xs leading-5 text-muted-foreground">
                O calendário mostra apenas o status público de cada data. Detalhes
                operacionais, motivos e observações internas não são exibidos ao hóspede.
              </p>
            </Secao>

            <PropertyReviewsSection reviews={propriedade.reviews} />

            <Secao title="Comodidades">
              <PropertyAmenitiesSection amenities={propriedade.amenities} />
            </Secao>

            <PropertyRulesSection rules={propriedade.houseRules} />

            <PropertyRegionalGuideSection locations={propriedade.regionalGuide} />

            <Secao title="Localização">
              <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <MapPin className="h-4 w-4 text-primary" />
                    {propriedade.locationLabel}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {formatarEnderecoResumido(propriedade.address)}
                  </p>
                </div>
                {propriedade.address.googleMapsLink ? (
                  <a
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-md border bg-background/70 px-4 text-sm font-semibold transition hover:border-primary/50 hover:text-primary"
                    href={propriedade.address.googleMapsLink}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Abrir no Google Maps
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ) : null}
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
  title
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <FadeIn>
      <GlassCard className="p-6">
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

function formatarQuantidade(valor: number) {
  return valor > 0 ? String(valor) : "Sob consulta";
}

function formatarVagas(valor: number) {
  if (!valor) return "Sob consulta";
  return `${valor} ${valor === 1 ? "vaga" : "vagas"}`;
}

function formatarEnderecoResumido(endereco: EnderecoPublico) {
  const linha = [
    endereco.linha1,
    endereco.numero,
    endereco.bairro,
    endereco.cidade,
    endereco.estado
  ]
    .filter(Boolean)
    .join(", ");

  return linha || "Endereço completo compartilhado após a solicitação.";
}
