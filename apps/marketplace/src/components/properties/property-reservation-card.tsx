import { CalendarDays, Clock, Users } from "lucide-react";

import { GlassButton, GlassCard, GlassInput, StatusBadge } from "@hospedex/ui";

import type { PropriedadePublica } from "../../lib/marketplace/data";

export type PropertyReservationCardProps = {
  property: PropriedadePublica;
};

export function PropertyReservationCard({ property }: PropertyReservationCardProps) {
  return (
    <GlassCard className="p-5 shadow-2xl shadow-cyan-950/15">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Diária inicial</p>
          <p className="mt-2 text-3xl font-semibold">{formatarPreco(property.minPrice)}</p>
        </div>
        <StatusBadge tone="info">Solicitação</StatusBadge>
      </div>

      <div className="mt-6 grid gap-3">
        <label className="grid gap-2 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
          Check-in
          <GlassInput aria-label="Check-in" readOnly type="date" />
        </label>
        <label className="grid gap-2 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
          Check-out
          <GlassInput aria-label="Check-out" readOnly type="date" />
        </label>
        <label className="grid gap-2 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
          Hóspedes
          <GlassInput
            aria-label="Quantidade de hóspedes"
            max={property.maxGuests}
            min={1}
            readOnly
            type="number"
            value={Math.min(property.maxGuests, 2)}
          />
        </label>
      </div>

      <div className="mt-5 grid gap-3 rounded-lg border bg-background/70 p-4 text-sm">
        <span className="flex items-center justify-between gap-3 text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <Users className="h-4 w-4" />
            Capacidade
          </span>
          <strong className="text-foreground">{property.maxGuests} hóspedes</strong>
        </span>
        <span className="flex items-center justify-between gap-3 text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Unidades
          </span>
          <strong className="text-foreground">{property.units.length}</strong>
        </span>
        <span className="flex items-center justify-between gap-3 text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Horários
          </span>
          <strong className="text-right text-foreground">
            {property.checkIn} / {property.checkOut}
          </strong>
        </span>
      </div>

      <GlassButton className="mt-6 w-full" disabled size="lg">
        Solicitar reserva
      </GlassButton>
      <p className="mt-3 text-center text-xs leading-5 text-muted-foreground">
        Reserva pública real e pagamento serão conectados em etapa futura.
      </p>
    </GlassCard>
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
