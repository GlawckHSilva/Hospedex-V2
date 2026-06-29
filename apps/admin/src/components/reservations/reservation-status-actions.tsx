import { Banknote, CheckCircle2, ClipboardCheck, RotateCcw, XCircle } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@hospedex/ui";

import type { ActionButtonVariant } from "../management/action-button";
import { ConfirmDialog } from "../management/entity-modal";
import { FormActionButton } from "../management/form-submit-button";
import {
  alterarPagamentoReservaAction,
  alterarStatusReservaAction,
} from "../../lib/reservations/actions";
import {
  LABEL_STATUS_RESERVA,
  type ReservaComRelacionamentos,
  type StatusPagamentoReserva,
} from "../../lib/reservations/types";

type ReservationStatusActionsProps = {
  podeGerenciar: boolean;
  podeGerenciarPagamento: boolean;
  reserva: ReservaComRelacionamentos;
};

type AcaoStatusReserva = {
  descricao: string;
  icone: ReactNode;
  motivo: string;
  statusDestino: ReservaComRelacionamentos["status"];
  tipo: "status";
  titulo: string;
  variante: ActionButtonVariant;
};

type AcaoPagamentoReserva = {
  descricao: string;
  icone: ReactNode;
  motivo: string;
  statusPagamentoDestino: StatusPagamentoReserva;
  tipo: "pagamento";
  titulo: string;
  variante: ActionButtonVariant;
};

type AcaoReserva = AcaoStatusReserva | AcaoPagamentoReserva;

/**
 * Acoes operacionais da reserva.
 *
 * Status e pagamento seguem contratos separados. A reserva usa a action de
 * status; pagamento usa RPC própria para manter Financeiro e timeline atomicos.
 */
