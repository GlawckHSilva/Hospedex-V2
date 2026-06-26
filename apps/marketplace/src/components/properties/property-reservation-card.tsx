import { CalendarDays, CheckCircle2, Clock, Mail, Phone, User, Users } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { GlassButton, GlassCard, GlassInput, StatusBadge, buttonVariants, cn } from "@hospedex/ui";

import { solicitarReservaPublicaAction } from "../../lib/marketplace/actions";
import type { PropriedadePublica } from "../../lib/marketplace/data";

export type ReservaFeedback = {
  codigo?: string | undefined;
  mensagem?: string | undefined;
  status: "erro" | "sucesso" | null;
};

export type PropertyReservationCardProps = {
  feedback: ReservaFeedback;
  property: PropriedadePublica;
};

export function PropertyReservationCard({ feedback, property }: PropertyReservationCardProps) {
  if (feedback.status === "sucesso") {
    return <ReservationSuccess codigo={feedback.codigo} property={property} />;
  }

  const podeSolicitarReserva = Boolean(property.reservationUnitId);

  return (
    <GlassCard className="p-5 shadow-2xl shadow-cyan-950/15">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Diária inicial</p>
          <p className="mt-2 text-3xl font-semibold">{formatarPreco(property.minPrice)}</p>
        </div>
        <StatusBadge tone="info">Solicitação</StatusBadge>
      </div>

      {feedback.status === "erro" ? (
        <div
          className="mt-5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          {feedback.mensagem ?? "Não foi possível enviar a solicitação."}
        </div>
      ) : null}

      <form action={solicitarReservaPublicaAction} className="mt-6 grid gap-4">
        <input name="propertySlug" type="hidden" value={property.slug} />
        {property.reservationUnitId ? (
          <input name="unidadeId" type="hidden" value={property.reservationUnitId} />
        ) : null}

        {!podeSolicitarReserva ? (
          <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-200">
            Solicitação online em preparação para esta casa.
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Check-in">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <GlassInput
              className="h-11 pl-10"
              disabled={!podeSolicitarReserva}
              name="checkIn"
              required
              type="date"
            />
          </Field>
          <Field label="Check-out">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <GlassInput
              className="h-11 pl-10"
              disabled={!podeSolicitarReserva}
              name="checkOut"
              required
              type="date"
            />
          </Field>
        </div>

        <Field label="Hóspedes">
          <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <GlassInput
            className="h-11 pl-10"
            defaultValue={Math.min(property.maxGuests, 2)}
            disabled={!podeSolicitarReserva}
            max={property.maxGuests}
            min={1}
            name="quantidadeHospedes"
            required
            type="number"
          />
        </Field>

        <Field label="Nome do hóspede">
          <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <GlassInput
            className="h-11 pl-10"
            disabled={!podeSolicitarReserva}
            name="hospedeNome"
            required
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Telefone">
            <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <GlassInput
              className="h-11 pl-10"
              disabled={!podeSolicitarReserva}
              name="hospedeTelefone"
              required
            />
          </Field>
          <Field label="E-mail">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <GlassInput
              className="h-11 pl-10"
              disabled={!podeSolicitarReserva}
              name="hospedeEmail"
              required
              type="email"
            />
          </Field>
        </div>

        <Field label="CPF opcional">
          <GlassInput
            className="h-11"
            disabled={!podeSolicitarReserva}
            name="hospedeDocumento"
          />
        </Field>

        <label className="grid gap-2 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
          Observações
          <textarea
            className="glass-input min-h-24 w-full resize-y rounded-md px-3 py-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            disabled={!podeSolicitarReserva}
            name="observacoes"
            placeholder="Conte o motivo da viagem, horário previsto de chegada ou pedidos importantes."
          />
        </label>

        <div className="grid gap-3 rounded-lg border bg-background/70 p-4 text-sm">
          <span className="flex items-center justify-between gap-3 text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <Users className="h-4 w-4" />
              Capacidade
            </span>
            <strong className="text-foreground">{property.maxGuests} hóspedes</strong>
          </span>
          {property.pricing.cleaningFee ? (
            <span className="flex items-center justify-between gap-3 text-muted-foreground">
              <span>Taxa de limpeza</span>
              <strong className="text-foreground">
                {formatarPreco(property.pricing.cleaningFee)}
              </strong>
            </span>
          ) : null}
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

        <GlassButton
          className="w-full"
          disabled={!podeSolicitarReserva}
          size="lg"
          type="submit"
        >
          Solicitar reserva
        </GlassButton>
        <p className="text-center text-xs leading-5 text-muted-foreground">
          Pagamento online, aprovação/recusa, WhatsApp e login opcional do hóspede ficam preparados para etapas futuras.
        </p>
      </form>
    </GlassCard>
  );
}

function ReservationSuccess({
  codigo,
  property
}: {
  codigo?: string | undefined;
  property: PropriedadePublica;
}) {
  return (
    <GlassCard
      aria-live="polite"
      className="p-6 text-center shadow-2xl shadow-cyan-950/15"
      role="status"
    >
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
        <CheckCircle2 className="h-6 w-6" />
      </span>
      <h2 className="mt-5 text-xl font-semibold">Solicitação enviada com sucesso.</h2>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        O proprietário irá analisar sua reserva.
      </p>
      {codigo ? (
        <p className="mt-4 rounded-lg border bg-background/70 px-3 py-2 text-sm font-semibold">
          Código {codigo}
        </p>
      ) : null}
      <Link className={cn(buttonVariants({ size: "lg" }), "mt-6 w-full")} href={`/propriedades/${property.slug}`}>
        Voltar à propriedade
      </Link>
    </GlassCard>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="grid gap-2 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
      {label}
      <span className="relative">{children}</span>
    </label>
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
