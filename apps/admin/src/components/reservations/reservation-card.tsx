import { type PropertyRow } from "@hospedex/types";
import {
  CalendarDays,
  CreditCard,
  Eye,
  Mail,
  Pencil,
  Phone,
  Tag,
  UsersRound,
} from "lucide-react";
import type { ReactNode } from "react";

import { Badge, Card, CardContent } from "@hospedex/ui";

import { EntityModal } from "../management/entity-modal";
import {
  LABEL_ORIGEM_RESERVA,
  LABEL_STATUS_PAGAMENTO_RESERVA,
  LABEL_STATUS_RESERVA,
  obterVariantStatusPagamentoReserva,
  obterVariantStatusReserva,
  type ReservaComRelacionamentos,
} from "../../lib/reservations/types";
import { ReservationDetails } from "./reservation-details";
import { ReservationForm } from "./reservation-form";
import { ReservationStatusActions } from "./reservation-status-actions";

/**
 * Card compacto de reserva para o grid operacional.
 *
 * A listagem mostra apenas o essencial. Detalhes operacionais ficam nas modais
 * para reduzir ruido visual sem alterar regras de tenant, permissoes ou status.
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

        <div className="flex flex-wrap gap-2">
          <Badge variant={obterVariantStatusPagamentoReserva(reserva.statusPagamento)}>
            {LABEL_STATUS_PAGAMENTO_RESERVA[reserva.statusPagamento]}
          </Badge>
          <Badge variant="outline">{LABEL_ORIGEM_RESERVA[reserva.source]}</Badge>
        </div>

        <section className="min-w-0 space-y-2 rounded-lg border bg-background/35 p-3 text-sm">
          <LinhaCompacta icon={<UsersRound />} valor={nomeHospede} />
          <LinhaCompacta icon={<Phone />} valor={telefone} />
          <LinhaCompacta icon={<Mail />} quebrar valor={email} />
        </section>

        <section className="grid gap-2 border-t pt-3 text-sm">
          <ResumoLinha icon={<Tag />} label="Casa" valor={nomeCasa} />
          <ResumoLinha icon={<CalendarDays />} label="Periodo" valor={periodo} />
          <ResumoLinha
            destaque
            icon={<CreditCard />}
            label="Valor total"
            valor={valorTotal}
          />
        </section>

        <div className="mt-auto grid gap-2 sm:grid-cols-3">
          <EntityModal
            description="Dados consolidados, hospede, casa, periodo, valores, financeiro e timeline."
            eyebrow="Visualizacao"
            size="xl"
            title={`Reserva ${reserva.code}`}
            triggerAction="view"
            triggerClassName="h-9 justify-center"
            triggerIcon={<Eye className="h-4 w-4" />}
            triggerLabel="Visualizar"
          >
            <ReservationDetails
              podeGerenciarPagamento={podeGerenciarPagamento && !encerrada}
              reserva={reserva}
            />
          </EntityModal>

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

          <ReservationStatusActions
            podeGerenciar={podeGerenciar && !encerrada}
            podeGerenciarPagamento={podeGerenciarPagamento && !encerrada}
            reserva={reserva}
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
