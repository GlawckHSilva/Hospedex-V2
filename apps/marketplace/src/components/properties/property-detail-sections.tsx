"use client";

import {
  CalendarClock,
  Cigarette,
  Clock,
  ExternalLink,
  Globe2,
  MapPin,
  MessageCircle,
  PawPrint,
  Phone,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  Users,
  XCircle
} from "lucide-react";
import { useState } from "react";

import {
  Button,
  FadeIn,
  GlassCard,
  PremiumEmptyState,
  StatusBadge,
  cn
} from "@hospedex/ui";

import type { PropriedadePublica } from "../../lib/marketplace/data";

type PropertyRulesSectionProps = {
  rules: PropriedadePublica["houseRules"];
};

type PropertyRegionalGuideSectionProps = {
  locations: PropriedadePublica["regionalGuide"];
};

type PropertyReviewsSectionProps = {
  reviews: PropriedadePublica["reviews"];
};

export function PropertyReviewsSection({ reviews }: PropertyReviewsSectionProps) {
  const [expandido, setExpandido] = useState(false);
  const comentariosVisiveis = expandido ? reviews.comments : reviews.comments.slice(0, 3);

  return (
    <FadeIn>
      <GlassCard className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <StatusBadge tone="info">Avaliações</StatusBadge>
            <h2 className="mt-3 text-xl font-semibold">Experiências dos hóspedes</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Comentários aprovados pelo proprietário para esta casa.
            </p>
          </div>

          <div className="w-full rounded-lg border bg-background/70 p-4 sm:w-40">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 fill-primary text-primary" />
              <span className="text-2xl font-semibold">
                {reviews.average?.toFixed(1) ?? "0.0"}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {reviews.total} {reviews.total === 1 ? "avaliação" : "avaliações"}
            </p>
          </div>
        </div>

        {reviews.total ? (
          <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
            <div className="space-y-3">
              {reviews.distribution.map((item) => (
                <div className="grid grid-cols-[44px_1fr_36px] items-center gap-3" key={item.stars}>
                  <span className="text-xs font-medium text-muted-foreground">
                    {item.stars} estrela{item.stars === 1 ? "" : "s"}
                  </span>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                  <span className="text-right text-xs text-muted-foreground">{item.count}</span>
                </div>
              ))}
            </div>

            <div className="grid gap-4">
              {comentariosVisiveis.map((review) => (
                <article className="rounded-lg border bg-background/70 p-4" key={review.id}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{review.guestName}</h3>
                      <p className="text-xs text-muted-foreground">
                        {formatarDataPublica(review.reviewedAt)}
                      </p>
                    </div>
                    <StarRating rating={review.rating} />
                  </div>
                  <p className="mt-4 text-sm leading-6 text-muted-foreground">
                    {review.comment}
                  </p>

                  {review.ownerResponse ? (
                    <div className="mt-4 rounded-md border border-primary/20 bg-primary/5 p-4">
                      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-primary">
                        <MessageCircle className="h-4 w-4" />
                        Resposta do proprietário
                      </p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {review.ownerResponse}
                      </p>
                    </div>
                  ) : null}
                </article>
              ))}
              {reviews.comments.length > 3 ? (
                <Button
                  className="w-fit"
                  onClick={() => setExpandido((valor) => !valor)}
                  type="button"
                  variant="outline"
                >
                  {expandido ? "Ver menos avaliacoes" : "Ver mais avaliacoes"}
                </Button>
              ) : null}
            </div>
          </div>
        ) : (
          <PremiumEmptyState
            className="mt-6 border border-dashed bg-background/60"
            description="Esta casa ainda não possui avaliações."
            icon={<Star className="h-5 w-5" />}
            title="Sem avaliações"
          />
        )}
      </GlassCard>
    </FadeIn>
  );
}

