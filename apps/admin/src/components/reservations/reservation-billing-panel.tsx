import type {
  ReservationChargeRow,
  ReservationChargeStatus,
  ReservationChargeType,
  ReservationPaymentMethod,
  ReservationPaymentRecordStatus,
  ReservationPaymentRow,
  ReservationPaymentStatus,
  TransactionRow,
} from "@hospedex/types";
import { Banknote, ExternalLink, Lock, ReceiptText, RotateCcw, XCircle } from "lucide-react";
import type { ReactNode } from "react";

import { Badge, Card, CardContent } from "@hospedex/ui";

import { LABEL_STATUS_LANCAMENTO } from "../../lib/finance/types";
import { LABEL_STATUS_PAGAMENTO_RESERVA, obterVariantStatusPagamentoReserva } from "../../lib/reservations/types";
import { ConfirmDialog } from "../management/entity-modal";
import { FormActionButton } from "../management/form-submit-button";

const LABEL_TIPO_COBRANCA: Record<ReservationChargeType, string> = {
  adjustment: "Ajuste",
  deposit: "Entrada",
  extra: "Extra",
  full: "Integral",
  refund: "Estorno",
  remaining: "Restante",
};

const LABEL_STATUS_COBRANCA: Record<ReservationChargeStatus, string> = {
  cancelled: "Cancelada",
  overdue: "Vencida",
  paid: "Quitada",
  partial: "Parcial",
  pending: "Pendente",
  refunded: "Estornada",
};

const LABEL_STATUS_PAGAMENTO_REGISTRO: Record<ReservationPaymentRecordStatus, string> = {
  cancelled: "Cancelado",
  confirmed: "Confirmado",
  pending_review: "Em analise",
  refunded: "Estornado",
  rejected: "Rejeitado",
};

const LABEL_FORMA_PAGAMENTO: Record<ReservationPaymentMethod, string> = {
  bank_transfer: "Transferencia bancaria",
  cash: "Dinheiro",
  credit_card: "Cartao de credito",
  debit_card: "Cartao de debito",
  pix: "Pix",
};

const FORMAS_PAGAMENTO: ReservationPaymentMethod[] = [
  "pix",
  "cash",
  "debit_card",
  "credit_card",
  "bank_transfer",
];
const FORMA_PAGAMENTO_PADRAO: ReservationPaymentMethod = "pix";

type ReservationBillingPanelProps = {
  canManagePayments?: boolean;
  charges: ReservationChargeRow[];
  currency?: string;
  defaultPaymentMethod: ReservationPaymentMethod | null;
  payments: ReservationPaymentRow[];
  paymentStatus: ReservationPaymentStatus;
  paymentStatusUpdatedAt: string | null;
  cancelPaymentAction?: (formData: FormData) => Promise<void>;
  refundPaymentAction?: (formData: FormData) => Promise<void>;
  registerPaymentAction?: (formData: FormData) => Promise<void>;
  reservationId: string;
  totalAmount: number;
  transactions: TransactionRow[];
};

/**
 * Painel unico para cobrancas e pagamentos da reserva.
 *
 * A interface deixa claro o saldo operacional sem recalcular regras sensiveis no
 * cliente. Registro, financeiro e timeline continuam atomicos nas RPCs do banco.
 */
