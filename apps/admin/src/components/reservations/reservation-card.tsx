import {
  type PropertyRow,
  type UnitRow
} from "@hospedex/types";
import {
  Ban,
  CalendarDays,
  CreditCard,
  ListChecks,
  MessageSquarePlus,
  UserRound
} from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

import { Badge, Button, Card, CardContent, Input, Label } from "@hospedex/ui";

import {
  adicionarObservacaoReservaAction,
  adicionarServicoExtraReservaAction,
  alterarStatusReservaAction,
  cancelarReservaAction
} from "../../lib/reservations/actions";
import {
  LABEL_STATUS_RESERVA,
  STATUS_RESERVA,
  obterVariantStatusReserva,
  type ReservaComRelacionamentos
} from "../../lib/reservations/types";
import { ReservationForm } from "./reservation-form";
import { ReservationTimeline } from "./reservation-timeline";

/**
 * Card operacional de reserva.
 *
 * Mantém ações manuais básicas sem implementar gateway, calendário ou integrações.
 * Cada mutation volta ao servidor para validar tenant, permissão e transição.
 */

export type ReservationCardProps = {
  podeGerenciar: boolean;
  propriedades: PropertyRow[];
  reserva: ReservaComRelacionamentos;
  unidades: UnitRow[];
};

const campoClasse =
  "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
const areaClasse =
  "min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export function ReservationCard({
  podeGerenciar,
  propriedades,
  reserva,
  unidades
}: ReservationCardProps) {
  const hospedePrincipal = reserva.hospedes.find((hospede) => hospede.is_primary) ?? reserva.hospedes[0];
  const encerrada = reserva.status === "cancelled" || reserva.status === "completed";

  return (
    <Card className="admin-glass-card">
      <CardContent className="space-y-5 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold">{reserva.code}</h2>
              <Badge variant={obterVariantStatusReserva(reserva.status)}>
                {LABEL_STATUS_RESERVA[reserva.status]}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {reserva.propriedade?.name ?? "Propriedade removida"}
              {reserva.unidade ? ` · ${reserva.unidade.name}` : ""}
            </p>
          </div>

          <div className="grid gap-2 text-sm sm:grid-cols-3 lg:min-w-[28rem]">
            <ResumoReserva
              icone={<CalendarDays />}
              label="Período"
              valor={`${formatarData(reserva.check_in)} - ${formatarData(reserva.check_out)}`}
            />
            <ResumoReserva
              icone={<UserRound />}
              label="Hóspedes"
              valor={`${reserva.guests_count}`}
            />
            <ResumoReserva
              icone={<CreditCard />}
              label="Total"
              valor={formatarMoeda(reserva.valorTotalComExtras)}
            />
          </div>
        </div>

        <section className="grid gap-3 md:grid-cols-3">
          <Info label="Hóspede" valor={hospedePrincipal?.full_name ?? "Sem hóspede"} />
          <Info label="Telefone" valor={hospedePrincipal?.phone ?? "Não informado"} />
          <Info label="E-mail" valor={hospedePrincipal?.email ?? "Não informado"} />
        </section>

        <div className="grid gap-3 lg:grid-cols-2">
          <details className="rounded-lg border bg-background/45 p-3">
            <summary className="cursor-pointer text-sm font-semibold">Editar reserva</summary>
            <div className="mt-4">
              <ReservationForm
                modo="editar"
                podeGerenciar={podeGerenciar && !encerrada}
                propriedades={propriedades}
                reserva={reserva}
                unidades={unidades}
              />
            </div>
          </details>

          <details className="rounded-lg border bg-background/45 p-3">
            <summary className="cursor-pointer text-sm font-semibold">Alterar status</summary>
            <form action={alterarStatusReservaAction} className="mt-4 grid gap-3">
              <input name="reservaId" type="hidden" value={reserva.id} />
              <div className="grid gap-2">
                <Label htmlFor={`status-${reserva.id}`}>Status</Label>
                <select
                  className={campoClasse}
                  defaultValue={reserva.status}
                  disabled={!podeGerenciar || encerrada}
                  id={`status-${reserva.id}`}
                  name="status"
                >
                  {STATUS_RESERVA.map((status) => (
                    <option key={status} value={status}>
                      {LABEL_STATUS_RESERVA[status]}
                    </option>
                  ))}
                </select>
              </div>
              <CampoArea disabled={!podeGerenciar || encerrada} label="Motivo" name="motivo" />
              <Button disabled={!podeGerenciar || encerrada} type="submit">
                <ListChecks />
                Atualizar status
              </Button>
            </form>
          </details>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <details className="rounded-lg border bg-background/45 p-3">
            <summary className="cursor-pointer text-sm font-semibold">Serviços extras</summary>
            <div className="mt-4 space-y-4">
              <ListaServicos reserva={reserva} />
              <form action={adicionarServicoExtraReservaAction} className="grid gap-3">
                <input name="reservaId" type="hidden" value={reserva.id} />
                <CampoTexto disabled={!podeGerenciar || encerrada} label="Nome" name="servicoExtraNome" required />
                <div className="grid gap-3 sm:grid-cols-2">
                  <CampoTexto
                    defaultValue="1"
                    disabled={!podeGerenciar || encerrada}
                    label="Quantidade"
                    min={1}
                    name="servicoExtraQuantidade"
                    required
                    type="number"
                  />
                  <CampoTexto
                    defaultValue="0"
                    disabled={!podeGerenciar || encerrada}
                    label="Valor"
                    min={0}
                    name="servicoExtraValor"
                    required
                    step="0.01"
                    type="number"
                  />
                </div>
                <CampoArea
                  disabled={!podeGerenciar || encerrada}
                  label="Descrição"
                  name="servicoExtraDescricao"
                />
                <Button disabled={!podeGerenciar || encerrada} type="submit" variant="outline">
                  Adicionar serviço
                </Button>
              </form>
            </div>
          </details>

          <details className="rounded-lg border bg-background/45 p-3">
            <summary className="cursor-pointer text-sm font-semibold">Cancelamento</summary>
            <form action={cancelarReservaAction} className="mt-4 grid gap-3">
              <input name="reservaId" type="hidden" value={reserva.id} />
              <CampoArea
                disabled={!podeGerenciar || reserva.status === "cancelled"}
                label="Motivo do cancelamento"
                name="motivo"
              />
              <Button
                disabled={!podeGerenciar || reserva.status === "cancelled"}
                type="submit"
                variant="destructive"
              >
                <Ban />
                Cancelar reserva
              </Button>
            </form>
          </details>
        </div>

        <details className="rounded-lg border bg-background/45 p-3" open>
          <summary className="cursor-pointer text-sm font-semibold">Timeline</summary>
          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_22rem]">
            <ReservationTimeline reserva={reserva} />
            <form action={adicionarObservacaoReservaAction} className="grid content-start gap-3">
              <input name="reservaId" type="hidden" value={reserva.id} />
              <CampoArea
                disabled={!podeGerenciar}
                label="Nova observação interna"
                name="observacao"
              />
              <Button disabled={!podeGerenciar} type="submit" variant="outline">
                <MessageSquarePlus />
                Adicionar observação
              </Button>
            </form>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}

