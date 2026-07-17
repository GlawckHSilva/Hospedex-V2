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
      description="Confira os dados antes de executar a operacao."
      disabled={!podeGerenciar || acoes.length === 0}
      size="lg"
      title={obterTituloModalReserva(reserva)}
      triggerAction="settings"
      triggerClassName="h-9 w-full justify-center"
      triggerIcon={<ClipboardCheck className="h-4 w-4" />}
      triggerLabel="Ações operacionais"
      triggerVariant="outline"
    >
      <div className="space-y-4">
        <ResumoReserva reserva={reserva} />

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
                      Valor recebido agora
                      <input
                        className="h-9 rounded-md border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        inputMode="decimal"
                        name="valorPagamento"
                        placeholder={`Saldo: ${formatarMoeda(obterSaldoAberto(reserva))}`}
                        type="text"
                      />
                    </label>
                    <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                      Forma de pagamento
                      <select
                        className="h-9 rounded-md border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        defaultValue={reserva.payment_method ?? "pix"}
                        name="formaPagamento"
                      >
                        <option value="pix">Pix</option>
                        <option value="cash">Dinheiro</option>
                        <option value="debit_card">Cartao de debito</option>
                        <option value="credit_card">Cartao de credito</option>
                        <option value="bank_transfer">Transferencia</option>
                      </select>
                    </label>
                  </>
                ) : null}
                {acao.tipo === "cobranca" ? (
                  <details className="rounded-lg border bg-background/45 p-3">
                    <summary className="cursor-pointer text-sm font-semibold text-cyan-700 dark:text-cyan-200">
                      Alterar cobranca desta reserva
                    </summary>
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                    <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                      Metodo de cobranca
                      <select
                        className="h-9 rounded-md border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        defaultValue="default"
                        name="metodoCobranca"
                      >
                        <option value="default">Usar configuracao padrao</option>
                        <option value="mercado_pago">Mercado Pago</option>
                        <option value="manual">Manual</option>
                      </select>
                    </label>
                    <div className="grid gap-2 text-xs text-muted-foreground md:col-span-2">
                      <label className="rounded-lg border bg-background/50 p-3">
                        <input defaultChecked name="estrategiaCobranca" type="radio" value="default" />{" "}
                        Usar a cobranca configurada na casa.
                      </label>
                      <label className="rounded-lg border bg-background/50 p-3">
                        <input name="estrategiaCobranca" type="radio" value="deposit_percent" />{" "}
                        Sinal percentual.
                        <input
                          className="mt-2 h-9 w-full rounded-md border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          max="100"
                          min="1"
                          name="percentualSinal"
                          placeholder="Percentual do sinal. Ex.: 30"
                          step="0.01"
                          type="number"
                        />
                      </label>
                      <label className="rounded-lg border bg-background/50 p-3">
                        <input name="estrategiaCobranca" type="radio" value="deposit_fixed" />{" "}
                        Sinal com valor fixo.
                        <input
                          className="mt-2 h-9 w-full rounded-md border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          inputMode="decimal"
                          name="valorSinalFixo"
                          placeholder="Valor do sinal. Ex.: R$ 500,00"
                          type="text"
                        />
                      </label>
                    </div>
                    <label className="grid gap-1 text-xs font-medium text-muted-foreground md:col-span-2">
                      Prazo para pagamento em horas
                      <input
                        className="h-9 rounded-md border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        min="1"
                        name="prazoCobrancaHoras"
                        step="1"
                        type="number"
                      />
                    </label>
                    </div>
                  </details>
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

function ResumoReserva({ reserva }: { reserva: ReservaComRelacionamentos }) {
  const hospede = reserva.hospedes.find((item) => item.is_primary) ?? reserva.hospedes[0];

  return (
    <section className="grid gap-2 rounded-xl border bg-background/55 p-3 text-sm sm:grid-cols-2">
      <ResumoItem label="Codigo" valor={reserva.code} />
      <ResumoItem label="Hospede" valor={hospede?.full_name ?? "Nao informado"} />
      <ResumoItem label="Casa" valor={reserva.propriedade?.name ?? "Casa removida"} />
      <ResumoItem label="Periodo" valor={`${formatarDataCurta(reserva.check_in)} - ${formatarDataCurta(reserva.check_out)}`} />
      <ResumoItem label="Hospedes" valor={`${reserva.guests_count}`} />
      <ResumoItem label="Valor total" valor={formatarMoeda(Number(reserva.total_amount))} />
      <ResumoItem label="Status" valor={LABEL_STATUS_RESERVA[reserva.status]} />
    </section>
  );
}

function ResumoItem({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 truncate font-medium">{valor}</p>
    </div>
  );
}

function obterTituloModalReserva(reserva: ReservaComRelacionamentos) {
  if (reserva.status === "pending") return "Revisar solicitacao";
  if (reserva.status === "awaiting_payment") return "Registrar pagamento";
  return `Atualizar reserva ${reserva.code}`;
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

function formatarDataCurta(valor: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  }).format(new Date(`${valor}T00:00:00`));
}
