import { type PropertyRow } from "@hospedex/types";
import { Eye, Pencil } from "lucide-react";
import type { ReactNode } from "react";

import { Badge, Card, CardContent } from "@hospedex/ui";

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
import { EmptyState } from "../management/entity-card";
import { EntityModal } from "../management/entity-modal";
import { ReservationCard } from "./reservation-card";
import { ReservationDetails } from "./reservation-details";
import { ReservationForm } from "./reservation-form";
import { ReservationStatusActions } from "./reservation-status-actions";

type ReservationGridProps = {
  podeGerenciar: boolean;
  podeGerenciarPagamento: boolean;
  propriedades: PropertyRow[];
  reservas: ReservaComRelacionamentos[];
};

/**
 * Lista de Reservas.
 *
 * No desktop a tela vira uma central de gestao em formato de tabela. No mobile,
 * usamos cards compactos apenas para leitura, mantendo acoes operacionais nos
 * modais e evitando repetir o padrao de acao rapida da tela de Pendencias.
 */
export function ReservationGrid({
  podeGerenciar,
  podeGerenciarPagamento,
  propriedades,
  reservas,
}: ReservationGridProps) {
  if (reservas.length === 0) {
    return (
      <EmptyState
        description="Quando um hospede solicitar uma hospedagem, ela aparecera aqui. Ajuste os filtros se estiver procurando uma reserva especifica."
        title="Nenhuma reserva encontrada"
      />
    );
  }

  return (
    <>
      <Card className="admin-glass-card hidden overflow-hidden lg:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="border-b bg-background/60 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  <Th>Codigo</Th>
                  <Th>Hospede</Th>
                  <Th>Casa</Th>
                  <Th>Periodo</Th>
                  <Th>Status</Th>
                  <Th>Pagamento</Th>
                  <Th className="text-right">Total</Th>
                  <Th className="text-right">Acoes</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {reservas.map((reserva) => (
                  <LinhaReserva
                    key={reserva.id}
                    podeGerenciar={podeGerenciar}
                    podeGerenciarPagamento={podeGerenciarPagamento}
                    propriedades={propriedades}
                    reserva={reserva}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 lg:hidden">
        {reservas.map((reserva) => (
          <ReservationCard
            key={reserva.id}
            podeGerenciarPagamento={podeGerenciarPagamento}
            reserva={reserva}
          />
        ))}
      </div>
    </>
  );
}

function LinhaReserva({
  podeGerenciar,
  podeGerenciarPagamento,
  propriedades,
  reserva,
}: {
  podeGerenciar: boolean;
  podeGerenciarPagamento: boolean;
  propriedades: PropertyRow[];
  reserva: ReservaComRelacionamentos;
}) {
  const hospedePrincipal =
    reserva.hospedes.find((hospede) => hospede.is_primary) ??
    reserva.hospedes[0];
  const encerrada = reservaEstaEncerrada(reserva.status);
  const podeOperarFinanceiro =
    podeGerenciarPagamento && reservaPermiteAcoesFinanceiras(reserva.status);

  return (
    <tr className="transition-colors hover:bg-cyan-500/5">
      <Td>
        <div className="min-w-0">
          <p className="font-semibold">{reserva.code}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {LABEL_ORIGEM_RESERVA[reserva.source]}
          </p>
        </div>
      </Td>
      <Td>
        <span className="font-medium">
          {hospedePrincipal?.full_name ?? "Sem hospede"}
        </span>
      </Td>
      <Td>{reserva.propriedade?.name ?? "Propriedade removida"}</Td>
      <Td>{`${formatarData(reserva.check_in)} - ${formatarData(reserva.check_out)}`}</Td>
      <Td>
        <Badge variant={obterVariantStatusReserva(reserva.status)}>
          {LABEL_STATUS_RESERVA[reserva.status]}
        </Badge>
      </Td>
      <Td>
        <Badge variant={obterVariantStatusPagamentoReserva(reserva.statusPagamento)}>
          {LABEL_STATUS_PAGAMENTO_RESERVA[reserva.statusPagamento]}
        </Badge>
      </Td>
      <Td className="text-right font-semibold text-cyan-700 dark:text-cyan-200">
        {formatarMoeda(reserva.valorTotalComExtras)}
      </Td>
      <Td>
        <div className="flex justify-end gap-2">
          <EntityModal
            description="Dados consolidados, hospede, casa, periodo, valores, financeiro e timeline."
            eyebrow="Visualizacao"
            size="xl"
            title={`Reserva ${reserva.code}`}
            triggerAction="view"
            triggerClassName="h-9 justify-center"
            triggerIcon={<Eye className="h-4 w-4" />}
            triggerLabel="Ver detalhes"
          >
            <ReservationDetails
              podeGerenciarPagamento={podeOperarFinanceiro}
              reserva={reserva}
            />
          </EntityModal>

          {!encerrada ? (
            <>
              <EntityModal
                description="Atualize periodo, hospede e valores da reserva."
                disabled={!podeGerenciar}
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
                  podeGerenciar={podeGerenciar}
                  propriedades={propriedades}
                  reserva={reserva}
                />
              </EntityModal>

              <ReservationStatusActions
                podeGerenciar={podeGerenciar}
                podeGerenciarPagamento={podeOperarFinanceiro}
                reserva={reserva}
              />
            </>
          ) : null}
        </div>
      </Td>
    </tr>
  );
}

function Th({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <th className={`px-4 py-3 ${className}`}>{children}</th>;
}

function Td({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <td className={`px-4 py-3 align-middle ${className}`}>{children}</td>;
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