function ListaServicos({ reserva }: { reserva: ReservaComRelacionamentos }) {
  if (reserva.servicosExtras.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-background/45 p-3 text-sm text-muted-foreground">
        Nenhum serviço extra.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {reserva.servicosExtras.map((servico) => (
        <div className="rounded-lg border bg-background/55 p-3 text-sm" key={servico.id}>
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium">{servico.name}</span>
            <span className="font-semibold">{formatarMoeda(Number(servico.total_amount))}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {servico.quantity} x {formatarMoeda(Number(servico.unit_price))}
          </p>
        </div>
      ))}
    </div>
  );
}

function ResumoReserva({
  icone,
  label,
  valor
}: {
  icone: ReactNode;
  label: string;
  valor: string;
}) {
  return (
    <div className="rounded-lg border bg-background/55 p-3">
      <div className="mb-2 text-primary [&_svg]:h-4 [&_svg]:w-4">{icone}</div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate font-semibold">{valor}</p>
    </div>
  );
}

function Info({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-lg border bg-background/45 p-3 text-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-medium">{valor}</p>
    </div>
  );
}

function CampoTexto({
  label,
  name,
  ...props
}: {
  label: string;
  name: string;
} & ComponentProps<typeof Input>) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} {...props} />
    </div>
  );
}

function CampoArea({
  defaultValue,
  disabled,
  label,
  name
}: {
  defaultValue?: string;
  disabled: boolean;
  label: string;
  name: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <textarea
        className={areaClasse}
        defaultValue={defaultValue}
        disabled={disabled}
        id={name}
        name={name}
      />
    </div>
  );
}

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency"
  }).format(valor);
}

function formatarData(valor: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(
    new Date(`${valor}T00:00:00`)
  );
}
