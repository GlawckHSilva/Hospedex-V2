import {
  Bath,
  BedDouble,
  Car,
  Clock,
  ExternalLink,
  Home,
  Info,
  MapPin,
  ShieldCheck,
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
import { PropertyExpandableBlock } from "../../../components/properties/property-expandable-block";
import { ShareButton } from "../../../components/properties/share-button";
import {
  carregarPropriedadePublica,
  type EnderecoPublico,
  type PropriedadePublica
} from "../../../lib/marketplace/data";
import { carregarCotacoesCambio } from "../../../lib/currency/service";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// A pagina publica da casa deve consultar o estado atual da propriedade para
// retornar 404 assim que ela for arquivada ou despublicada.
export const dynamic = "force-dynamic";

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
              Nao foi possivel carregar esta casa
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
  const cotacoesCambio = await carregarCotacoesCambio();

  return (
    <PublicShell>
      <PropertyHero propriedade={propriedade} />

      <section className="bg-background">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_390px] lg:py-10">
          <div className="grid gap-6">
            <FadeIn>
              <GlassPanel className="p-4 sm:p-5">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                  <ResumoItem
                    icon={Users}
                    label="Hospedes"
                    value={`${propriedade.maxGuests} max.`}
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
                    label="Diaria"
                    value={formatarPreco(propriedade.minPrice)}
                  />
                </div>
              </GlassPanel>
            </FadeIn>

            <Secao title="Sobre a casa">
              <p className="text-sm leading-7 text-muted-foreground sm:text-base">
                {propriedade.description}
              </p>
            </Secao>

            <Secao title="Galeria">
              <PropertyGallery property={propriedade} />
            </Secao>

            <Secao title="Estrutura da hospedagem">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <ResumoItem
                  icon={Users}
                  label="Capacidade"
                  value={`${propriedade.maxGuests} hospedes`}
                />
                <ResumoItem
                  icon={Home}
                  label="Tipo"
                  value={propriedade.propertyTypeLabel}
                />
                <ResumoItem
                  icon={Clock}
                  label="Check-in"
                  value={propriedade.checkIn}
                />
                <ResumoItem
                  icon={Clock}
                  label="Check-out"
                  value={propriedade.checkOut}
                />
              </div>
            </Secao>

            <Secao title="Calendario de disponibilidade">
              <PropertyAvailabilityCalendar
                availability={propriedade.availability}
                error={propriedade.availabilityError}
              />
              <p className="mt-4 text-xs leading-5 text-muted-foreground">
                O calendario mostra apenas o status publico de cada data. Motivos
                internos, observacoes e dados administrativos nao sao exibidos ao hospede.
              </p>
            </Secao>

            <Secao title="Comodidades">
              <PropertyAmenitiesSection amenities={propriedade.amenities} />
            </Secao>

            <PropertyRulesSection rules={propriedade.houseRules} />

            <PropertyLocationSection propriedade={propriedade} />

            <PropertyRegionalGuideSection locations={propriedade.regionalGuide} />

            <PropertyReviewsSection reviews={propriedade.reviews} />

            <PropertyOwnerTrustSection property={propriedade} />
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <PropertyReservationCard
              cotacoesCambio={cotacoesCambio}
              feedback={feedback}
              property={propriedade}
            />
          </aside>
        </div>
      </section>
    </PublicShell>
  );
}

function PropertyHero({ propriedade }: { propriedade: PropriedadePublica }) {
  const imagem = propriedade.coverImage;

  return (
    <section className="relative isolate overflow-hidden border-b">
      {imagem ? (
        <img
          alt={imagem.alt}
          className="absolute inset-0 -z-20 h-full w-full object-cover"
          fetchPriority="high"
          src={imagem.url}
        />
      ) : null}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.34),transparent_32%),linear-gradient(180deg,rgba(2,6,23,0.48),rgba(2,6,23,0.86))]" />
      {!imagem ? (
        <div className="absolute inset-0 -z-30 premium-grid-bg bg-secondary" />
      ) : null}

      <div className="mx-auto flex min-h-[520px] max-w-7xl flex-col justify-end gap-8 px-4 pb-10 pt-28 text-white sm:px-6 lg:min-h-[620px] lg:pb-14">
        <FadeIn className="max-w-4xl">
          <div className="flex flex-wrap gap-2">
            <StatusBadge tone="success">Casa publicada</StatusBadge>
            <StatusBadge tone="info">{propriedade.propertyTypeLabel}</StatusBadge>
            <StatusBadge tone="neutral">{propriedade.maxGuests} hospedes</StatusBadge>
            <StatusBadge tone="warning">{formatarPreco(propriedade.minPrice)}</StatusBadge>
          </div>
          <h1 className="mt-5 text-4xl font-semibold tracking-normal sm:text-6xl">
            {propriedade.name}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-white/82 sm:text-lg">
            {propriedade.headline}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-white/78">
            <span className="inline-flex items-center gap-2">
              <MapPin className="h-4 w-4 text-cyan-300" />
              {propriedade.locationLabel}
            </span>
            {propriedade.reviews.total ? (
              <span className="inline-flex items-center gap-2">
                <Star className="h-4 w-4 fill-cyan-300 text-cyan-300" />
                {propriedade.reviews.average?.toFixed(1)} em{" "}
                {propriedade.reviews.total} avaliacoes
              </span>
            ) : null}
          </div>
        </FadeIn>
        <FadeIn>
          <div className="inline-flex rounded-xl border border-white/15 bg-black/22 p-2 backdrop-blur-xl">
            <ShareButton />
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

