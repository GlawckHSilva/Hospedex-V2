import { type PropertyRow, type UnitRow } from "@hospedex/types";
import {
  Ban,
  CalendarDays,
  CreditCard,
  Eye,
  Home,
  ListChecks,
  LogIn,
  LogOut,
  Mail,
  MessageSquarePlus,
  Pencil,
  Phone,
  UsersRound,
} from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

import { Badge, Button, Card, CardContent, Input, Label } from "@hospedex/ui";

import {
  ConfirmDialog,
  EntityModal,
  EntityViewModal,
} from "../management/entity-modal";
import {
  adicionarObservacaoReservaAction,
  adicionarServicoExtraReservaAction,
  alterarStatusReservaAction,
  cancelarReservaAction,
} from "../../lib/reservations/actions";
import {
  LABEL_STATUS_RESERVA,
  STATUS_RESERVA,
  obterVariantStatusReserva,
  type ReservaComRelacionamentos,
} from "../../lib/reservations/types";
import { ReservationForm } from "./reservation-form";
import { ReservationTimeline } from "./reservation-timeline";

/**
 * Card compacto de reserva para o grid operacional.
 *
 * Todas as ações mutáveis continuam validadas no servidor para preservar tenant,
 * permissões e transições de status; o card apenas organiza a experiência visual.
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
  "min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export function ReservationCard({
  podeGerenciar,
  propriedades,
  reserva,
  unidades,
}: ReservationCardProps) {
  const hospedePrincipal =
    reserva.hospedes.find((hospede) => hospede.is_primary) ??
    reserva.hospedes[0];
  const encerrada =
    reserva.status === "cancelled" || reserva.status === "completed";
  const nomeCasa = reserva.propriedade?.name ?? "Propriedade removida";
  const nomeUnidade = reserva.unidade?.name;
  const nomeHospede = hospedePrincipal?.full_name ?? "Sem hóspede";
  const telefone = hospedePrincipal?.phone ?? "Não informado";
  const email = hospedePrincipal?.email ?? "Não informado";
  const periodo = `${formatarData(reserva.check_in)} - ${formatarData(
    reserva.check_out,
  )}`;

  return (
    <Card className="group admin-glass-card h-full overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:border-cyan-300/40 hover:shadow-xl hover:shadow-cyan-950/10">
      <CardContent className="flex h-full flex-col gap-4 p-4 sm:p-5">
        <header className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-600 dark:text-cyan-300">
                Reserva
              </p>
              <h2 className="mt-1 truncate text-xl font-semibold tracking-normal">
                {reserva.code}
              </h2>
            </div>
            <Badge variant={obterVariantStatusReserva(reserva.status)}>
              {LABEL_STATUS_RESERVA[reserva.status]}
            </Badge>
          </div>

          <div className="flex items-center gap-2 rounded-lg border bg-background/45 px-3 py-2 text-sm">
            <Home className="h-4 w-4 shrink-0 text-primary" />
            <span className="min-w-0 truncate font-medium">
              {nomeCasa}
              {nomeUnidade ? ` · ${nomeUnidade}` : ""}
            </span>
          </div>
        </header>

        <section className="grid gap-2 text-sm">
          <InfoCard label="Hóspede" valor={nomeHospede} />
          <div className="grid gap-2 sm:grid-cols-2">
            <InfoCard icon={<Phone />} label="Telefone" valor={telefone} />
            <InfoCard icon={<Mail />} label="E-mail" valor={email} quebrar />
          </div>
        </section>

        <section className="grid gap-2 sm:grid-cols-2">
          <MetricCard
            className="sm:col-span-2"
            icon={<CalendarDays />}
            label="Período"
            valor={periodo}
          />
          <MetricCard
            icon={<LogIn />}
            label="Check-in"
            valor={formatarData(reserva.check_in)}
          />
          <MetricCard
            icon={<LogOut />}
            label="Check-out"
            valor={formatarData(reserva.check_out)}
          />
          <MetricCard
            icon={<UsersRound />}
            label="Hóspedes"
            valor={String(reserva.guests_count)}
          />
          <MetricCard
            icon={<CreditCard />}
            label="Total"
            valor={formatarMoeda(reserva.valorTotalComExtras)}
          />
        </section>

        <div className="mt-auto grid grid-cols-2 gap-2">
          <EntityViewModal
            description="Dados consolidados, serviços extras e linha do tempo da reserva."
            title={`Reserva ${reserva.code}`}
            triggerClassName="h-9 justify-center"
            triggerIcon={<Eye className="h-4 w-4" />}
            triggerLabel="Visualizar"
          >
            <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
              <ReservationTimeline reserva={reserva} />
              <div className="grid content-start gap-3">
                <InfoModal label="Casa" valor={nomeCasa} />
                <InfoModal label="Hóspede" valor={nomeHospede} />
                <InfoModal label="Telefone" valor={telefone} />
                <InfoModal label="E-mail" valor={email} />
                <InfoModal label="Período" valor={periodo} />
                <ListaServicos reserva={reserva} />
              </div>
            </div>
          </EntityViewModal>

          <EntityModal
            description="Atualize período, hóspede, unidade e valores da reserva."
            disabled={!podeGerenciar || encerrada}
            eyebrow="Edição"
            size="xl"
            title="Editar reserva"
            triggerClassName="h-9 justify-center"
            triggerIcon={<Pencil className="h-4 w-4" />}
            triggerLabel="Editar"
          >
            <ReservationForm
              modo="editar"
              podeGerenciar={podeGerenciar && !encerrada}
              propriedades={propriedades}
              reserva={reserva}
              unidades={unidades}
            />
          </EntityModal>

          <EntityModal
            description="Registre a transição com motivo para manter rastreabilidade."
            disabled={!podeGerenciar || encerrada}
            eyebrow="Status"
            size="sm"
            title="Alterar status"
            triggerClassName="h-9 justify-center"
            triggerIcon={<ListChecks className="h-4 w-4" />}
            triggerLabel="Status"
          >
            <form action={alterarStatusReservaAction} className="grid gap-3">
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
              <CampoArea
                disabled={!podeGerenciar || encerrada}
                label="Motivo"
                name="motivo"
              />
              <Button disabled={!podeGerenciar || encerrada} type="submit">
                <ListChecks />
                Atualizar status
              </Button>
            </form>
          </EntityModal>

          <EntityModal
            description="Inclua serviços extras vinculados a esta reserva."
            disabled={!podeGerenciar || encerrada}
            eyebrow="Serviços"
            size="lg"
            title="Serviços extras"
            triggerClassName="h-9 justify-center"
            triggerIcon={<CreditCard className="h-4 w-4" />}
            triggerLabel="Serviços"
          >
            <div className="space-y-4">
              <ListaServicos reserva={reserva} />
              <form
                action={adicionarServicoExtraReservaAction}
                className="grid gap-3"
              >
                <input name="reservaId" type="hidden" value={reserva.id} />
                <CampoTexto
                  disabled={!podeGerenciar || encerrada}
                  label="Nome"
                  name="servicoExtraNome"
                  required
                />
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
                <Button
                  disabled={!podeGerenciar || encerrada}
                  type="submit"
                  variant="outline"
                >
                  Adicionar serviço
                </Button>
              </form>
            </div>
          </EntityModal>

          <EntityModal
            description="Adicione uma observação interna visível apenas no Gerenciamento."
            disabled={!podeGerenciar}
            eyebrow="Observação"
            size="md"
            title="Nova observação interna"
            triggerClassName="h-9 justify-center"
            triggerIcon={<MessageSquarePlus className="h-4 w-4" />}
            triggerLabel="Observação"
          >
            <form
              action={adicionarObservacaoReservaAction}
              className="grid content-start gap-3"
            >
              <input name="reservaId" type="hidden" value={reserva.id} />
              <CampoArea
                disabled={!podeGerenciar}
                label="Observação interna"
                name="observacao"
              />
              <Button disabled={!podeGerenciar} type="submit" variant="outline">
                <MessageSquarePlus />
                Adicionar observação
              </Button>
            </form>
          </EntityModal>

          <ConfirmDialog
            description="O cancelamento altera o status da reserva e registra o motivo."
            disabled={!podeGerenciar || reserva.status === "cancelled"}
            title="Cancelar reserva"
            triggerClassName="h-9 justify-center"
            triggerIcon={<Ban className="h-4 w-4" />}
            triggerLabel="Cancelar"
          >
            <form action={cancelarReservaAction} className="grid gap-3">
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
          </ConfirmDialog>
        </div>
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

function InfoCard({
  icon,
  label,
  quebrar,
  valor,
}: {
  icon?: ReactNode;
  label: string;
  quebrar?: boolean;
  valor: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border bg-background/45 p-3">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon ? (
          <span className="[&_svg]:h-3.5 [&_svg]:w-3.5">{icon}</span>
        ) : null}
        {label}
      </p>
      <p
        className={
          quebrar
            ? "mt-1 break-all text-sm font-medium"
            : "mt-1 truncate text-sm font-medium"
        }
      >
        {valor}
      </p>
    </div>
  );
}

function MetricCard({
  className,
  icon,
  label,
  valor,
}: {
  className?: string;
  icon: ReactNode;
  label: string;
  valor: string;
}) {
  return (
    <div
      className={`rounded-lg border bg-background/55 p-3 ${className ?? ""}`}
    >
      <div className="mb-2 text-primary [&_svg]:h-4 [&_svg]:w-4">{icon}</div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-semibold">{valor}</p>
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
  name,
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
    style: "currency",
  }).format(valor);
}

function formatarData(valor: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(
    new Date(`${valor}T00:00:00`),
  );
}
