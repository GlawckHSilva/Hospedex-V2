import { type PropertyRow } from "@hospedex/types";
import { CalendarDays, CreditCard, Eye, Home, UserRound } from "lucide-react";
import type { ReactNode } from "react";

import { Badge, Card, CardContent } from "@hospedex/ui";

import {
  LABEL_STATUS_PAGAMENTO_RESERVA,
  LABEL_STATUS_RESERVA,
  obterVariantStatusPagamentoReserva,
  obterVariantStatusReserva,
  reservaPermiteAcoesFinanceiras,
  type ReservaComRelacionamentos,
} from "../../lib/reservations/types";
import { EntityModal } from "../management/entity-modal";
import { ReservationActionMenu } from "./reservation-action-menu";
import { ReservationDetails } from "./reservation-details";

/**
 * Card mobile da central de Reservas.
 *
 * Reservas e Pendencias possuem objetivos diferentes: aqui o card e apenas
 * resumo de historico/gestao. Acoes operacionais ficam fora do corpo do card.
 */
export type ReservationCardProps = {
  podeGerenciar: boolean;
  podeGerenciarPagamento: boolean;
  propriedades: PropertyRow[];
  reserva: ReservaComRelacionamentos;
};

export function ReservationCard({
  podeGerenciar,
  podeGerenciarPagamento,
  propriedades,
  reserva,
}: ReservationCardProps) {
  const hospedePrincipal =
    reserva.hospedes.find((hospede) => hospede.is_primary) ??
    reserva.hospedes[0];
  const nomeCasa = reserva.propriedade?.name ?? "Propriedade removida";
  const nomeHospede = hospedePrincipal?.full_name ?? "Sem hospede";
  const periodo = `${formatarData(reserva.check_in)} - ${formatarData(
    reserva.check_out,
  )}`;

  return (
    <Card className="admin-glass-card overflow-hidden">
      <CardContent className="grid gap-4 p-4">
        <header className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-600 dark:text-cyan-300">
                Reserva
              </p>
              <h2 className="mt-1 truncate text-base font-semibold tracking-normal">
                {reserva.code}
              </h2>
            </div>
            <strong className="shrink-0 text-sm text-cyan-700 dark:text-cyan-200">
              {formatarMoeda(reserva.valorTotalComExtras)}
            </strong>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant={obterVariantStatusReserva(reserva.status)}>
              {LABEL_STATUS_RESERVA[reserva.status]}
            </Badge>
            <Badge variant={obterVariantStatusPagamentoReserva(reserva.statusPagamento)}>
              {LABEL_STATUS_PAGAMENTO_RESERVA[reserva.statusPagamento]}
            </Badge>
          </div>
        </header>

        <section className="grid gap-2 text-sm">
          <LinhaResumo icon={<UserRound />} label="Hospede" valor={nomeHospede} />
          <LinhaResumo icon={<Home />} label="Casa" valor={nomeCasa} />
          <LinhaResumo icon={<CalendarDays />} label="Periodo" valor={periodo} />
          <LinhaResumo
            icon={<CreditCard />}
            label="Total"
            valor={formatarMoeda(reserva.valorTotalComExtras)}
          />
        </section>

        <div className="grid grid-cols-[1fr_auto] gap-2">
          <EntityModal
            description="Dados consolidados, hóspede, casa, período, valores, financeiro e timeline."
            eyebrow="Visualização"
            size="xl"
            title={`Reserva ${reserva.code}`}
            triggerAction="view"
            triggerClassName="w-full justify-center"
            triggerIcon={<Eye className="h-4 w-4" />}
            triggerLabel="Ver detalhes"
          >
            <ReservationDetails
              podeGerenciarPagamento={
                podeGerenciarPagamento && reservaPermiteAcoesFinanceiras(reserva.status)
              }
              reserva={reserva}
            />
          </EntityModal>
          <ReservationActionMenu
            podeGerenciar={podeGerenciar}
            podeGerenciarPagamento={
              podeGerenciarPagamento && reservaPermiteAcoesFinanceiras(reserva.status)
            }
            propriedades={propriedades}
            reserva={reserva}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function LinhaResumo({
  icon,
  label,
  valor,
}: {
  icon: ReactNode;
  label: string;
  valor: string;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-lg border bg-background/35 px-3 py-2">
      <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
        <span className="shrink-0 text-primary [&_svg]:h-3.5 [&_svg]:w-3.5">
          {icon}
        </span>
        {label}
      </span>
      <span className="min-w-0 truncate text-right font-medium">{valor}</span>
    </div>
  );
}

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(valor);
}

function formatarData(valor: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(
    new Date(`${valor}T00:00:00`),
  );
}
