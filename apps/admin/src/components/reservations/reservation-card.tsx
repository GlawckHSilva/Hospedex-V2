import { type PropertyRow } from "@hospedex/types";
import {
  CalendarDays,
  CreditCard,
  Eye,
  Mail,
  Pencil,
  Phone,
  UsersRound,
} from "lucide-react";
import type { ReactNode } from "react";

import { Badge, Card, CardContent } from "@hospedex/ui";

import { EntityModal, EntityViewModal } from "../management/entity-modal";
import {
  LABEL_STATUS_RESERVA,
  obterVariantStatusReserva,
  type ReservaComRelacionamentos,
} from "../../lib/reservations/types";
import { ReservationCancelDialog } from "./reservation-cancel-dialog";
import { ReservationForm } from "./reservation-form";
import { ReservationTimeline } from "./reservation-timeline";

/**
 * Card compacto de reserva para o grid operacional.
 *
 * A listagem mostra apenas o essencial. Detalhes operacionais ficam nas modais
 * para reduzir ruido visual sem alterar regras de tenant, permissoes ou status.
 */
export type ReservationCardProps = {
  podeGerenciar: boolean;
  propriedades: PropertyRow[];
  reserva: ReservaComRelacionamentos;
};

export function ReservationCard({
  podeGerenciar,
  propriedades,
  reserva,
}: ReservationCardProps) {
  const hospedePrincipal =
    reserva.hospedes.find((hospede) => hospede.is_primary) ??
    reserva.hospedes[0];
  const encerrada =
    reserva.status === "cancelled" || reserva.status === "completed";
  const nomeCasa = reserva.propriedade?.name ?? "Propriedade removida";
  const nomeHospede = hospedePrincipal?.full_name ?? "Sem hospede";
  const telefone = hospedePrincipal?.phone ?? "Nao informado";
  const email = hospedePrincipal?.email ?? "Nao informado";
  const periodo = `${formatarData(reserva.check_in)} - ${formatarData(
    reserva.check_out,
  )}`;
  const valorTotal = formatarMoeda(reserva.valorTotalComExtras);

  return (
    <Card className="group admin-glass-card h-full overflow-hidden transition duration-200">
      <CardContent className="flex h-full flex-col gap-3 p-4">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-600 dark:text-cyan-300">
              Reserva
            </p>
            <h2 className="mt-1 truncate text-base font-semibold tracking-normal">
              {reserva.code}
            </h2>
          </div>
          <Badge variant={obterVariantStatusReserva(reserva.status)}>
            {LABEL_STATUS_RESERVA[reserva.status]}
          </Badge>
        </header>

        <section className="min-w-0 space-y-2 rounded-lg border bg-background/35 p-3 text-sm">
          <LinhaCompacta icon={<UsersRound />} valor={nomeHospede} />
          <LinhaCompacta icon={<Phone />} valor={telefone} />
          <LinhaCompacta icon={<Mail />} quebrar valor={email} />
        </section>

        <section className="grid gap-2 border-t pt-3 text-sm">
          <ResumoLinha icon={<CalendarDays />} label="Periodo" valor={periodo} />
          <ResumoLinha
            destaque
            icon={<CreditCard />}
            label="Valor total"
            valor={valorTotal}
          />
        </section>

        <div className="mt-auto grid grid-cols-[1fr_1fr_auto] gap-2">
          <EntityViewModal
            description="Dados consolidados, servicos extras e linha do tempo da reserva."
            title={`Reserva ${reserva.code}`}
            triggerAction="view"
            triggerClassName="h-9 justify-center"
            triggerIcon={<Eye className="h-4 w-4" />}
            triggerLabel="Visualizar"
          >
            <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
              <ReservationTimeline reserva={reserva} />
              <div className="grid content-start gap-3">
                <InfoModal label="Casa" valor={nomeCasa} />
                <InfoModal
                  label="Status"
                  valor={LABEL_STATUS_RESERVA[reserva.status]}
                />
                <InfoModal label="Hospede" valor={nomeHospede} />
                <InfoModal label="Telefone" valor={telefone} />
                <InfoModal label="E-mail" valor={email} />
                <InfoModal label="Periodo" valor={periodo} />
                <InfoModal
                  label="Check-in"
                  valor={formatarData(reserva.check_in)}
                />
                <InfoModal
                  label="Check-out"
                  valor={formatarData(reserva.check_out)}
                />
                <InfoModal
                  label="Chegada prevista"
                  valor={formatarHorarioPrevisto(reserva.expected_checkin_time)}
                />
                <InfoModal
                  label="Saida prevista"
                  valor={formatarHorarioPrevisto(reserva.expected_checkout_time)}
                />
                <InfoModal
                  label="Hospedes"
                  valor={String(reserva.guests_count)}
                />
                <InfoModal label="Total" valor={valorTotal} />
                <ListaServicos reserva={reserva} />
              </div>
            </div>
          </EntityViewModal>

          <EntityModal
            description="Atualize periodo, hospede e valores da reserva."
            disabled={!podeGerenciar || encerrada}
            eyebrow="Edicao"
            size="xl"
            title="Editar reserva"
            triggerAction="edit"
            triggerClassName="h-9 justify-center"
            triggerIcon={<Pencil className="h-4 w-4" />}
            triggerLabel="Editar"
          >
            <ReservationForm
              modo="editar"
              podeGerenciar={podeGerenciar && !encerrada}
              propriedades={propriedades}
              reserva={reserva}
            />
          </EntityModal>

          <ReservationCancelDialog
            codigoReserva={reserva.code}
            disabled={!podeGerenciar || encerrada}
            reservaId={reserva.id}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function LinhaCompacta({
  icon,
  quebrar,
  valor,
}: {
  icon: ReactNode;
  quebrar?: boolean;
  valor: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="shrink-0 text-primary [&_svg]:h-3.5 [&_svg]:w-3.5">
        {icon}
      </span>
      <span
        className={
          quebrar
            ? "min-w-0 break-all text-muted-foreground"
            : "min-w-0 truncate text-muted-foreground"
        }
      >
        {valor}
      </span>
    </div>
  );
}

function ResumoLinha({
  destaque,
  icon,
  label,
  valor,
}: {
  destaque?: boolean;
  icon: ReactNode;
  label: string;
  valor: string;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3">
      <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
        <span className="shrink-0 text-primary [&_svg]:h-3.5 [&_svg]:w-3.5">
          {icon}
        </span>
        {label}
      </span>
      <span
        className={
          destaque
            ? "truncate font-semibold text-cyan-700 dark:text-cyan-200"
            : "truncate font-medium"
        }
      >
        {valor}
      </span>
    </div>
  );
}

function ListaServicos({ reserva }: { reserva: ReservaComRelacionamentos }) {
  if (reserva.servicosExtras.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-background/45 p-3 text-sm text-muted-foreground">
        Nenhum servico extra.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {reserva.servicosExtras.map((servico) => (
        <div
          className="rounded-lg border bg-background/55 p-3 text-sm"
          key={servico.id}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium">{servico.name}</span>
            <span className="font-semibold">
              {formatarMoeda(Number(servico.total_amount))}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {servico.quantity} x {formatarMoeda(Number(servico.unit_price))}
          </p>
        </div>
      ))}
    </div>
  );
}

function InfoModal({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-lg border bg-background/45 p-3 text-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 break-words font-medium">{valor}</p>
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

function formatarHorarioPrevisto(valor: string | null): string {
  return valor ? valor.slice(0, 5) : "Nao informado pelo hospede";
}
