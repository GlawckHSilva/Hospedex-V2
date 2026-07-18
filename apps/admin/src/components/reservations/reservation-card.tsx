import { type PropertyRow } from "@hospedex/types";
import { CalendarDays, Clock3, Eye, Home, Pencil, Phone } from "lucide-react";

import { Badge, Card, CardContent, cn } from "@hospedex/ui";

import {
  LABEL_ORIGEM_RESERVA,
  LABEL_STATUS_PAGAMENTO_RESERVA,
  LABEL_STATUS_RESERVA,
  obterVariantStatusPagamentoReserva,
  obterVariantStatusReserva,
  reservaEstaEncerrada,
  reservaPermiteAcoesFinanceiras,
  type ReservaComRelacionamentos,
} from "../../lib/reservations/types";
import { EntityModal } from "../management/entity-modal";
import { ReservationActionMenu } from "./reservation-action-menu";
import { ReservationDetails } from "./reservation-details";
import { ReservationForm } from "./reservation-form";

export type ReservationCardProps = {
  podeGerenciar: boolean;
  podeGerenciarPagamento: boolean;
  propriedades: PropertyRow[];
  reserva: ReservaComRelacionamentos;
};

type StatusReservaCard = ReservaComRelacionamentos["status"];

const estiloPorStatus: Record<StatusReservaCard, string> = {
  awaiting_payment:
    "border-l-amber-400/90 bg-amber-500/[0.04] shadow-amber-950/10",
  cancelled: "border-l-red-400/90 bg-red-500/[0.04] shadow-red-950/10",
  checked_in:
    "border-l-violet-400/90 bg-violet-500/[0.04] shadow-violet-950/10",
  checked_out: "border-l-cyan-400/80 bg-cyan-500/[0.035] shadow-cyan-950/10",
  completed:
    "border-l-emerald-400/65 bg-emerald-500/[0.03] shadow-emerald-950/10",
  confirmed:
    "border-l-emerald-400/90 bg-emerald-500/[0.04] shadow-emerald-950/10",
  pending: "border-l-cyan-400/90 bg-cyan-500/[0.04] shadow-cyan-950/10",
};

const corValorPorStatus: Record<StatusReservaCard, string> = {
  awaiting_payment: "text-amber-300",
  cancelled: "text-red-300",
  checked_in: "text-violet-300",
  checked_out: "text-cyan-200",
  completed: "text-emerald-200",
  confirmed: "text-emerald-300",
  pending: "text-cyan-200",
};

/**
 * Card compacto de reserva.
 *
 * Centraliza a leitura operacional sem expor tabela: status da reserva,
 * pagamento e ações ficam visíveis, enquanto alterações continuam em modais.
 */
