import {
  Bath,
  BedDouble,
  Car,
  Clock,
  ExternalLink,
  Home,
  Info,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Sparkles,
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
      <section className="relative isolate overflow-hidden bg-slate-950">
        <PropertyTopExperience propriedade={propriedade} />

        <div className="relative z-10 mx-auto grid w-full max-w-[1180px] gap-5 px-4 pb-10 pt-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-start lg:gap-8 lg:pb-14 lg:pt-8">
          <div className="grid min-w-0 max-w-full gap-5">
            <FadeIn className="min-w-0">
              <GlassPanel className="w-full max-w-full overflow-hidden border-slate-600/45 bg-slate-950/76 p-3 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-4 lg:p-5">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                  <ResumoItem
                    icon={Users}
                    label="Hóspedes"
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
                    icon={Sparkles}
                    label="Destaque"
                    value={propriedade.amenities[0]?.name ?? "Comodidades"}
                  />
                </div>
              </GlassPanel>
            </FadeIn>
            <PropertyAnchorNav />

            <Secao id="sobre" title="Sobre a hospedagem">
              <p className="text-sm leading-7 text-muted-foreground sm:text-base">
                {propriedade.description}
              </p>
            </Secao>

            <Secao compact title="Estrutura da hospedagem">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <ResumoItem
                  compact
                  icon={Users}
                  label="Capacidade"
                  value={`${propriedade.maxGuests} hóspedes`}
                />
                <ResumoItem
                  compact
                  icon={Home}
                  label="Tipo"
                  value={propriedade.propertyTypeLabel}
                />
                <ResumoItem
                  compact
                  icon={Clock}
                  label="Check-in"
                  value={propriedade.checkIn}
                />
                <ResumoItem
                  compact
                  icon={Clock}
                  label="Check-out"
                  value={propriedade.checkOut}
                />
              </div>
            </Secao>

            <Secao id="disponibilidade" title="Calendário de disponibilidade">
              <PropertyAvailabilityCalendar
                availability={propriedade.availability}
                error={propriedade.availabilityError}
              />
              <p className="mt-4 text-xs leading-5 text-muted-foreground">
                O calendário mostra apenas o status público de cada data. Motivos
                internos, observações e dados administrativos não são exibidos ao hóspede.
              </p>
            </Secao>

            <Secao compact id="comodidades" title="O que esse lugar oferece">
              <PropertyAmenitiesSection amenities={propriedade.amenities} />
            </Secao>

            <div className="scroll-mt-32" id="regras">
              <PropertyRulesSection rules={propriedade.houseRules} />
            </div>

            <PropertyLocationSection propriedade={propriedade} />

            <PropertyRegionalGuideSection locations={propriedade.regionalGuide} />

            <div className="scroll-mt-32" id="avaliacoes">
              <PropertyReviewsSection reviews={propriedade.reviews} />
            </div>

          </div>

          <aside className="grid min-w-0 max-w-full gap-4 lg:sticky lg:top-24 lg:self-start">
            <PropertyReservationCard
              cotacoesCambio={cotacoesCambio}
              feedback={feedback}
              property={propriedade}
            />
            <PropertyOwnerTrustCard property={propriedade} />
            <PropertyTrustHighlights />
          </aside>
        </div>
      </section>
    </PublicShell>
  );
}

