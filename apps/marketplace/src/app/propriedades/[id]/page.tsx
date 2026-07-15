import {
  Bath,
  BedDouble,
  ExternalLink,
  Home,
  Info,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { FadeIn, GlassCard, GlassPanel, StatusBadge } from "@hospedex/ui";

import { PublicShell } from "../../../components/layout/public-shell";
import { FavoriteButton } from "../../../components/properties/favorite-button";
import { PropertyAmenitiesSection } from "../../../components/properties/property-amenities-section";
import { PropertyAvailabilityCalendar } from "../../../components/properties/property-availability-calendar";
import {
  PropertyRegionalGuideSection,
  PropertyReviewsSection,
  PropertyRulesSection,
} from "../../../components/properties/property-detail-sections";
import { PropertyGallery } from "../../../components/properties/property-gallery";
import {
  PropertyReservationCard,
  type ReservaFeedback,
} from "../../../components/properties/property-reservation-card";
import { PropertyExpandableBlock } from "../../../components/properties/property-expandable-block";
import { ShareButton } from "../../../components/properties/share-button";
import {
  carregarPropriedadePublica,
  type EnderecoPublico,
  type PropriedadePublica,
} from "../../../lib/marketplace/data";
import { carregarCotacoesCambio } from "../../../lib/currency/service";
import { formatarQuantidade } from "../../../lib/format";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// A pagina publica da casa deve consultar o estado atual da propriedade para
// retornar 404 assim que ela for arquivada ou despublicada.
export const dynamic = "force-dynamic";

export default async function PropriedadePage({
  params,
  searchParams,
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
  const cotacoesCambio = await carregarCotacoesCambio();

  return (
    <PublicShell>
      <section className="relative isolate overflow-hidden bg-background text-foreground">
        <PropertyTopExperience propriedade={propriedade} />

        <div className="relative z-10 mx-auto grid w-full max-w-[1180px] gap-5 px-4 pb-28 pt-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-start lg:gap-8 lg:pb-14 lg:pt-8">
          <div className="grid min-w-0 max-w-full gap-5">
            <FadeIn className="min-w-0">
              <GlassPanel className="w-full max-w-full overflow-hidden border-border bg-card/88 p-4 shadow-2xl shadow-cyan-950/10 backdrop-blur-xl dark:border-slate-600/45 dark:bg-slate-950/76 dark:shadow-black/30 sm:p-5">
                <h2 className="mb-4 text-xl font-semibold text-foreground">
                  Resumo da hospedagem
                </h2>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
                  <ResumoItem
                    icon={Home}
                    label="Tipo"
                    value={propriedade.propertyTypeLabel}
                  />
                  <ResumoItem
                    icon={Users}
                    label="Capacidade"
                    value={`Até ${formatarQuantidade(propriedade.maxGuests, "hóspede", "hóspedes")}`}
                  />
                  <ResumoItem
                    icon={Home}
                    label="Quartos"
                    value={formatarQuantidade(propriedade.structure.bedrooms, "quarto", "quartos")}
                  />
                  <ResumoItem
                    icon={BedDouble}
                    label="Camas"
                    value={formatarQuantidade(propriedade.structure.beds, "cama", "camas")}
                  />
                  <ResumoItem
                    icon={Bath}
                    label="Banheiros"
                    value={formatarQuantidade(propriedade.structure.bathrooms, "banheiro", "banheiros")}
                  />
                </div>
              </GlassPanel>
            </FadeIn>
            {propriedade.description.trim() ? (
              <Secao id="sobre" title="Sobre a hospedagem">
                <p className="text-sm leading-7 text-muted-foreground sm:text-base">
                  {propriedade.description}
                </p>
              </Secao>
            ) : null}

            {propriedade.amenities.length ? (
              <Secao compact id="comodidades" title="O que este lugar oferece">
                <PropertyAmenitiesSection amenities={propriedade.amenities} />
              </Secao>
            ) : null}

            <div className="scroll-mt-32" id="regras">
              <PropertyRulesSection rules={propriedade.houseRules} />
            </div>

            <Secao id="disponibilidade" title="Calendário de disponibilidade">
              <PropertyAvailabilityCalendar
                availability={propriedade.availability}
                error={propriedade.availabilityError}
              />
              <p className="mt-4 text-xs leading-5 text-muted-foreground">
                O calendário mostra apenas o status público de cada data.
                Motivos internos, observações e dados administrativos não são
                exibidos ao hóspede.
              </p>
            </Secao>

            <PropertyLocationSection propriedade={propriedade} />

            {propriedade.regionalGuide.length ? (
              <PropertyRegionalGuideSection
                locations={propriedade.regionalGuide}
              />
            ) : null}

            <PropertyOwnerTrustCard property={propriedade} />

            {propriedade.reviews.total ? (
              <div className="scroll-mt-32" id="avaliacoes">
                <PropertyReviewsSection reviews={propriedade.reviews} />
              </div>
            ) : null}
          </div>

          <aside
            className="grid min-w-0 max-w-full scroll-mt-28 gap-4 lg:sticky lg:top-24 lg:self-start"
            id="reserva"
          >
            <PropertyReservationCard
              cotacoesCambio={cotacoesCambio}
              feedback={feedback}
              property={propriedade}
            />
            <PropertyTrustHighlights />
          </aside>
        </div>
      </section>
      <MobileReservationBar propriedade={propriedade} />
    </PublicShell>
  );
}

function PropertyTopExperience({
  propriedade,
}: {
  propriedade: PropriedadePublica;
}) {
  return (
    <section
      className="relative isolate scroll-mt-24 overflow-hidden border-b border-border bg-background px-0 pb-5 pt-0 text-foreground dark:border-white/10 dark:bg-slate-950 dark:text-white sm:px-6 lg:px-4 lg:pb-8 lg:pt-8"
      id="fotos"
    >
      <div className="absolute right-4 top-4 z-10 lg:hidden">
        <FadeIn className="flex max-w-full items-center gap-1.5">
          <ShareButton iconOnly />
          <FavoriteButton property={propriedade} />
        </FadeIn>
      </div>

      <div className="mx-auto flex max-w-[1180px] flex-col text-foreground dark:text-white lg:justify-start">
        <FadeIn className="lg:hidden">
          <PropertyGallery mobileHero property={propriedade} />
        </FadeIn>

        <FadeIn className="hidden items-start gap-6 lg:flex">
          <div className="min-w-0">
            <h1 className="max-w-4xl break-words text-4xl font-semibold leading-tight tracking-normal text-foreground dark:text-white">
              {propriedade.name}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground dark:text-slate-300">
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary dark:text-cyan-300" />
                {propriedade.locationLabel}
              </span>
              {propriedade.reviews.total ? (
                <span className="inline-flex items-center gap-2">
                  <Star className="h-4 w-4 fill-primary text-primary dark:fill-cyan-300 dark:text-cyan-300" />
                  {propriedade.reviews.average?.toFixed(1)} em{" "}
                  {formatarQuantidade(
                    propriedade.reviews.total,
                    "avaliação",
                    "avaliações",
                  )}
                </span>
              ) : null}
            </div>
          </div>
        </FadeIn>

        <FadeIn className="relative z-10 -mt-8 rounded-t-[2rem] border border-border bg-card px-5 pb-5 pt-6 text-left text-foreground shadow-2xl shadow-cyan-950/10 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:shadow-black/30 sm:mx-0 lg:hidden">
          <h1 className="break-words text-3xl font-semibold leading-tight tracking-normal text-foreground dark:text-white">
            {propriedade.name}
          </h1>
          <p className="mt-3 inline-flex items-start gap-2 text-sm leading-5 text-muted-foreground dark:text-slate-300">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary dark:text-cyan-300" />
            {propriedade.locationLabel}
          </p>
          {propriedade.reviews.total ? (
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground dark:text-slate-300">
              <Star className="h-4 w-4 fill-primary text-primary dark:fill-cyan-300 dark:text-cyan-300" />
              {propriedade.reviews.average?.toFixed(1)} ·{" "}
              {formatarQuantidade(
                propriedade.reviews.total,
                "avaliação",
                "avaliações",
              )}
            </p>
          ) : null}
        </FadeIn>
        <FadeIn className="mt-5 hidden lg:block">
          <PropertyGallery property={propriedade} />
        </FadeIn>
      </div>
    </section>
  );
}

function MobileReservationBar({
  propriedade,
}: {
  propriedade: PropriedadePublica;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/94 px-4 py-3 text-foreground shadow-2xl shadow-cyan-950/15 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/94 dark:text-white dark:shadow-black/50 lg:hidden">
      <div className="mx-auto flex max-w-[420px] items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-sm font-semibold leading-tight">
            {formatarPreco(propriedade.minPrice)}
            <span className="font-medium text-muted-foreground"> / noite</span>
          </p>
          <p className="mt-1 text-xs leading-4 text-muted-foreground">
            Adicione datas para ver os valores finais
          </p>
        </div>
        <a
          className="inline-flex h-12 shrink-0 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg shadow-cyan-950/20 transition hover:bg-primary-hover dark:bg-cyan-500 dark:text-white dark:hover:bg-cyan-400"
          href="#reserva"
        >
          Conferir
        </a>
      </div>
    </div>
  );
}

function PropertyLocationSection({
  propriedade,
}: {
  propriedade: PropriedadePublica;
}) {
  const endereco = formatarEnderecoResumido(propriedade.address);
  const urlMapa = obterUrlMapaEmbed(propriedade.address, endereco);
  const temLocalizacaoDetalhada = Boolean(
    endereco || propriedade.address.googleMapsLink,
  );

  if (!temLocalizacaoDetalhada) return null;

  const resumoLocalizacao = (
    <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
      <div>
        <p className="flex items-center gap-2 text-sm font-semibold">
          <MapPin className="h-4 w-4 text-primary" />
          {propriedade.locationLabel}
        </p>
        {endereco ? (
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {endereco}
          </p>
        ) : null}
      </div>
      {propriedade.address.googleMapsLink ? (
        <a
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md border bg-background/70 px-4 text-sm font-semibold transition hover:border-primary/50 hover:text-primary"
          href={propriedade.address.googleMapsLink}
          rel="noreferrer"
          target="_blank"
        >
          Abrir no Google Maps
          <ExternalLink className="h-4 w-4 text-primary" />
        </a>
      ) : null}
    </div>
  );

  return (
    <Secao id="localizacao" title="Localização">
      {urlMapa ? (
        <PropertyExpandableBlock preview={resumoLocalizacao}>
          <div className="overflow-hidden rounded-lg border bg-secondary">
            <iframe
              className="h-72 w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={urlMapa}
              title={`Mapa de ${propriedade.name}`}
            />
          </div>
        </PropertyExpandableBlock>
      ) : (
        resumoLocalizacao
      )}
    </Secao>
  );
}

function PropertyOwnerTrustCard({
  property,
}: {
  property: PropriedadePublica;
}) {
  const perfil = property.requestProfile;
  const iniciais = obterIniciais(perfil.ownerName || perfil.businessName);
  const local = [perfil.city, perfil.state].filter(Boolean).join(", ");
  const contatoHref = obterContatoAnfitriaoHref(perfil.whatsapp, perfil.phone);

  return (
    <GlassCard className="border-border bg-card/88 p-6 shadow-2xl shadow-cyan-950/10 backdrop-blur-xl dark:border-slate-600/45 dark:bg-slate-950/78 dark:shadow-black/25">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Anfitrião</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Dados públicos cadastrados pelo proprietário.
          </p>
        </div>
        {perfil.isVerified ? (
          <StatusBadge tone="success">Verificado</StatusBadge>
        ) : null}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center lg:grid-cols-1 xl:grid-cols-[auto_1fr]">
        {perfil.avatarUrl ? (
          <img
            alt={`Foto de ${perfil.ownerName}`}
            className="h-20 w-20 rounded-full border border-border-active/25 object-cover dark:border-cyan-300/20"
            src={perfil.avatarUrl}
          />
        ) : (
          <span className="grid h-20 w-20 place-items-center rounded-full border border-border-active/25 bg-primary/10 text-xl font-semibold text-primary dark:border-cyan-300/20">
            {iniciais}
          </span>
        )}
        <div>
          <h3 className="text-lg font-semibold">{perfil.ownerName}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {perfil.businessName}
          </p>
          {local ? (
            <p className="mt-1 text-sm text-muted-foreground">{local}</p>
          ) : null}
          {perfil.shortDescription ? (
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {perfil.shortDescription}
            </p>
          ) : null}
        </div>
      </div>

      {contatoHref ? (
        <a
          className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border bg-background/70 px-4 text-sm font-semibold transition hover:border-primary/50 hover:text-primary"
          href={contatoHref}
          rel="noreferrer"
          target={contatoHref.startsWith("http") ? "_blank" : undefined}
        >
          <MessageCircle className="h-4 w-4 text-primary" />
          Falar com o anfitrião
        </a>
      ) : null}

      <div className="mt-5 grid gap-3">
        {[
          "Não cobramos nada agora pelo Hospedex.",
          "Confira os dados da reserva antes de realizar qualquer pagamento.",
          "Nunca envie dados sensíveis de cartão fora de ambiente seguro.",
        ].map((texto) => (
          <div
            className="rounded-lg border bg-background/70 p-4 text-sm text-muted-foreground"
            key={texto}
          >
            <ShieldCheck className="mb-3 h-4 w-4 text-primary" />
            {texto}
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

function PropertyTrustHighlights() {
  const itens = [
    {
      icon: ShieldCheck,
      label: "Nenhum pagamento antecipado",
      texto: "A solicitação é analisada pelo proprietário",
    },
    {
      icon: Star,
      label: "Suporte dedicado",
      texto: "Antes, durante e depois da viagem",
    },
    {
      icon: ShieldCheck,
      label: "Anfitrião verificado",
      texto: "Mais segurança para você",
    },
  ];

  return (
    <GlassCard className="grid gap-4 border-border bg-card/88 p-5 shadow-2xl shadow-cyan-950/10 backdrop-blur-xl dark:border-slate-600/45 dark:bg-slate-950/78 dark:shadow-black/25 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
      {itens.map(({ icon: Icone, label, texto }) => (
        <div
          className="border-border sm:border-r sm:pr-4 last:border-r-0 dark:border-slate-700/55"
          key={label}
        >
          <Icone className="h-6 w-6 text-success dark:text-emerald-400" />
          <p className="mt-3 text-sm font-semibold text-foreground">{label}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {texto}
          </p>
        </div>
      ))}
    </GlassCard>
  );
}

function normalizarFeedback(
  params: Record<string, string | string[] | undefined>,
): ReservaFeedback {
  const status = obterParametro(params.reserva);
  const statusNormalizado: ReservaFeedback["status"] =
    status === "sucesso" || status === "erro" ? status : null;

  return {
    codigo: obterParametro(params.codigo),
    mensagem: obterParametro(params.mensagem),
    status: statusNormalizado,
  };
}

function obterParametro(valor: string | string[] | undefined) {
  return Array.isArray(valor) ? valor[0] : valor;
}

function Secao({
  children,
  compact = false,
  id,
  title,
}: {
  children: ReactNode;
  compact?: boolean;
  id?: string;
  title: string;
}) {
  return (
    <FadeIn className="min-w-0">
      <GlassCard
        className={`scroll-mt-32 w-full max-w-full overflow-hidden border-border bg-card/88 shadow-2xl shadow-cyan-950/10 backdrop-blur-xl dark:border-slate-600/45 dark:bg-slate-950/72 dark:shadow-black/20 ${
          compact ? "p-4 sm:p-5" : "p-5 sm:p-6"
        }`}
        id={id}
      >
        <h2
          className={
            compact
              ? "mb-3 text-xl font-semibold text-foreground"
              : "mb-4 text-2xl font-semibold text-foreground"
          }
        >
          {title}
        </h2>
        {children}
      </GlassCard>
    </FadeIn>
  );
}

function ResumoItem({
  icon: Icone,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2.5 rounded-xl border border-border bg-background/70 px-3 py-3 dark:border-slate-700/45 dark:bg-slate-950/46 xl:border-0 xl:bg-transparent xl:px-2 xl:py-1.5">
      <Icone className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
      <div className="min-w-0">
        <p className="break-words text-sm font-semibold leading-snug text-foreground xl:text-[15px]">
          {value}
        </p>
        <p className="mt-1 break-words text-[11px] leading-tight text-muted-foreground xl:text-xs">
          {label}
        </p>
      </div>
    </div>
  );
}

function formatarPreco(valor: number | null) {
  if (!valor) return "Sob consulta";

  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(valor);
}

function formatarEnderecoResumido(endereco: EnderecoPublico) {
  const linha = [
    endereco.linha1,
    endereco.numero,
    endereco.bairro,
    endereco.cidade,
    endereco.estado,
  ]
    .filter(Boolean)
    .join(", ");

  return linha;
}

function obterUrlMapaEmbed(
  endereco: EnderecoPublico,
  enderecoFormatado: string,
) {
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

function obterContatoAnfitriaoHref(
  whatsapp: string | null,
  telefone: string | null,
) {
  const numeroWhatsApp = whatsapp?.replace(/\D/g, "");
  if (numeroWhatsApp) return `https://wa.me/${numeroWhatsApp}`;

  const numeroTelefone = telefone?.replace(/\s+/g, "");
  return numeroTelefone ? `tel:${numeroTelefone}` : null;
}