export function PropertyRulesSection({ rules }: PropertyRulesSectionProps) {
  const permissionItems = [
    {
      allowed: rules.allowChildren,
      disabledLabel: "Crianças sob consulta",
      enabledLabel: "Crianças permitidas",
      icon: Users,
      label: "Crianças"
    },
    {
      allowed: rules.allowPets,
      disabledLabel: "Pets não permitidos",
      enabledLabel: "Pets permitidos",
      icon: PawPrint,
      label: "Pets"
    },
    {
      allowed: rules.allowSmoking,
      disabledLabel: "Ambiente para não fumantes",
      enabledLabel: "Fumantes em áreas autorizadas",
      icon: Cigarette,
      label: "Fumantes"
    },
    {
      allowed: rules.allowEvents,
      disabledLabel: "Eventos não permitidos",
      enabledLabel: "Eventos com aprovação prévia",
      icon: Sparkles,
      label: "Eventos"
    }
  ];

  return (
    <FadeIn>
      <GlassCard className="p-6">
        <div className="flex flex-col gap-2">
          <StatusBadge className="w-fit" tone="success">
            Regras da casa
          </StatusBadge>
          <h2 className="text-xl font-semibold">Políticas da hospedagem</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Informações públicas cadastradas pelo proprietário para orientar a reserva.
          </p>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <RuleMetric icon={Clock} label="Check-in" value={rules.checkIn} />
          <RuleMetric icon={Clock} label="Check-out" value={rules.checkOut} />
          <RuleMetric
            icon={Users}
            label="Capacidade"
            value={`${rules.maxGuests} ${rules.maxGuests === 1 ? "hóspede" : "hóspedes"}`}
          />
          <RuleMetric
            icon={CalendarClock}
            label="Estadia mínima"
            value={`${rules.minNights} ${rules.minNights === 1 ? "noite" : "noites"}`}
          />
          <RuleMetric
            icon={ShieldCheck}
            label="Responsável"
            value={`${rules.minResponsibleAge} anos ou mais`}
          />
          <RuleMetric
            icon={CalendarClock}
            label="Estadia máxima"
            value={
              rules.maxNights
                ? `${rules.maxNights} ${rules.maxNights === 1 ? "noite" : "noites"}`
                : "Sob consulta"
            }
          />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {permissionItems.map((item) => (
            <RulePermission key={item.label} {...item} />
          ))}
        </div>

        {rules.additionalRules ? (
          <div className="mt-6 rounded-lg border bg-background/70 p-4">
            <h3 className="flex items-center gap-2 font-semibold">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Regras adicionais
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {rules.additionalRules}
            </p>
          </div>
        ) : null}

        {rules.specialInstructions ? (
          <div className="mt-6 rounded-lg border bg-background/70 p-4">
            <h3 className="flex items-center gap-2 font-semibold">
              <Sparkles className="h-4 w-4 text-primary" />
              Instruções especiais
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {rules.specialInstructions}
            </p>
          </div>
        ) : null}

        {rules.cancellationPolicy.itens.length || rules.cancellationPolicy.observacoes ? (
          <div className="mt-6 rounded-lg border bg-background/70 p-4">
            <h3 className="flex items-center gap-2 font-semibold">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Política de cancelamento
            </h3>
            {rules.cancellationPolicy.itens.length ? (
              <div className="mt-3 grid gap-2">
                {rules.cancellationPolicy.itens.map((item) => (
                  <p className="flex items-start gap-2 text-sm text-muted-foreground" key={item}>
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {item}
                  </p>
                ))}
              </div>
            ) : null}
            {rules.cancellationPolicy.observacoes ? (
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {rules.cancellationPolicy.observacoes}
              </p>
            ) : null}
          </div>
        ) : null}
      </GlassCard>
    </FadeIn>
  );
}