function PropertyTopExperience({ propriedade }: { propriedade: PropriedadePublica }) {
  const imagem = propriedade.coverImage;

  return (
    <section
      className="relative isolate scroll-mt-24 overflow-hidden border-b border-white/10 bg-slate-950 px-4 pb-5 pt-4 text-white sm:px-6 lg:pb-8 lg:pt-8"
      id="fotos"
    >
      {imagem ? (
        <img
          alt={imagem.alt}
          className="absolute inset-0 -z-20 h-full w-full object-cover opacity-80 lg:hidden"
          fetchPriority="high"
          src={imagem.url}
        />
      ) : null}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(2,6,23,0.06)_0%,rgba(2,6,23,0.46)_50%,rgba(2,6,23,1)_100%)] lg:hidden" />
      {!imagem ? (
        <div className="absolute inset-0 -z-30 premium-grid-bg bg-secondary" />
      ) : null}

      <div className="absolute right-4 top-4 z-10 lg:hidden">
        <FadeIn className="flex max-w-full items-center gap-1.5">
          <ShareButton iconOnly />
          <FavoriteButton property={propriedade} />
        </FadeIn>
      </div>

      <div className="mx-auto flex min-h-[520px] max-w-[1180px] flex-col justify-end pb-0 pt-24 text-white sm:min-h-[560px] lg:min-h-0 lg:justify-start lg:pt-0">
        <FadeIn className="max-w-5xl rounded-t-[2rem] border border-white/10 bg-slate-950/94 p-5 text-center shadow-2xl shadow-black/30 lg:max-w-none lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:text-left lg:shadow-none">
          <div className="flex max-w-full flex-wrap justify-center gap-2 lg:justify-start">
            <StatusBadge tone="success">Casa publicada</StatusBadge>
            <StatusBadge tone="info">{propriedade.propertyTypeLabel}</StatusBadge>
            <StatusBadge tone="neutral">Até {propriedade.maxGuests} hóspedes</StatusBadge>
            <StatusBadge tone="warning">{formatarPreco(propriedade.minPrice)}</StatusBadge>
          </div>
          <h1 className="mt-4 max-w-4xl break-words text-3xl font-semibold leading-tight tracking-normal drop-shadow-xl sm:text-4xl lg:text-4xl">
            {propriedade.name}
          </h1>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-white/78 lg:justify-start">
            <span className="inline-flex items-center gap-2">
              <MapPin className="h-4 w-4 text-cyan-300" />
              {propriedade.locationLabel}
            </span>
            {propriedade.reviews.total ? (
              <span className="inline-flex items-center gap-2">
                <Star className="h-4 w-4 fill-cyan-300 text-cyan-300" />
                {propriedade.reviews.average?.toFixed(1)} em{" "}
                {propriedade.reviews.total} avaliações
              </span>
            ) : null}
          </div>
        </FadeIn>
        <FadeIn className="mt-5 hidden lg:block">
          <PropertyGallery property={propriedade} />
        </FadeIn>
      </div>
    </section>
  );
}

function PropertyAnchorNav() {
  const links = [
    ["#fotos", "Fotos"],
    ["#sobre", "Sobre"],
    ["#disponibilidade", "Disponibilidade"],
    ["#comodidades", "Comodidades"],
    ["#regras", "Regras"],
    ["#localizacao", "Localização"],
    ["#avaliacoes", "Avaliações"]
  ];

  return (
    <FadeIn className="min-w-0">
      <nav
        aria-label="Navegação da hospedagem"
        className="flex w-full min-w-0 max-w-full gap-2 overflow-x-auto rounded-2xl border border-slate-600/45 bg-slate-950/70 p-2 text-sm backdrop-blur-xl"
      >
        {links.map(([href, label]) => (
          <a
            className="shrink-0 rounded-xl px-3 py-2 text-slate-300 transition hover:bg-cyan-300/10 hover:text-cyan-100"
            href={href}
            key={href}
          >
            {label}
          </a>
        ))}
      </nav>
    </FadeIn>
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
    <Secao id="localizacao" title="Localização">
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
            Mapa ainda não informado pelo proprietário.
          </div>
        )}
      </PropertyExpandableBlock>
    </Secao>
  );
}