function PropertyLocationSection({
  propriedade
}: {
  propriedade: PropriedadePublica;
}) {
  const endereco = formatarEnderecoResumido(propriedade.address);
  const urlMapa = obterUrlMapaEmbed(propriedade.address, endereco);

  return (
    <Secao title="Localizacao">
      <PropertyExpandableBlock
        preview={
          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold">
              <MapPin className="h-4 w-4 text-cyan-100" />
              {propriedade.locationLabel}
            </p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{endereco}</p>
          </div>
          {propriedade.address.googleMapsLink ? (
            <a
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md border bg-background/70 px-4 text-sm font-semibold transition hover:border-primary/50 hover:text-primary"
              href={propriedade.address.googleMapsLink}
              rel="noreferrer"
              target="_blank"
            >
              Abrir no Google Maps
              <ExternalLink className="h-4 w-4 text-cyan-100" />
            </a>
          ) : null}
          </div>
        }
      >

        {urlMapa ? (
          <div className="overflow-hidden rounded-lg border bg-secondary">
            <iframe
              className="h-72 w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={urlMapa}
              title={`Mapa de ${propriedade.name}`}
            />
          </div>
        ) : (
          <div className="rounded-lg border border-dashed bg-background/60 p-5 text-sm text-muted-foreground">
            Mapa ainda nao informado pelo proprietario.
          </div>
        )}
      </PropertyExpandableBlock>
    </Secao>
  );
}

function PropertyOwnerTrustSection({ property }: { property: PropriedadePublica }) {
  const perfil = property.requestProfile;
  const iniciais = obterIniciais(perfil.ownerName || perfil.businessName);
  const local = [perfil.city, perfil.state].filter(Boolean).join(", ");

  return (
    <Secao title="Informacoes do proprietario">
      <PropertyExpandableBlock
        preview={
          <div className="grid gap-4 md:grid-cols-[auto_1fr] md:items-center">
        {perfil.avatarUrl ? (
          <img
            alt={`Foto de ${perfil.ownerName}`}
            className="h-20 w-20 rounded-2xl object-cover"
            src={perfil.avatarUrl}
          />
        ) : (
          <span className="grid h-20 w-20 place-items-center rounded-2xl bg-primary/10 text-xl font-semibold text-primary">
            {iniciais}
          </span>
        )}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold">{perfil.ownerName}</h3>
            {perfil.isVerified ? (
              <StatusBadge tone="success">Proprietario verificado</StatusBadge>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{perfil.businessName}</p>
          {local ? <p className="mt-1 text-sm text-muted-foreground">{local}</p> : null}
          {perfil.phone || perfil.whatsapp ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Contato publico: {perfil.whatsapp ?? perfil.phone}
            </p>
          ) : null}
        </div>
          </div>
        }
      >
      <div className="grid gap-3 md:grid-cols-3">
        {[
          "Comunique-se pelos contatos oficiais informados nesta pagina.",
          "Confira os dados da reserva antes de realizar qualquer pagamento.",
          "Nunca envie dados sensiveis de cartao fora de ambiente seguro."
        ].map((texto) => (
          <div className="rounded-lg border bg-background/70 p-4 text-sm text-muted-foreground" key={texto}>
            <ShieldCheck className="mb-3 h-4 w-4 text-cyan-100" />
            {texto}
          </div>
        ))}
      </div>
      </PropertyExpandableBlock>
    </Secao>
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
      <GlassCard className="p-4 sm:p-5">
        <h2 className="mb-4 text-xl font-semibold">{title}</h2>
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
      <Icone className="h-4 w-4 text-cyan-100" />
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

  return linha || "Endereco completo compartilhado apos a solicitacao.";
}

function obterUrlMapaEmbed(endereco: EnderecoPublico, enderecoFormatado: string) {
  if (!endereco.googleMapsLink) return null;
  if (endereco.googleMapsLink.includes("/maps/embed")) {
    return endereco.googleMapsLink;
  }

  return `https://www.google.com/maps?q=${encodeURIComponent(enderecoFormatado)}&output=embed`;
}

function obterIniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).slice(0, 2);
  return partes.map((parte) => parte[0]?.toUpperCase()).join("") || "HX";
}