export function ReservationCard({
  podeGerenciar,
  podeGerenciarPagamento,
  propriedades,
  reserva,
}: ReservationCardProps) {
  const hospedePrincipal =
    reserva.hospedes.find((hospede) => hospede.is_primary) ??
    reserva.hospedes[0];
  const nomeCasa = reserva.propriedade?.name ?? "Casa removida";
  const nomeHospede = hospedePrincipal?.full_name ?? "Sem hóspede";
  const telefoneHospede = hospedePrincipal?.phone ?? "Telefone não informado";
  const totalDiarias = calcularDiarias(reserva.check_in, reserva.check_out);
  const podeOperarFinanceiro =
    podeGerenciarPagamento && reservaPermiteAcoesFinanceiras(reserva.status);
  const encerrada = reservaEstaEncerrada(reserva.status);

  return (
    <Card
      className={cn(
        "admin-glass-card overflow-hidden border-l-4",
        estiloPorStatus[reserva.status],
      )}
    >
      <CardContent className="grid gap-4 p-4 sm:p-5">
        <header className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h2
                className="max-w-full truncate font-mono text-sm font-semibold tracking-normal text-foreground"
                title={reserva.code}
              >
                {reserva.code}
              </h2>
              <Badge className="shrink-0" variant="outline">
                {LABEL_ORIGEM_RESERVA[reserva.source]}
              </Badge>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            <Badge
              className="whitespace-nowrap"
              variant={obterVariantStatusReserva(reserva.status)}
            >
              {LABEL_STATUS_RESERVA[reserva.status]}
            </Badge>
            <Badge
              className="whitespace-nowrap"
              variant={obterVariantStatusPagamentoReserva(
                reserva.statusPagamento,
              )}
            >
              {LABEL_STATUS_PAGAMENTO_RESERVA[reserva.statusPagamento]}
            </Badge>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_auto] md:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <AvatarHospede
              avatarUrl={reserva.hospedePerfil?.avatar_url ?? null}
              nome={reserva.hospedePerfil?.full_name ?? nomeHospede}
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {nomeHospede}
              </p>
              <p className="mt-1 flex min-w-0 items-center gap-1.5 truncate text-xs text-muted-foreground">
                <Phone className="h-3.5 w-3.5 shrink-0 text-cyan-300/80" />
                <span className="truncate">{telefoneHospede}</span>
              </p>
            </div>
          </div>

          <div className="grid min-w-0 gap-1.5 text-sm">
            <p
              className={cn(
                "flex min-w-0 items-center gap-2 font-medium text-foreground",
                !reserva.propriedade && "text-muted-foreground",
              )}
              title={
                reserva.propriedade
                  ? nomeCasa
                  : "Esta casa foi removida, mas a reserva foi mantida no histórico."
              }
            >
              <Home className="h-4 w-4 shrink-0 text-cyan-300/80" />
              <span className="truncate">{nomeCasa}</span>
            </p>
            <p className="flex min-w-0 items-center gap-2 text-muted-foreground">
              <CalendarDays className="h-4 w-4 shrink-0 text-cyan-300/80" />
              <span className="truncate">
                {formatarData(reserva.check_in)} -{" "}
                {formatarData(reserva.check_out)}
              </span>
            </p>
            <p className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
              <Clock3 className="h-4 w-4 shrink-0 text-cyan-300/80" />
              <span>
                {totalDiarias} {totalDiarias === 1 ? "diária" : "diárias"}
              </span>
            </p>
          </div>

          <strong
            className={cn(
              "text-right text-lg font-semibold leading-none md:min-w-28",
              corValorPorStatus[reserva.status],
            )}
          >
            {formatarMoeda(reserva.valorTotalComExtras)}
          </strong>
        </section>

        <footer className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:flex sm:justify-end">
          <EntityModal
            description="Dados consolidados, hóspede, casa, período, valores, financeiro e timeline."
            eyebrow="Visualização"
            size="xl"
            title={`Reserva ${reserva.code}`}
            triggerAction="view"
            triggerClassName="w-full justify-center sm:w-auto sm:min-w-36"
            triggerIcon={<Eye className="h-4 w-4" />}
            triggerLabel="Ver detalhes"
          >
            <ReservationDetails
              podeGerenciarPagamento={podeOperarFinanceiro}
              reserva={reserva}
            />
          </EntityModal>

          {!encerrada ? (
            <EntityModal
              description="Atualize período, hóspede e valores da reserva."
              disabled={!podeGerenciar}
              eyebrow="Edição"
              size="xl"
              title="Editar reserva"
              triggerAction="edit"
              triggerClassName="w-full justify-center sm:w-auto sm:min-w-28"
              triggerIcon={<Pencil className="h-4 w-4" />}
              triggerLabel="Editar"
            >
              <ReservationForm
                modo="editar"
                podeGerenciar={podeGerenciar}
                propriedades={propriedades}
                reserva={reserva}
              />
            </EntityModal>
          ) : null}

          <ReservationActionMenu
            mostrarEditar={false}
            podeGerenciar={podeGerenciar}
            podeGerenciarPagamento={podeOperarFinanceiro}
            propriedades={propriedades}
            reserva={reserva}
          />
        </footer>
      </CardContent>
    </Card>
  );
}

function AvatarHospede({
  avatarUrl,
  nome
}: {
  avatarUrl: string | null;
  nome: string;
}) {
  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-cyan-400/25 bg-cyan-500/15 text-sm font-bold text-cyan-100 shadow-inner shadow-cyan-950/40">
      {avatarUrl ? (

        <img alt="" className="h-full w-full object-cover" src={avatarUrl} />
      ) : (
        obterIniciais(nome)
      )}
    </span>
  );
}

function obterIniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  const primeira = partes[0]?.[0] ?? "H";
  const segunda = partes.length > 1 ? partes[partes.length - 1]?.[0] : "";
  return `${primeira}${segunda}`.toUpperCase();
}

function calcularDiarias(checkIn: string, checkOut: string): number {
  const entrada = new Date(`${checkIn}T00:00:00`);
  const saida = new Date(`${checkOut}T00:00:00`);
  const diferenca = saida.getTime() - entrada.getTime();
  return Math.max(1, Math.round(diferenca / 86_400_000));
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