export function PropertyRegionalGuideSection({
  locations
}: PropertyRegionalGuideSectionProps) {
  const [expandido, setExpandido] = useState(false);
  const locaisVisiveis = expandido ? locations : locations.slice(0, 4);
  const grupos = agruparLocaisPorCategoria(locaisVisiveis);

  return (
    <FadeIn>
      <GlassCard className="p-6">
        <div className="flex flex-col gap-2">
          <StatusBadge className="w-fit" tone="info">
            Guia da região
          </StatusBadge>
          <h2 className="text-xl font-semibold">Locais próximos recomendados</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Recomendações ativas cadastradas pelo proprietário para hóspedes.
          </p>
        </div>

        {locations.length ? (
          <div className="mt-6 grid gap-6">
            {grupos.map((grupo) => (
              <div className="grid gap-3" key={grupo.categoria}>
                <h3 className="text-sm font-semibold text-muted-foreground">
                  {grupo.categoria}
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {grupo.locais.map((location) => (
                    <article
                      className="overflow-hidden rounded-lg border bg-background/70 shadow-sm transition hover:border-primary/40"
                      key={location.id}
                    >
                      {location.coverImageUrl ? (
                        <img
                          alt={`Foto de ${location.name}`}
                          className="h-40 w-full object-cover"
                          src={location.coverImageUrl}
                        />
                      ) : null}
                      <div className="p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <StatusBadge tone="neutral">{location.categoryLabel}</StatusBadge>
                            <h3 className="mt-3 font-semibold">{location.name}</h3>
                          </div>
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                            <Store className="h-5 w-5" />
                          </span>
                        </div>

                        {location.description ? (
                          <p className="mt-3 text-sm leading-6 text-muted-foreground">
                            {location.description}
                          </p>
                        ) : null}

                        <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
                          {location.address ? (
                            <InfoLine icon={MapPin}>{location.address}</InfoLine>
                          ) : null}
                          {location.openingHours ? (
                            <InfoLine icon={Clock}>{location.openingHours}</InfoLine>
                          ) : null}
                          {location.phone ? (
                            <InfoLine icon={Phone}>{location.phone}</InfoLine>
                          ) : null}
                          {location.whatsapp ? (
                            <InfoLine icon={MessageCircle}>
                              {`WhatsApp: ${location.whatsapp}`}
                            </InfoLine>
                          ) : null}
                          {location.websiteUrl ? (
                            <a
                              className="inline-flex items-center gap-2 text-primary transition hover:text-primary/80"
                              href={location.websiteUrl}
                              rel="noreferrer"
                              target="_blank"
                            >
                              <Globe2 className="h-4 w-4" />
                              Site
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ))}
            {locations.length > 4 ? (
              <Button
                className="w-fit"
                onClick={() => setExpandido((valor) => !valor)}
                type="button"
                variant="outline"
              >
                {expandido ? "Ver menos locais" : "Ver mais locais"}
              </Button>
            ) : null}
          </div>
        ) : (
          <PremiumEmptyState
            className="mt-6 border border-dashed bg-background/60"
            description="Nenhuma recomendação cadastrada para esta região."
            icon={<MapPin className="h-5 w-5" />}
            title="Sem locais cadastrados"
          />
        )}
      </GlassCard>
    </FadeIn>
  );
}

function agruparLocaisPorCategoria(locations: PropriedadePublica["regionalGuide"]) {
  const grupos = new Map<string, PropriedadePublica["regionalGuide"]>();

  for (const location of locations) {
    grupos.set(location.categoryLabel, [
      ...(grupos.get(location.categoryLabel) ?? []),
      location
    ]);
  }

  return [...grupos.entries()].map(([categoria, locais]) => ({
    categoria,
    locais
  }));
}

function RuleMetric({
  icon: Icone,
  label,
  value
}: {
  icon: typeof Clock;
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

function RulePermission({
  allowed,
  disabledLabel,
  enabledLabel,
  icon: Icone,
  label
}: {
  allowed: boolean;
  disabledLabel: string;
  enabledLabel: string;
  icon: typeof PawPrint;
  label: string;
}) {
  return (
    <div className="rounded-lg border bg-background/70 p-4">
      <div
        className={cn(
          "grid h-9 w-9 place-items-center rounded-md",
          allowed ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
        )}
      >
        {allowed ? <Icone className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
      </div>
      <p className="mt-3 text-xs uppercase tracking-normal text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">
        {allowed ? enabledLabel : disabledLabel}
      </p>
    </div>
  );
}

function InfoLine({
  children,
  icon: Icone
}: {
  children: string;
  icon: typeof MapPin;
}) {
  return (
    <p className="flex items-start gap-2">
      <Icone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <span>{children}</span>
    </p>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1" aria-label={`${rating} de 5 estrelas`}>
      {Array.from({ length: 5 }, (_, index) => {
        const filled = index < rating;

        return (
          <Star
            className={cn(
              "h-4 w-4",
              filled ? "fill-primary text-primary" : "text-muted-foreground/40"
            )}
            key={index}
          />
        );
      })}
    </div>
  );
}

function formatarDataPublica(data: string) {
  const parsed = new Date(data);
  if (Number.isNaN(parsed.getTime())) return "Data não informada";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(parsed);
}
