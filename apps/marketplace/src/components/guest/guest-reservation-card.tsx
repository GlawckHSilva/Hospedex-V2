import {
  CalendarDays,
  CreditCard,
  Home,
  MapPin,
  Users,
  WalletCards,
  XCircle
} from "lucide-react";
import Link from "next/link";

import { GlassCard, StatusBadge, buttonVariants, cn } from "@hospedex/ui";

import {
  formatarDataHospede,
  formatarMoedaHospede,
  LABEL_FORMA_PAGAMENTO,
  LABEL_STATUS_PAGAMENTO,
  LABEL_STATUS_RESERVA,
  MENSAGEM_STATUS_RESERVA,
  tomStatusPagamento,
  tomStatusReserva
} from "../../lib/guest/format";
import { formatarQuantidade } from "../../lib/format";
import type { ReservaHospedeResumo } from "../../lib/guest/types";

export function GuestReservationCard({ reserva }: { reserva: ReservaHospedeResumo }) {
  const propriedade = reserva.propriedade;
  const formaPagamento = reserva.formaPagamento
    ? LABEL_FORMA_PAGAMENTO[reserva.formaPagamento]
    : "Não informada";

  return (
    <GlassCard className="overflow-hidden p-0">
      <div className="grid gap-0 md:grid-cols-[220px_1fr]">
        <div className="relative min-h-48 bg-secondary">
          {propriedade?.imagemCapa ? (
            <img
              alt={`Foto de ${propriedade.nome}`}
              className="h-full w-full object-cover"
              src={propriedade.imagemCapa}
            />
          ) : (
            <div className="premium-grid-bg h-full w-full" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/70 to-transparent" />
        </div>

        <div className="grid gap-5 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">
                Reserva {reserva.codigo}
              </p>
              <h2 className="mt-2 text-xl font-semibold">
                {propriedade?.nome ?? "Casa indisponível"}
              </h2>
              <p className="mt-2 inline-flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {[propriedade?.cidade, propriedade?.estado].filter(Boolean).join(" / ") ||
                  "Localização não informada"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge tone={tomStatusReserva(reserva.status)}>
                {LABEL_STATUS_RESERVA[reserva.status]}
              </StatusBadge>
              <StatusBadge tone={tomStatusPagamento(reserva.statusPagamento)}>
                {LABEL_STATUS_PAGAMENTO[reserva.statusPagamento]}
              </StatusBadge>
            </div>
          </div>

          <p className="text-sm leading-6 text-muted-foreground">
            {MENSAGEM_STATUS_RESERVA[reserva.status] ??
              "Acompanhe os detalhes da sua reserva."}
          </p>

          <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <Resumo icon={CalendarDays} label="Check-in" value={formatarDataHospede(reserva.checkIn)} />
            <Resumo icon={CalendarDays} label="Check-out" value={formatarDataHospede(reserva.checkOut)} />
            <Resumo
              icon={Users}
              label="Hóspedes"
              value={formatarQuantidade(
                reserva.hospedesQuantidade,
                "hóspede",
                "hóspedes",
              )}
            />
            <Resumo icon={WalletCards} label="Total" value={formatarMoedaHospede(reserva.total)} />
          </div>

          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <CreditCard className="h-4 w-4 text-primary" />
              {formaPagamento}
            </span>
            <div className="flex flex-wrap gap-2">
              <Link
                className={cn(buttonVariants({ size: "sm", variant: "default" }))}
                href={`/minhas-reservas/${reserva.id}`}
              >
                Ver detalhes
              </Link>
              {reservaPermiteCancelamentoHospede(reserva.status) ? (
                <Link
                  className={cn(buttonVariants({ size: "sm", variant: "destructive" }))}
                  href={`/minhas-reservas/${reserva.id}#cancelamento`}
                >
                  <XCircle className="h-4 w-4" />
                  Cancelar
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

function reservaPermiteCancelamentoHospede(status: ReservaHospedeResumo["status"]) {
  return ["pending", "awaiting_payment", "confirmed"].includes(status);
}

function Resumo({
  icon: Icone,
  label,
  value
}: {
  icon: typeof Home;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border bg-background/45 p-3">
      <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
        <Icone className="h-4 w-4 text-primary" />
        {label}
      </span>
      <strong className="mt-2 block text-base text-foreground">{value}</strong>
    </div>
  );
}