export function ReservationBillingPanel({
  canManagePayments = false,
  charges,
  currency = "BRL",
  defaultPaymentMethod,
  payments,
  paymentStatus,
  paymentStatusUpdatedAt,
  cancelPaymentAction,
  refundPaymentAction,
  registerPaymentAction,
  reservationId,
  totalAmount,
  transactions,
}: ReservationBillingPanelProps) {
  const paidAmount = obterValorPago(payments, charges);
  const pendingAmount = Math.max(totalAmount - paidAmount, 0);

  return (
    <Card className="border-cyan-300/20 bg-background/50">
      <CardContent className="space-y-5 p-4">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-600 dark:text-cyan-300">
              Financeiro da reserva
            </p>
            <h3 className="mt-1 text-base font-semibold">Cobrancas e pagamentos</h3>
          </div>
          <Badge variant={obterVariantStatusPagamentoReserva(paymentStatus)}>
            {LABEL_STATUS_PAGAMENTO_RESERVA[paymentStatus]}
          </Badge>
        </header>

        <div className="grid gap-3 md:grid-cols-4">
          <ResumoFinanceiro label="Total" value={formatarMoeda(totalAmount, currency)} />
          <ResumoFinanceiro label="Pago" tone="success" value={formatarMoeda(paidAmount, currency)} />
          <ResumoFinanceiro label="Pendente" tone="warning" value={formatarMoeda(pendingAmount, currency)} />
          <ResumoFinanceiro
            label="Ultima atualizacao"
            value={paymentStatusUpdatedAt ? formatarDataHora(paymentStatusUpdatedAt) : "Sem atualizacao"}
          />
        </div>

        <section className="space-y-3">
          <TituloSecao icon={<ReceiptText />}>Cobrancas abertas e historico</TituloSecao>
          {charges.length ? (
            <div className="grid gap-3">
              {charges.map((charge) => (
                <CobrancaCard
                  canManagePayments={canManagePayments}
                  charge={charge}
                  defaultPaymentMethod={defaultPaymentMethod}
                  key={charge.id}
                  registerPaymentAction={registerPaymentAction}
                  reservationId={reservationId}
                />
              ))}
            </div>
          ) : (
            <EstadoVazio>Nenhuma cobranca gerada para esta reserva.</EstadoVazio>
          )}
        </section>

        <section className="space-y-3">
          <TituloSecao icon={<Banknote />}>Pagamentos registrados</TituloSecao>
          {payments.length ? (
            <div className="grid gap-3">
              {payments.map((payment) => (
                <PagamentoCard
                  key={payment.id}
                  canManagePayments={canManagePayments}
                  cancelPaymentAction={cancelPaymentAction}
                  payment={payment}
                  refundPaymentAction={refundPaymentAction}
                  reservationId={reservationId}
                  transaction={transactions.find((item) => item.reservation_payment_id === payment.id) ?? null}
                />
              ))}
            </div>
          ) : (
            <EstadoVazio>Nenhum pagamento registrado ainda.</EstadoVazio>
          )}
        </section>

        <section className="space-y-3">
          <TituloSecao icon={<Lock />}>Vinculo com financeiro</TituloSecao>
          {transactions.length ? (
            <div className="grid gap-3">
              {transactions.map((transaction) => (
                <div className="rounded-xl border bg-background/45 p-3 text-sm" key={transaction.id}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold">
                        {transaction.description ?? "Lancamento vinculado a reserva"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {transaction.paid_at
                          ? `Recebido em ${formatarDataHora(transaction.paid_at)}`
                          : transaction.due_date
                            ? `Vencimento ${formatarData(transaction.due_date)}`
                            : "Sem data financeira definida"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{LABEL_STATUS_LANCAMENTO[transaction.status]}</Badge>
                      <strong>{formatarMoeda(Number(transaction.amount), transaction.currency)}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EstadoVazio>
              Nenhum lancamento financeiro vinculado. Ao registrar pagamento recebido, a RPC cria ou atualiza o financeiro sem duplicar receita.
            </EstadoVazio>
          )}
        </section>
      </CardContent>
    </Card>
  );
}

function CobrancaCard({
  canManagePayments,
  charge,
  defaultPaymentMethod,
  registerPaymentAction,
  reservationId,
}: {
  canManagePayments: boolean;
  charge: ReservationChargeRow;
  defaultPaymentMethod: ReservationPaymentMethod | null;
  registerPaymentAction: ((formData: FormData) => Promise<void>) | undefined;
  reservationId: string;
}) {
  const balance = Math.max(Number(charge.amount) - Number(charge.amount_paid), 0);
  const canRegister =
    Boolean(registerPaymentAction) &&
    canManagePayments &&
    balance > 0 &&
    ["pending", "partial", "overdue"].includes(charge.status);
  const paymentMethod = charge.payment_method ?? defaultPaymentMethod;
  const defaultPaymentMethodForm = paymentMethod ?? FORMA_PAGAMENTO_PADRAO;

  return (
    <div className="rounded-xl border bg-background/45 p-3 text-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{LABEL_TIPO_COBRANCA[charge.charge_type]}</Badge>
            <Badge variant={variantStatusCobranca(charge.status)}>
              {LABEL_STATUS_COBRANCA[charge.status]}
            </Badge>
            <Badge variant="outline">{obterLabelProvider(charge)}</Badge>
          </div>
          <div className="mt-3 grid gap-2 text-muted-foreground sm:grid-cols-2">
            <Linha label="Valor" value={formatarMoeda(Number(charge.amount), charge.currency)} />
            <Linha label="Pago" value={formatarMoeda(Number(charge.amount_paid), charge.currency)} />
            <Linha label="Saldo" value={formatarMoeda(balance, charge.currency)} />
            <Linha label="Vencimento" value={charge.due_at ? formatarDataHora(charge.due_at) : "Sem vencimento"} />
            <Linha label="Forma" value={paymentMethod ? LABEL_FORMA_PAGAMENTO[paymentMethod] : "Nao definida"} />
            {charge.provider_fee_amount !== null ? (
              <Linha
                label="Taxa gateway"
                value={formatarMoeda(Number(charge.provider_fee_amount), charge.currency)}
              />
            ) : null}
            {charge.net_amount !== null ? (
              <Linha
                label="Liquido"
                value={formatarMoeda(Number(charge.net_amount), charge.currency)}
              />
            ) : null}
          </div>
          {charge.payment_link ? (
            <a
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-400/15"
              href={charge.payment_link}
              rel="noreferrer"
              target="_blank"
            >
              Abrir link de pagamento
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : null}
          {charge.manual_instructions ? (
            <p className="mt-3 rounded-lg border border-cyan-300/15 bg-cyan-400/10 p-3 text-xs leading-5 text-muted-foreground">
              {charge.manual_instructions}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2 sm:min-w-48">
          {canRegister && registerPaymentAction ? (
            <ConfirmDialog
              description="Registra pagamento parcial ou total, atualiza cobranca, financeiro, reserva, timeline e area do hospede."
              title="Registrar pagamento"
              triggerAction="add"
              triggerClassName="w-full"
              triggerIcon={<Banknote />}
              triggerLabel="Registrar pagamento"
              triggerVariant="default"
            >
              <form action={registerPaymentAction} className="grid gap-3">
                <input name="reservaId" type="hidden" value={reservationId} />
                <input name="cobrancaId" type="hidden" value={charge.id} />
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                  Valor recebido agora
                  <input
                    className="h-10 rounded-md border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    inputMode="decimal"
                    name="valorPagamento"
                    placeholder={`Saldo: ${formatarMoeda(balance, charge.currency)}`}
                    type="text"
                  />
                </label>
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                  Data do recebimento
                  <input
                    className="h-10 rounded-md border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    name="dataRecebimento"
                    type="date"
                  />
                </label>
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                  Forma de pagamento
                  <select
                    className="h-10 rounded-md border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    defaultValue={defaultPaymentMethodForm}
                    name="formaPagamento"
                  >
                    {paymentMethod ? <option value="">Usar forma da reserva</option> : null}
                    {FORMAS_PAGAMENTO.map((method) => (
                      <option key={method} value={method}>
                        {LABEL_FORMA_PAGAMENTO[method]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                  Link do comprovante opcional
                  <input
                    className="h-10 rounded-md border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    name="comprovanteUrl"
                    placeholder="https://..."
                    type="url"
                  />
                </label>
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                  Observacao opcional
                  <textarea
                    className="min-h-20 rounded-md border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    name="observacao"
                    placeholder="Ex.: Entrada recebida via Pix."
                  />
                </label>
                <FormActionButton icon={<Banknote />} pendingLabel="Registrando..." variant="add">
                  Confirmar pagamento
                </FormActionButton>
              </form>
            </ConfirmDialog>
          ) : null}
          <p className="text-xs leading-5 text-muted-foreground">
            Cancelamento e estorno ficam disponiveis nos pagamentos confirmados abaixo.
          </p>
        </div>
      </div>
    </div>
  );
}

function PagamentoCard({
  canManagePayments,
  cancelPaymentAction,
  payment,
  refundPaymentAction,
  reservationId,
  transaction,
}: {
  canManagePayments: boolean;
  cancelPaymentAction: ((formData: FormData) => Promise<void>) | undefined;
  payment: ReservationPaymentRow;
  refundPaymentAction: ((formData: FormData) => Promise<void>) | undefined;
  reservationId: string;
  transaction: TransactionRow | null;
}) {
  const valor = Number(payment.amount);
  const valorEstornado = Number(payment.refunded_amount ?? 0);
  const valorDisponivelEstorno = Math.max(valor - valorEstornado, 0);
  const pagamentoOriginalConfirmado =
    payment.status === "confirmed" && payment.reversal_type === null;
  const podeCancelar =
    canManagePayments &&
    Boolean(cancelPaymentAction) &&
    pagamentoOriginalConfirmado &&
    valorEstornado <= 0;
  const podeEstornar =
    canManagePayments &&
    Boolean(refundPaymentAction) &&
    pagamentoOriginalConfirmado &&
    valorDisponivelEstorno > 0;

  return (
    <div className="rounded-xl border bg-background/45 p-3 text-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={variantStatusPagamentoRegistro(payment.status)}>
              {LABEL_STATUS_PAGAMENTO_REGISTRO[payment.status]}
            </Badge>
            {payment.payment_method ? (
              <Badge variant="outline">{LABEL_FORMA_PAGAMENTO[payment.payment_method]}</Badge>
            ) : null}
            {payment.provider_name === "mercado_pago" ? (
              <Badge variant="outline">Mercado Pago</Badge>
            ) : null}
            {payment.reversal_type === "refund" ? (
              <Badge variant="warning">Registro de estorno</Badge>
            ) : null}
            {valorEstornado > 0 && payment.reversal_type === null ? (
              <Badge variant="warning">
                Estornado {formatarMoeda(valorEstornado, payment.currency)}
              </Badge>
            ) : null}
          </div>
          <div className="mt-3 grid gap-2 text-muted-foreground sm:grid-cols-2">
            <Linha label="Criado em" value={formatarDataHora(payment.created_at)} />
            <Linha label="Confirmado em" value={payment.confirmed_at ? formatarDataHora(payment.confirmed_at) : "Nao confirmado"} />
            <Linha label="Financeiro" value={transaction ? LABEL_STATUS_LANCAMENTO[transaction.status] : "Sem lancamento vinculado"} />
            <Linha label="Observacao" value={payment.notes ?? "Sem observacao"} />
            {payment.gross_amount !== null ? (
              <Linha
                label="Bruto"
                value={formatarMoeda(Number(payment.gross_amount), payment.currency)}
              />
            ) : null}
            {payment.provider_fee_amount !== null ? (
              <Linha
                label="Taxa gateway"
                value={formatarMoeda(Number(payment.provider_fee_amount), payment.currency)}
              />
            ) : null}
            {payment.net_amount !== null ? (
              <Linha
                label="Liquido"
                value={formatarMoeda(Number(payment.net_amount), payment.currency)}
              />
            ) : null}
            {payment.reversal_reason ? (
              <Linha label="Motivo" value={payment.reversal_reason} />
            ) : null}
            {payment.reversed_at ? (
              <Linha label="Reversao" value={formatarDataHora(payment.reversed_at)} />
            ) : null}
          </div>
          {payment.proof_url ? (
            <a
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-cyan-700 hover:underline dark:text-cyan-200"
              href={payment.proof_url}
              rel="noreferrer"
              target="_blank"
            >
              Abrir comprovante <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : null}
        </div>
        <div className="grid gap-2 lg:min-w-56">
          <strong className="text-base">{formatarMoeda(valor, payment.currency)}</strong>
          {podeCancelar && cancelPaymentAction ? (
            <ConfirmDialog
              description="Esta acao nao apagará o pagamento. Ela cancelara o registro e recalculara cobranca, saldo, financeiro e timeline."
              title="Cancelar pagamento"
              triggerAction="delete"
              triggerClassName="w-full"
              triggerIcon={<XCircle />}
              triggerLabel="Cancelar pagamento"
              triggerVariant="destructive"
            >
              <form action={cancelPaymentAction} className="grid gap-3">
                <input name="reservaId" type="hidden" value={reservationId} />
                <input name="pagamentoId" type="hidden" value={payment.id} />
                <ResumoModalPagamento
                  payment={payment}
                  titulo="Pagamento selecionado"
                  valor={valor}
                />
                <p className="rounded-lg border border-amber-400/25 bg-amber-500/10 p-3 text-xs leading-5 text-amber-700 dark:text-amber-100">
                  Use cancelamento apenas para pagamento lancado por engano. Para dinheiro devolvido ao hospede, use estorno.
                </p>
                <CampoMotivo
                  name="motivo"
                  placeholder="Ex.: Lancamento duplicado ou recebido por engano."
                />
                <FormActionButton icon={<XCircle />} pendingLabel="Cancelando..." variant="delete">
                  Confirmar cancelamento
                </FormActionButton>
              </form>
            </ConfirmDialog>
          ) : null}
          {podeEstornar && refundPaymentAction ? (
            <ConfirmDialog
              description="Registra uma devolucao real ao hospede, cria saida no financeiro e recalcula o saldo da reserva."
              title="Estornar pagamento"
              triggerAction="status"
              triggerClassName="w-full"
              triggerIcon={<RotateCcw />}
              triggerLabel="Estornar pagamento"
            >
              <form action={refundPaymentAction} className="grid gap-3">
                <input name="reservaId" type="hidden" value={reservationId} />
                <input name="pagamentoId" type="hidden" value={payment.id} />
                <ResumoModalPagamento
                  payment={payment}
                  titulo="Disponivel para estorno"
                  valor={valorDisponivelEstorno}
                />
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                  Valor a estornar
                  <input
                    className="h-10 rounded-md border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    defaultValue={valorDisponivelEstorno.toFixed(2)}
                    max={valorDisponivelEstorno.toFixed(2)}
                    min="0.01"
                    name="valorEstorno"
                    step="0.01"
                    type="number"
                  />
                </label>
                <CampoMotivo
                  name="motivo"
                  placeholder="Ex.: Devolucao parcial combinada com o hospede."
                />
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                  Observacao opcional
                  <textarea
                    className="min-h-20 rounded-md border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    name="observacao"
                    placeholder="Detalhe interno sobre o estorno."
                  />
                </label>
                <FormActionButton icon={<RotateCcw />} pendingLabel="Estornando..." variant="status">
                  Confirmar estorno
                </FormActionButton>
              </form>
            </ConfirmDialog>
          ) : null}
          {!pagamentoOriginalConfirmado ? (
            <p className="text-xs leading-5 text-muted-foreground">
              Pagamentos cancelados ou estornados ficam visiveis para auditoria.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ResumoModalPagamento({
  payment,
  titulo,
  valor,
}: {
  payment: ReservationPaymentRow;
  titulo: string;
  valor: number;
}) {
  return (
    <div className="grid gap-2 rounded-lg border bg-background/55 p-3 text-sm">
      <p className="font-semibold">{titulo}</p>
      <Linha label="Valor" value={formatarMoeda(valor, payment.currency)} />
      <Linha
        label="Forma"
        value={payment.payment_method ? LABEL_FORMA_PAGAMENTO[payment.payment_method] : "Nao definida"}
      />
      <Linha
        label="Confirmado em"
        value={payment.confirmed_at ? formatarDataHora(payment.confirmed_at) : "Nao confirmado"}
      />
    </div>
  );
}

function CampoMotivo({
  name,
  placeholder,
}: {
  name: string;
  placeholder: string;
}) {
  return (
    <label className="grid gap-1 text-xs font-medium text-muted-foreground">
      Motivo obrigatorio
      <textarea
        className="min-h-20 rounded-md border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        name={name}
        placeholder={placeholder}
        required
      />
    </label>
  );
}

function TituloSecao({ children, icon }: { children: ReactNode; icon: ReactNode }) {
  return (
    <h4 className="flex items-center gap-2 text-sm font-semibold">
      <span className="text-cyan-600 dark:text-cyan-300 [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
      {children}
    </h4>
  );
}

function ResumoFinanceiro({
  label,
  tone,
  value,
}: {
  label: string;
  tone?: "success" | "warning";
  value: string;
}) {
  const toneClass =
    tone === "success"
      ? "text-emerald-700 dark:text-emerald-200"
      : tone === "warning"
        ? "text-amber-700 dark:text-amber-200"
        : "text-foreground";

  return (
    <div className="rounded-xl border bg-background/45 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <strong className={`mt-1 block text-base ${toneClass}`}>{value}</strong>
    </div>
  );
}

function Linha({ label, value }: { label: string; value: string }) {
  return (
    <p className="min-w-0">
      <span className="text-xs">{label}: </span>
      <strong className="break-words font-medium text-foreground">{value}</strong>
    </p>
  );
}

function EstadoVazio({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed bg-background/35 p-3 text-sm text-muted-foreground">
      {children}
    </p>
  );
}

function obterValorPago(payments: ReservationPaymentRow[], charges: ReservationChargeRow[]) {
  const valorOriginalPago = payments
    .filter((payment) => payment.reversal_type === null && ["confirmed", "refunded"].includes(payment.status))
    .reduce((total, payment) => total + Number(payment.amount), 0);
  const valorEstornado = payments
    .filter((payment) => payment.reversal_type === "refund" && payment.status === "refunded")
    .reduce((total, payment) => total + Number(payment.amount), 0);
  const paidByPayments = Math.max(valorOriginalPago - valorEstornado, 0);
  const paidByCharges = charges.reduce((total, charge) => total + Number(charge.amount_paid), 0);

  // Pagamentos detalhados sao a fonte principal quando existem, pois carregam
  // cancelamentos e estornos parciais. Cobrancas ficam como fallback legado.
  return payments.length ? paidByPayments : paidByCharges;
}

function variantStatusCobranca(status: ReservationChargeStatus) {
  if (status === "paid") return "success";
  if (status === "partial") return "info";
  if (status === "overdue") return "warning";
  if (status === "cancelled" || status === "refunded") return "secondary";
  return "outline";
}

function variantStatusPagamentoRegistro(status: ReservationPaymentRecordStatus) {
  if (status === "confirmed") return "success";
  if (status === "refunded") return "warning";
  if (status === "cancelled" || status === "rejected") return "secondary";
  return "outline";
}

function obterLabelProvider(charge: ReservationChargeRow) {
  if (charge.provider_name === "mercado_pago") return "Mercado Pago";
  if (charge.payment_provider === "gateway") return "Gateway";
  return "Manual";
}

function formatarMoeda(value: number, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", {
    currency,
    style: "currency",
  }).format(Number.isFinite(value) ? value : 0);
}

function formatarData(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(
    new Date(`${value}T00:00:00`),
  );
}

function formatarDataHora(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
