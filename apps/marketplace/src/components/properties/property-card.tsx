import { ArrowUpRight, BedDouble, MapPin, Sparkles, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { GlassCard, StatusBadge } from "@hospedex/ui";

import { formatarQuantidade } from "../../lib/format";
import type { PropriedadePublica } from "../../lib/marketplace/data";
import { FavoriteButton } from "./favorite-button";

export type PropertyCardProps = {
  property: PropriedadePublica;
};

export function PropertyCard({ property }: PropertyCardProps) {
  return (
    <GlassCard className="group overflow-hidden rounded-[1.35rem]">
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
        <Link
          aria-label={`Ver ${property.name}`}
          className="absolute inset-0"
          href={`/propriedades/${property.slug}`}
        >
          {property.coverImage ? (
            <Image
              alt={property.coverImage.alt}
              className="object-cover transition duration-500 group-hover:scale-105"
              fill
              sizes="(min-width: 1280px) 30vw, (min-width: 768px) 46vw, 100vw"
              src={property.coverImage.url}
            />
          ) : (
            <div className="grid h-full w-full place-items-center bg-[linear-gradient(135deg,var(--secondary),var(--accent))] px-8 text-center">
              <span className="text-sm font-semibold text-accent-foreground">
                Fotos em preparação
              </span>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-cyan-950/70 to-transparent opacity-80" />
        </Link>

        <div className="absolute left-2.5 top-2.5 flex max-w-[calc(100%-4rem)] flex-wrap gap-1.5">
          <StatusBadge className="text-[11px]" tone="info">
            {property.propertyTypeLabel}
          </StatusBadge>
          {property.amenities.length ? (
            <StatusBadge className="bg-background/70 text-[11px] backdrop-blur" tone="neutral">
              <Sparkles className="mr-1 h-3 w-3" />
              {property.amenities.length}
            </StatusBadge>
          ) : null}
        </div>
        <FavoriteButton className="absolute right-2.5 top-2.5" property={property} variant="card" />
      </div>

      <div className="grid gap-3 p-3.5">
        <Link className="grid gap-1.5" href={`/propriedades/${property.slug}`}>
          <div className="flex items-start justify-between gap-3">
            <h3 className="line-clamp-1 text-base font-semibold leading-tight">{property.name}</h3>
            <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-primary" />
          </div>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {property.locationLabel}
          </p>
          <p className="line-clamp-1 text-sm text-muted-foreground">
            {property.headline}
          </p>
        </Link>

        <div className="grid gap-2 border-t pt-3 text-sm text-muted-foreground">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              até {formatarQuantidade(property.maxGuests, "hóspede", "hóspedes")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BedDouble className="h-4 w-4" />
              {formatarQuantidade(property.bedrooms, "quarto", "quartos")}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold text-foreground">{formatarPreco(property.minPrice)}</span>
            <Link
              className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10"
              href={`/propriedades/${property.slug}`}
            >
              Ver hospedagem
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </GlassCard>
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

