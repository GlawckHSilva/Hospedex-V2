import { Banknote, CheckCircle2, ClipboardCheck, XCircle } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@hospedex/ui";

import type { ActionButtonVariant } from "../management/action-button";
import { ConfirmDialog } from "../management/entity-modal";
import { FormActionButton } from "../management/form-submit-button";
import {
  alterarStatusReservaAction,
  aprovarCobrancaReservaAction,
  registrarPagamentoManualReservaAction,
} from "../../lib/reservations/actions";
import {
  LABEL_STATUS_RESERVA,
  reservaEstaEncerrada,
  reservaPermiteRegistrarPagamento,
  type ReservaComRelacionamentos,
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
  cobrancaId?: string;
  descricao: string;
  icone: ReactNode;
  motivo: string;
  tipo: "pagamento";
  titulo: string;
  variante: ActionButtonVariant;
};

type AcaoCobrancaReserva = {
  descricao: string;
  icone: ReactNode;
  motivo: string;
  tipo: "cobranca";
  titulo: string;
  variante: ActionButtonVariant;
};

type AcaoReserva =
  | AcaoStatusReserva
  | AcaoPagamentoReserva
  | AcaoCobrancaReserva;

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
  const terminal = reservaEstaEncerrada(reserva.status);

  return (
    <ConfirmDialog
      description="As acoes disponiveis dependem do status atual da reserva e preservam o historico operacional."
      disabled={!podeGerenciar || acoes.length === 0}
      title={`Ações da reserva ${reserva.code}`}
      triggerAction="settings"
      triggerClassName="h-9 w-full justify-center"
      triggerIcon={<ClipboardCheck className="h-4 w-4" />}
      triggerLabel="Ações operacionais"
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
                  acao.tipo === "cobranca"
                    ? aprovarCobrancaReservaAction
                    : acao.tipo === "pagamento"
                      ? registrarPagamentoManualReservaAction
                      : alterarStatusReservaAction
                }
                className="grid gap-2"
                key={`${acao.tipo}-${acao.titulo}`}
              >
                <input name="reservaId" type="hidden" value={reserva.id} />
                {acao.tipo === "pagamento" ? (
                  <>
                    {acao.cobrancaId ? (
                      <input name="cobrancaId" type="hidden" value={acao.cobrancaId} />
                    ) : null}
                    <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                      Valor recebido
                      <input
                        className="h-9 rounded-md border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        defaultValue={obterSaldoAberto(reserva).toFixed(2)}
                        min="0.01"
                        name="valorPagamento"
                        step="0.01"
                        type="number"
                      />
                    </label>
                  </>
                ) : null}
                {acao.tipo === "status" ? (
                  <input name="status" type="hidden" value={acao.statusDestino} />
                ) : null}
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

  if (reserva.status === "pending" || reserva.status === "awaiting_payment") {
    if (reserva.status === "pending") {
      acoes.push({
        descricao: "Aprova a solicitacao, gera cobranca e segura o periodo temporariamente.",
        icone: <CheckCircle2 className="h-4 w-4" />,
        motivo: "Reserva aprovada e cobranca gerada pelo gerenciamento de reservas.",
        tipo: "cobranca",
        titulo: "Aprovar e gerar cobranca",
        variante: "add",
      });
    }

    acoes.push(
      criarAcaoCancelamento(reserva.status === "pending" ? "Recusar reserva" : "Cancelar reserva")
    );
  }

  if (
    podeGerenciarPagamento &&
    reservaPermiteRegistrarPagamento(reserva.status, reserva.statusPagamento)
  ) {
    const cobrancaAberta = obterCobrancaAberta(reserva);

    if (cobrancaAberta) {
      acoes.push({
        cobrancaId: cobrancaAberta.id,
        descricao: `${reserva.statusPagamento === "partial" ? "Registra o restante da cobranca." : "Registra pagamento manual da cobranca aberta."} Saldo aberto: ${formatarMoeda(obterSaldoAberto(reserva))}.`,
        icone: <Banknote className="h-4 w-4" />,
        motivo: "Pagamento manual registrado pelo gerenciamento de reservas.",
        tipo: "pagamento",
        titulo: reserva.statusPagamento === "partial" ? "Registrar restante" : "Registrar pagamento",
        variante: "add",
      });
    }
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
  if (acao.tipo === "pagamento") return "Registrando...";
  if (acao.tipo === "cobranca") return "Gerando...";

  if (acao.statusDestino === "cancelled") return "Cancelando...";
  if (acao.statusDestino === "confirmed") return "Confirmando...";
  if (acao.statusDestino === "checked_in") return "Registrando...";
  if (acao.statusDestino === "checked_out") return "Registrando...";
  return "Atualizando...";
}

function obterCobrancaAberta(reserva: ReservaComRelacionamentos) {
  return reserva.cobrancas.find((cobranca) =>
    ["pending", "partial", "overdue"].includes(cobranca.status)
  );
}

function obterSaldoAberto(reserva: ReservaComRelacionamentos) {
  const pago = reserva.pagamentos
    .filter((pagamento) => pagamento.status === "confirmed")
    .reduce((total, pagamento) => total + Number(pagamento.amount), 0);

  return Math.max(Number(reserva.total_amount) - pago, 0);
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency"
  }).format(valor);
}