function PropertyOwnerTrustCard({ property }: { property: PropriedadePublica }) {
  const perfil = property.requestProfile;
  const iniciais = obterIniciais(perfil.ownerName || perfil.businessName);
  const local = [perfil.city, perfil.state].filter(Boolean).join(", ");
  const contatoHref = obterContatoAnfitriaoHref(perfil.whatsapp, perfil.phone);

  return (
    <GlassCard className="border-slate-600/45 bg-slate-950/78 p-6 shadow-2xl shadow-black/25 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Anfitrião</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Dados públicos cadastrados pelo proprietário.
          </p>
        </div>
        {perfil.isVerified ? <StatusBadge tone="success">Verificado</StatusBadge> : null}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center lg:grid-cols-1 xl:grid-cols-[auto_1fr]">
        {perfil.avatarUrl ? (
          <img
            alt={`Foto de ${perfil.ownerName}`}
            className="h-20 w-20 rounded-full border border-cyan-300/20 object-cover"
            src={perfil.avatarUrl}
          />
        ) : (
          <span className="grid h-20 w-20 place-items-center rounded-full border border-cyan-300/20 bg-primary/10 text-xl font-semibold text-primary">
            {iniciais}
          </span>
        )}
        <div>
          <h3 className="text-lg font-semibold">{perfil.ownerName}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{perfil.businessName}</p>
          {local ? <p className="mt-1 text-sm text-muted-foreground">{local}</p> : null}
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
          <MessageCircle className="h-4 w-4 text-cyan-100" />
          Falar com o anfitrião
        </a>
      ) : null}

      <div className="mt-5 grid gap-3">
        {[
          "Não cobramos nada agora pelo Hospedex.",
          "Confira os dados da reserva antes de realizar qualquer pagamento.",
          "Nunca envie dados sensíveis de cartão fora de ambiente seguro."
        ].map((texto) => (
          <div className="rounded-lg border bg-background/70 p-4 text-sm text-muted-foreground" key={texto}>
            <ShieldCheck className="mb-3 h-4 w-4 text-cyan-100" />
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
      texto: "A solicitação é analisada pelo proprietário"
    },
    {
      icon: Star,
      label: "Suporte dedicado",
      texto: "Antes, durante e depois da viagem"
    },
    {
      icon: ShieldCheck,
      label: "Anfitrião verificado",
      texto: "Mais segurança para você"
    }
  ];

  return (
    <GlassCard className="grid gap-4 border-slate-600/45 bg-slate-950/78 p-5 shadow-2xl shadow-black/25 backdrop-blur-xl sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
      {itens.map(({ icon: Icone, label, texto }) => (
        <div className="border-slate-700/55 sm:border-r sm:pr-4 last:border-r-0" key={label}>
          <Icone className="h-6 w-6 text-emerald-400" />
          <p className="mt-3 text-sm font-semibold text-white">{label}</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">{texto}</p>
        </div>
      ))}
    </GlassCard>
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
  compact = false,
  id,
  title
}: {
  children: ReactNode;
  compact?: boolean;
  id?: string;
  title: string;
}) {
  return (
    <FadeIn className="min-w-0">
      <GlassCard
        className={`scroll-mt-32 w-full max-w-full overflow-hidden border-slate-600/45 bg-slate-950/72 shadow-2xl shadow-black/20 backdrop-blur-xl ${
          compact ? "p-4 sm:p-5" : "p-5 sm:p-6"
        }`}
        id={id}
      >
        <h2 className={compact ? "mb-3 text-xl font-semibold text-white" : "mb-4 text-2xl font-semibold text-white"}>
          {title}
        </h2>
        {children}
      </GlassCard>
    </FadeIn>
  );
}

function ResumoItem({
  compact = false,
  icon: Icone,
  label,
  value
}: {
  compact?: boolean;
  icon: typeof Users;
  label: string;
  value: string;
}) {
  if (compact) {
    return (
      <div className="flex min-w-0 items-center gap-2.5 rounded-xl border border-slate-700/55 bg-slate-950/54 px-3 py-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-cyan-400/10 text-cyan-200">
          <Icone className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{value}</p>
          <p className="truncate text-[11px] text-slate-400">{label}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 rounded-2xl border border-slate-700/55 bg-slate-950/54 p-3 lg:border-0 lg:bg-transparent lg:px-3 lg:py-2">
      <Icone className="h-6 w-6 shrink-0 text-cyan-300 lg:h-7 lg:w-7" />
      <div className="mt-3 min-w-0 lg:mt-4">
        <p className="truncate text-base font-semibold text-white lg:text-lg">{value}</p>
        <p className="mt-0.5 truncate text-xs text-slate-400 lg:text-sm">{label}</p>
      </div>
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

function obterContatoAnfitriaoHref(whatsapp: string | null, telefone: string | null) {
  const numeroWhatsApp = whatsapp?.replace(/\D/g, "");
  if (numeroWhatsApp) return `https://wa.me/${numeroWhatsApp}`;

  const numeroTelefone = telefone?.replace(/\s+/g, "");
  return numeroTelefone ? `tel:${numeroTelefone}` : null;
}
