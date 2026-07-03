import { ArrowUpRight, BedDouble, MapPin, Sparkles, Users } from "lucide-react";
import Link from "next/link";

import { GlassCard, StatusBadge } from "@hospedex/ui";

import type { PropriedadePublica } from "../../lib/marketplace/data";

export type PropertyCardProps = {
  property: PropriedadePublica;
};

export function PropertyCard({ property }: PropertyCardProps) {
  return (
    <Link
      className="group block transition duration-300 hover:-translate-y-1"
      href={`/propriedades/${property.slug}`}
    >
      <GlassCard className="overflow-hidden">
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
        {property.coverImage ? (
          <img
            alt={property.coverImage.alt}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            loading="lazy"
            src={property.coverImage.url}
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-[linear-gradient(135deg,var(--secondary),var(--accent))] px-8 text-center">
            <span className="text-sm font-semibold text-accent-foreground">
              Fotos em preparaÃ§Ã£o
            </span>
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <StatusBadge tone="info">{property.propertyTypeLabel}</StatusBadge>
          {property.amenities.length ? (
            <StatusBadge className="bg-background/70 backdrop-blur" tone="neutral">
              <Sparkles className="mr-1 h-3 w-3" />
              {property.amenities.length} comodidades
            </StatusBadge>
          ) : null}
        </div>
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-cyan-950/70 to-transparent opacity-80" />
      </div>
      <div className="grid gap-4 p-4">
        <div className="grid gap-2">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-base font-semibold leading-tight">{property.name}</h3>
            <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-primary" />
          </div>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {property.locationLabel}
          </p>
          <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
            {property.headline}
          </p>
        </div>
        <div className="grid gap-3 border-t pt-4 text-sm text-muted-foreground">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              até {property.maxGuests}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BedDouble className="h-4 w-4" />
              {property.bedrooms} quarto{property.bedrooms === 1 ? "" : "s"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold text-foreground">{formatarPreco(property.minPrice)}</span>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 px-3 py-1.5 text-xs font-semibold text-primary">
              Ver hospedagem
              <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </div>
      </GlassCard>
    </Link>
  );
}

function formatarPreco(valor: number | null) {
  if (!valor) return "Sob consulta";

  return `A partir de ${new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    maximumFractionDigits: 0,
    style: "currency"
  }).format(valor)}/noite`;
}