export function ReservationStatusActions({
  podeGerenciar,
  podeGerenciarPagamento,
  reserva,
}: ReservationStatusActionsProps) {
  const acoes = obterAcoesReserva(reserva, podeGerenciarPagamento);
  const terminal = reserva.status === "cancelled" || reserva.status === "completed";

  return (
    <ConfirmDialog
      description="As acoes disponiveis dependem do status atual da reserva e preservam o historico operacional."
      disabled={!podeGerenciar || acoes.length === 0}
      title={`Acoes da reserva ${reserva.code}`}
      triggerAction="settings"
      triggerClassName="h-9 justify-center"
      triggerIcon={<ClipboardCheck className="h-4 w-4" />}
      triggerLabel="Acoes"
      triggerVariant="outline"
    >
      <div className="space-y-4">
        <div className="rounded-lg border bg-background/55 p-3 text-sm">
          <p className="text-xs text-muted-foreground">Status atual</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline">{LABEL_STATUS_RESERVA[reserva.status]}</Badge>
            {terminal ? (
              <span className="text-xs text-muted-foreground">
                Status terminal: somente visualizacao e timeline.
              </span>
            ) : null}
          </div>
        </div>

        {acoes.length ? (
          <div className="grid gap-3">
            {acoes.map((acao) => (
              <form
                action={
                  acao.tipo === "pagamento"
                    ? alterarPagamentoReservaAction
                    : alterarStatusReservaAction
                }
                className="grid gap-2"
                key={`${acao.tipo}-${acao.titulo}`}
              >
                <input name="reservaId" type="hidden" value={reserva.id} />
                {acao.tipo === "pagamento" ? (
                  <input
                    name="statusPagamento"
                    type="hidden"
                    value={acao.statusPagamentoDestino}
                  />
                ) : (
                  <input name="status" type="hidden" value={acao.statusDestino} />
                )}
                <input name="motivo" type="hidden" value={acao.motivo} />
                <div className="rounded-lg border bg-background/45 p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold">{acao.titulo}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {acao.descricao}
                      </p>
                    </div>
                    <FormActionButton
                      disabled={!podeGerenciar}
                      icon={acao.icone}
                      pendingLabel={obterRotuloPendente(acao)}
                      variant={acao.variante}
                    >
                      {acao.titulo}
                    </FormActionButton>
                  </div>
                </div>
              </form>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed bg-background/45 p-3 text-sm text-muted-foreground">
            Nenhuma acao operacional disponivel para este status.
          </p>
        )}
      </div>
    </ConfirmDialog>
  );
}

function obterAcoesReserva(
  reserva: ReservaComRelacionamentos,
  podeGerenciarPagamento: boolean
): AcaoReserva[] {
  const acoes: AcaoReserva[] = [];
  const terminal = reserva.status === "cancelled" || reserva.status === "completed";

  if (reserva.status === "pending" || reserva.status === "awaiting_payment") {
    acoes.push(
      {
        descricao: "Confirma a reserva e bloqueia o periodo no calendario da casa.",
        icone: <CheckCircle2 className="h-4 w-4" />,
        motivo: "Reserva confirmada pelo gerenciamento de reservas.",
        statusDestino: "confirmed",
        tipo: "status",
        titulo: "Confirmar reserva",
        variante: "add",
      },
      criarAcaoCancelamento(reserva.status === "pending" ? "Recusar reserva" : "Cancelar reserva")
    );
  }

  if (!terminal && podeGerenciarPagamento && reserva.statusPagamento !== "received") {
    acoes.push({
      descricao: "Marca o pagamento como recebido e atualiza o lancamento financeiro.",
      icone: <Banknote className="h-4 w-4" />,
      motivo: "Pagamento marcado como recebido pelo gerenciamento de reservas.",
      statusPagamentoDestino: "received",
      tipo: "pagamento",
      titulo: "Marcar pago",
      variante: "add",
    });
  }

  if (!terminal && podeGerenciarPagamento && reserva.statusPagamento === "received") {
    acoes.push({
      descricao: "Volta o pagamento para pendente, mantendo historico financeiro.",
      icone: <RotateCcw className="h-4 w-4" />,
      motivo: "Pagamento voltou para pendente pelo gerenciamento de reservas.",
      statusPagamentoDestino: "pending",
      tipo: "pagamento",
      titulo: "Voltar pagamento",
      variante: "status",
    });
  }

  if (reserva.status === "confirmed") {
    acoes.push(
      {
        descricao: "Registra a entrada do hospede.",
        icone: <CheckCircle2 className="h-4 w-4" />,
        motivo: "Check-in registrado pelo gerenciamento de reservas.",
        statusDestino: "checked_in",
        tipo: "status",
        titulo: "Registrar check-in",
        variante: "add",
      },
      criarAcaoCancelamento("Cancelar reserva")
    );
  }

  if (reserva.status === "checked_in") {
    acoes.push(
      {
        descricao: "Registra a saida do hospede.",
        icone: <CheckCircle2 className="h-4 w-4" />,
        motivo: "Check-out registrado pelo gerenciamento de reservas.",
        statusDestino: "checked_out",
        tipo: "status",
        titulo: "Registrar check-out",
        variante: "add",
      },
      criarAcaoCancelamento("Cancelar reserva")
    );
  }

  if (reserva.status === "checked_out") {
    acoes.push({
      descricao: "Encerra a reserva apos check-out.",
      icone: <CheckCircle2 className="h-4 w-4" />,
      motivo: "Reserva concluida pelo gerenciamento de reservas.",
      statusDestino: "completed",
      tipo: "status",
      titulo: "Concluir reserva",
      variante: "add",
    });
  }

  return acoes;
}

function criarAcaoCancelamento(titulo: string): AcaoStatusReserva {
  return {
    descricao: "Cancela a reserva com registro no historico e tratamento pelo calendario.",
    icone: <XCircle className="h-4 w-4" />,
    motivo: "Reserva cancelada pelo gerenciamento de reservas.",
    statusDestino: "cancelled",
    tipo: "status",
    titulo,
    variante: "delete",
  };
}

function obterRotuloPendente(acao: AcaoReserva) {
  if (acao.tipo === "pagamento") {
    return acao.statusPagamentoDestino === "received"
      ? "Registrando..."
      : "Atualizando...";
  }

  if (acao.statusDestino === "cancelled") return "Cancelando...";
  if (acao.statusDestino === "confirmed") return "Confirmando...";
  if (acao.statusDestino === "checked_in") return "Registrando...";
  if (acao.statusDestino === "checked_out") return "Registrando...";
  return "Atualizando...";
}
