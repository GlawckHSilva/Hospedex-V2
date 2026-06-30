import {
  Banknote,
  CalendarDays,
  CheckCircle2,
  Eye,
  FileSearch,
  Home,
  Mail,
  MessageSquareText,
  MoreHorizontal,
  Phone,
  ReceiptText,
  User,
  Users,
  XCircle,
} from "lucide-react";
import type { ReactNode } from "react";

import { Badge, Card, CardContent } from "@hospedex/ui";

import {
  adicionarObservacaoConfirmacaoAction,
  cancelarPagamentoConfirmacaoAction,
  cancelarReservaConfirmacaoAction,
  confirmarPagamentoConfirmacaoAction,
  confirmarReservaConfirmacaoAction,
  estornarPagamentoConfirmacaoAction,
  marcarPagamentoPendenteConfirmacaoAction,
} from "../../lib/confirmations/actions";
import type { ReservaConfirmacao } from "../../lib/confirmations/types";
import { LABEL_STATUS_PAGAMENTO_RESERVA } from "../../lib/reservations/types";
import { ConfirmDialog, EntityViewModal } from "../management/entity-modal";
import { FormActionButton } from "../management/form-submit-button";
import { ReservationBillingPanel } from "../reservations/reservation-billing-panel";
import { MENSAGENS_PENDENCIA, type TipoMensagemPendencia } from "./pending-messages";
import { ReservationWhatsappActions } from "./reservation-whatsapp-actions";

type ReservationDecisionCardProps = {
  podeGerenciar: boolean;
  podeGerenciarPagamento: boolean;
  reserva: ReservaConfirmacao;
};

const LABEL_STATUS_RESERVA = {
  awaiting_payment: "Aguardando pagamento",
  cancelled: "Cancelada",
  checked_in: "Hospedado",
  checked_out: "Check-out realizado",
  completed: "Concluída",
  confirmed: "Confirmada",
  pending: "Nova solicitação",
} as const;

const LABEL_STATUS_FINANCEIRO = {
  cancelled: "Lançamento cancelado",
  paid: "Lançamento pago",
  pending: "Lançamento pendente",
  refunded: "Lançamento estornado",
} as const;

const LABEL_FORMA_PAGAMENTO = {
  bank_transfer: "Transferência bancária",
  cash: "Dinheiro",
  credit_card: "Cartão de crédito",
  debit_card: "Cartão de débito",
  pix: "Pix",
} as const;

/**
 * Card compacto de Pendências.
 *
 * O card mostra apenas a próxima ação válida para o status atual. Ações
 * destrutivas e detalhes financeiros ficam em modais para reduzir clique errado.
 */
export function ReservationDecisionCard({
  podeGerenciar,
  podeGerenciarPagamento,
  reserva,
}: ReservationDecisionCardProps) {
  const hospede = reserva.hospedePrincipal;
  const tipoPendencia = obterTipoPendenciaReserva(reserva);
  const mensagem = MENSAGENS_PENDENCIA[tipoPendencia];
  const reservaEncerrada = ["cancelled", "completed"].includes(reserva.status);
  const pagamentoComHistorico = ["partial", "paid", "received"].includes(reserva.payment_status);
  const podeCancelarReserva =
    podeGerenciar && !reservaEncerrada && (!pagamentoComHistorico || podeGerenciarPagamento);
  const saldoPendente = calcularSaldoPendente(reserva);

  return (
    <Card className="admin-glass-card overflow-hidden">
      <CardContent className="grid gap-4 p-4 sm:p-5">
        <header className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant={variantStatusReserva(reserva.status)}>
              {LABEL_STATUS_RESERVA[reserva.status]}
            </Badge>
            <Badge variant={variantStatusPagamento(reserva.payment_status)}>
              {LABEL_STATUS_PAGAMENTO_RESERVA[reserva.payment_status]}
            </Badge>
            {temComprovanteEmAnalise(reserva) ? (
              <Badge variant="warning">Comprovante em análise</Badge>
            ) : null}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-600 dark:text-cyan-300">
              {mensagem.title}
            </p>
            <h3 className="mt-1 text-lg font-semibold tracking-normal">
              {reserva.code}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {hospede?.full_name ?? "Hóspede não informado"} ·{" "}
              {reserva.propriedade?.name ?? "Casa removida"}
            </p>
          </div>

          <p className="rounded-xl border border-cyan-300/15 bg-cyan-400/10 p-3 text-sm leading-5 text-muted-foreground">
            {mensagem.description}
          </p>
        </header>

        <section className="grid gap-2 text-sm sm:grid-cols-2">
          <Resumo icon={<CalendarDays />} label="Período" valor={formatarPeriodo(reserva)} />
          <Resumo
            icon={<Users />}
            label="Hóspedes"
            valor={`${reserva.guests_count} ${reserva.guests_count === 1 ? "hóspede" : "hóspedes"}`}
          />
          <Resumo
            icon={<Banknote />}
            label={saldoPendente > 0 ? "Saldo pendente" : "Valor total"}
            valor={formatarMoeda(saldoPendente > 0 ? saldoPendente : Number(reserva.total_amount))}
          />
          <Resumo
            icon={<Home />}
            label="Casa"
            valor={reserva.propriedade?.name ?? "Casa removida"}
          />
        </section>

        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <AcaoPrincipal
            podeGerenciar={podeGerenciar}
            podeGerenciarPagamento={podeGerenciarPagamento}
            reserva={reserva}
            saldoPendente={saldoPendente}
            tipoPendencia={tipoPendencia}
          />
          <BotaoDetalhes
            podeGerenciarPagamento={podeGerenciarPagamento && !reservaEncerrada}
            reserva={reserva}
          />
          <MaisAcoes
            podeCancelarReserva={podeCancelarReserva}
            podeGerenciarPagamento={podeGerenciarPagamento && !reservaEncerrada}
            reserva={reserva}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function AcaoPrincipal({
  podeGerenciar,
  podeGerenciarPagamento,
  reserva,
  saldoPendente,
  tipoPendencia,
}: {
  podeGerenciar: boolean;
  podeGerenciarPagamento: boolean;
  reserva: ReservaConfirmacao;
  saldoPendente: number;
  tipoPendencia: TipoMensagemPendencia;
}) {
  if (tipoPendencia === "reservation_request") {
    return <AcaoConfirmarReserva disabled={!podeGerenciar} reservaId={reserva.id} />;
  }

  if (tipoPendencia === "payment_proof_review") {
    return (
      <EntityViewModal
        description="Confira comprovante, cobrança e histórico antes de aprovar qualquer pagamento."
        title={`Analisar comprovante ${reserva.code}`}
        triggerAction="status"
        triggerClassName="w-full justify-center"
        triggerIcon={<FileSearch />}
        triggerLabel={MENSAGENS_PENDENCIA.payment_proof_review.primaryAction}
      >
        <DetalhesReserva
          podeGerenciarPagamento={podeGerenciarPagamento}
          reserva={reserva}
        />
      </EntityViewModal>
    );
  }

  return (
    <AcaoRegistrarPagamento
      disabled={!podeGerenciarPagamento}
      label={
        tipoPendencia === "partial_payment"
          ? MENSAGENS_PENDENCIA.partial_payment.primaryAction
          : MENSAGENS_PENDENCIA.awaiting_payment.primaryAction
      }
      reserva={reserva}
      valorPadrao={saldoPendente > 0 ? saldoPendente : Number(reserva.total_amount)}
    />
  );
}

function BotaoDetalhes({
  podeGerenciarPagamento,
  reserva,
}: {
  podeGerenciarPagamento: boolean;
  reserva: ReservaConfirmacao;
}) {
  return (
    <EntityViewModal
      title={`Reserva ${reserva.code}`}
      triggerAction="view"
      triggerClassName="w-full justify-center sm:w-auto"
      triggerIcon={<Eye />}
      triggerLabel="Ver detalhes"
    >
      <DetalhesReserva
        podeGerenciarPagamento={podeGerenciarPagamento}
        reserva={reserva}
      />
    </EntityViewModal>
  );
}

function MaisAcoes({
  podeCancelarReserva,
  podeGerenciarPagamento,
  reserva,
}: {
  podeCancelarReserva: boolean;
  podeGerenciarPagamento: boolean;
  reserva: ReservaConfirmacao;
}) {
  const podeVoltarPagamento =
    podeGerenciarPagamento && ["partial", "paid", "received"].includes(reserva.payment_status);

  return (
    <EntityViewModal
      description="Ações menos frequentes ficam separadas para evitar alterações indevidas."
      title={`Mais ações ${reserva.code}`}
      triggerAction="status"
      triggerClassName="w-full justify-center sm:w-auto"
      triggerIcon={<MoreHorizontal />}
      triggerLabel="Mais ações"
    >
      <div className="grid gap-4">
        {reserva.mensagemWhatsapp ? (
          <PainelDetalhe titulo="Mensagem de cobrança">
            <ReservationWhatsappActions reserva={reserva} />
          </PainelDetalhe>
        ) : (
          <PainelDetalhe titulo="Mensagem de cobrança">
            <p className="text-sm text-muted-foreground">
              A mensagem será preparada depois da aprovação da reserva.
            </p>
          </PainelDetalhe>
        )}

        <PainelDetalhe titulo="Ações secundárias">
          <AcaoCancelarReserva
            disabled={!podeCancelarReserva}
            reservaId={reserva.id}
            statusReserva={reserva.status}
          />
          <AcaoPagamentoPendente
            disabled={!podeVoltarPagamento}
            reservaId={reserva.id}
          />
          <form action={adicionarObservacaoConfirmacaoAction} className="grid gap-3">
            <input name="reservaId" type="hidden" value={reserva.id} />
            <textarea
              className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              name="observacao"
              placeholder="Observação interna opcional"
              required
            />
            <FormActionButton
              icon={<MessageSquareText />}
              pendingLabel="Adicionando..."
              variant="status"
            >
              Adicionar observação
            </FormActionButton>
          </form>
        </PainelDetalhe>
      </div>
    </EntityViewModal>
  );
}

function DetalhesReserva({
  podeGerenciarPagamento,
  reserva,
}: {
  podeGerenciarPagamento: boolean;
  reserva: ReservaConfirmacao;
}) {
  const hospede = reserva.hospedePrincipal;

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 md:grid-cols-2">
        <PainelDetalhe titulo="Reserva">
          <Info label="Código" valor={reserva.code} />
          <Info label="Casa" valor={reserva.propriedade?.name ?? "Casa removida"} />
          <Info label="Período" valor={formatarPeriodo(reserva)} />
          <Info
            label="Chegada prevista"
            valor={formatarHorarioPrevisto(reserva.expected_checkin_time)}
          />
          <Info
            label="Saída prevista"
            valor={formatarHorarioPrevisto(reserva.expected_checkout_time)}
          />
          <Info label="Valor" valor={formatarMoeda(Number(reserva.total_amount))} />
          <Info label="Status" valor={LABEL_STATUS_RESERVA[reserva.status]} />
          <Info label="Pagamento" valor={LABEL_STATUS_PAGAMENTO_RESERVA[reserva.payment_status]} />
          <Info label="Forma escolhida" valor={formatarFormaPagamento(reserva)} />
          <Info label="Financeiro" valor={formatarLancamentoFinanceiro(reserva)} />
        </PainelDetalhe>

        <PainelDetalhe titulo="Hóspede">
          <Info icon={<User />} label="Nome" valor={hospede?.full_name ?? "Não informado"} />
          <Info icon={<Phone />} label="Telefone" valor={hospede?.phone ?? "Não informado"} />
          <Info icon={<Mail />} label="E-mail" valor={hospede?.email ?? "Não informado"} />
          <Info label="Documento" valor={hospede?.document_number ?? "Não informado"} />
          <Info label="Quantidade" valor={`${reserva.guests_count} hóspedes`} />
          <Info label="Origem" valor={formatarOrigem(reserva.source)} />
        </PainelDetalhe>
      </div>

      <PainelDetalhe titulo="Observações">
        <Info label="Do hóspede" valor={reserva.guest_notes ?? "Sem observação do hóspede."} />
        <Info
          label="Operacional"
          valor={reserva.internal_notes ?? reserva.notes ?? "Sem observação operacional."}
        />
      </PainelDetalhe>

      <ReservationBillingPanel
        canManagePayments={podeGerenciarPagamento}
        cancelPaymentAction={cancelarPagamentoConfirmacaoAction}
        charges={reserva.cobrancas}
        currency={reserva.currency}
        defaultPaymentMethod={reserva.payment_method}
        paymentStatus={reserva.payment_status}
        paymentStatusUpdatedAt={reserva.payment_status_updated_at}
        payments={reserva.pagamentos}
        refundPaymentAction={estornarPagamentoConfirmacaoAction}
        registerPaymentAction={confirmarPagamentoConfirmacaoAction}
        reservationId={reserva.id}
        totalAmount={Number(reserva.total_amount)}
        transactions={reserva.lancamentosFinanceiros}
      />

      <PainelDetalhe titulo="Timeline">
        {reserva.timeline.length ? (
          <div className="grid gap-3">
            {reserva.timeline.map((evento) => (
              <div className="rounded-lg border bg-background/55 p-3" key={`${evento.tipo}-${evento.id}`}>
                <p className="text-sm">{evento.descricao}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {evento.autor?.full_name ?? evento.autor?.email ?? "Sistema"} ·{" "}
                  {formatarDataHora(evento.data)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhum evento registrado para esta reserva.
          </p>
        )}
      </PainelDetalhe>
    </div>
  );
}

function AcaoConfirmarReserva({
  disabled,
  reservaId,
}: {
  disabled: boolean;
  reservaId: string;
}) {
  return (
    <ConfirmDialog
      description="Ao aprovar, uma cobrança será criada e o período ficará segurado temporariamente."
      disabled={disabled}
      title="Aprovar reserva e gerar cobrança"
      triggerAction="add"
      triggerClassName="w-full justify-center"
      triggerIcon={<CheckCircle2 />}
      triggerLabel={MENSAGENS_PENDENCIA.reservation_request.primaryAction}
      triggerVariant="default"
    >
      <FormularioConfirmacao
        action={confirmarReservaConfirmacaoAction}
        botao={MENSAGENS_PENDENCIA.reservation_request.primaryAction}
        campo="observacao"
        impacto="Ao aprovar, a reserva fica aguardando pagamento e segura o período temporariamente."
        pendingLabel="Gerando..."
        placeholder="Observação operacional opcional"
        reservaId={reservaId}
        variante="add"
      />
    </ConfirmDialog>
  );
}

function AcaoRegistrarPagamento({
  disabled,
  label,
  reserva,
  valorPadrao,
}: {
  disabled: boolean;
  label: string;
  reserva: ReservaConfirmacao;
  valorPadrao: number;
}) {
  const cobrancaAberta = obterCobrancaAberta(reserva);

  return (
    <ConfirmDialog
      description="Registra pagamento parcial ou total e atualiza cobrança, financeiro e timeline."
      disabled={disabled}
      title={label}
      triggerAction="add"
      triggerClassName="w-full justify-center"
      triggerIcon={<Banknote />}
      triggerLabel={label}
      triggerVariant="default"
    >
      <FormularioConfirmacao
        action={confirmarPagamentoConfirmacaoAction}
        botao={label}
        campo="observacao"
        impacto="Confirme apenas valores já recebidos. A ação fica registrada no financeiro e na timeline."
        pendingLabel="Registrando..."
        placeholder="Observação opcional do pagamento"
        reservaId={reserva.id}
        valorPagamentoPadrao={valorPadrao}
        variante="add"
        {...(cobrancaAberta ? { cobrancaId: cobrancaAberta.id } : {})}
      />
    </ConfirmDialog>
  );
}

function AcaoCancelarReserva({
  disabled,
  reservaId,
  statusReserva,
}: {
  disabled: boolean;
  reservaId: string;
  statusReserva: ReservaConfirmacao["status"];
}) {
  const solicitacao = statusReserva === "pending";

  return (
    <ConfirmDialog
      description="Esta ação cancela a reserva e libera o período no calendário."
      disabled={disabled}
      title={solicitacao ? "Recusar solicitação" : "Cancelar reserva"}
      triggerAction="cancel"
      triggerClassName="w-full justify-center"
      triggerIcon={<XCircle />}
      triggerLabel={solicitacao ? "Recusar solicitação" : "Cancelar reserva"}
      triggerVariant="destructive"
    >
      <FormularioConfirmacao
        action={cancelarReservaConfirmacaoAction}
        botao={solicitacao ? "Recusar solicitação" : "Cancelar reserva"}
        campo="observacao"
        impacto="Esta ação cancela a reserva e libera o período no calendário."
        pendingLabel="Cancelando..."
        placeholder="Motivo opcional"
        reservaId={reservaId}
        variante="cancel"
      />
    </ConfirmDialog>
  );
}

function AcaoPagamentoPendente({
  disabled,
  reservaId,
}: {
  disabled: boolean;
  reservaId: string;
}) {
  return (
    <ConfirmDialog
      description="Use apenas quando um pagamento precisa voltar para revisão operacional."
      disabled={disabled}
      title="Voltar pagamento para pendente"
      triggerAction="status"
      triggerClassName="w-full justify-center"
      triggerIcon={<ReceiptText />}
      triggerLabel="Voltar pagamento para pendente"
      triggerVariant="outline"
    >
      <FormularioConfirmacao
        action={marcarPagamentoPendenteConfirmacaoAction}
        botao="Voltar para pendente"
        campo="observacao"
        impacto="O histórico financeiro será preservado para auditoria."
        pendingLabel="Atualizando..."
        placeholder="Observação opcional"
        reservaId={reservaId}
        variante="status"
      />
    </ConfirmDialog>
  );
}

function FormularioConfirmacao({
  action,
  botao,
  campo,
  cobrancaId,
  impacto,
  pendingLabel,
  placeholder,
  reservaId,
  valorPagamentoPadrao,
  variante,
}: {
  action: (formData: FormData) => Promise<void>;
  botao: string;
  campo: string;
  cobrancaId?: string;
  impacto: string;
  pendingLabel: string;
  placeholder: string;
  reservaId: string;
  valorPagamentoPadrao?: number;
  variante: "add" | "cancel" | "status";
}) {
  return (
    <form action={action} className="grid gap-3">
      <input name="reservaId" type="hidden" value={reservaId} />
      {cobrancaId ? <input name="cobrancaId" type="hidden" value={cobrancaId} /> : null}
      <p className="rounded-xl border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-sm text-muted-foreground">
        {impacto}
      </p>
      {typeof valorPagamentoPadrao === "number" ? (
        <label className="grid gap-1 text-xs font-medium text-muted-foreground">
          Valor recebido
          <input
            className="h-10 rounded-md border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            defaultValue={valorPagamentoPadrao.toFixed(2)}
            min="0.01"
            name="valorPagamento"
            step="0.01"
            type="number"
          />
        </label>
      ) : null}
      <textarea
        className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        name={campo}
        placeholder={placeholder}
      />
      <FormActionButton icon={<CheckCircle2 />} pendingLabel={pendingLabel} variant={variante}>
        {botao}
      </FormActionButton>
    </form>
  );
}

function PainelDetalhe({
  children,
  titulo,
}: {
  children: ReactNode;
  titulo: string;
}) {
  return (
    <section className="rounded-xl border bg-background/55 p-4">
      <h3 className="mb-3 text-sm font-semibold">{titulo}</h3>
      <div className="grid gap-3">{children}</div>
    </section>
  );
}

function Resumo({
  icon,
  label,
  valor,
}: {
  icon: ReactNode;
  label: string;
  valor: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border bg-background/35 p-3">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-normal text-muted-foreground">
        <span className="text-primary [&_svg]:h-3.5 [&_svg]:w-3.5">{icon}</span>
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-medium">{valor}</p>
    </div>
  );
}

function Info({
  icon,
  label,
  valor,
}: {
  icon?: ReactNode;
  label: string;
  valor: string;
}) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-normal text-muted-foreground">
        {icon ? <span className="[&_svg]:h-3.5 [&_svg]:w-3.5">{icon}</span> : null}
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-medium">{valor}</p>
    </div>
  );
}

function obterTipoPendenciaReserva(reserva: ReservaConfirmacao): TipoMensagemPendencia {
  if (temComprovanteEmAnalise(reserva)) return "payment_proof_review";
  if (reserva.status === "pending") return "reservation_request";
  if (reserva.payment_status === "partial") return "partial_payment";
  return "awaiting_payment";
}

function temComprovanteEmAnalise(reserva: ReservaConfirmacao) {
  return reserva.pagamentos.some((pagamento) => pagamento.status === "pending_review");
}

function obterCobrancaAberta(reserva: ReservaConfirmacao) {
  return reserva.cobrancas.find((cobranca) =>
    ["pending", "partial", "overdue"].includes(cobranca.status)
  );
}

function calcularSaldoPendente(reserva: ReservaConfirmacao) {
  const cobrancaAberta = obterCobrancaAberta(reserva);
  if (cobrancaAberta) {
    return Math.max(Number(cobrancaAberta.amount) - Number(cobrancaAberta.amount_paid), 0);
  }

  const valorPago = reserva.pagamentos
    .filter((pagamento) => pagamento.status === "confirmed" && pagamento.reversal_type === null)
    .reduce((total, pagamento) => total + Number(pagamento.amount), 0);

  return Math.max(Number(reserva.total_amount) - valorPago, 0);
}

function variantStatusReserva(status: ReservaConfirmacao["status"]) {
  if (status === "confirmed" || status === "checked_in" || status === "completed") {
    return "success";
  }

  if (status === "cancelled") return "danger";
  if (status === "awaiting_payment" || status === "checked_out") return "info";
  return "warning";
}

function variantStatusPagamento(status: ReservaConfirmacao["payment_status"]) {
  if (status === "paid" || status === "received") return "success";
  if (status === "partial") return "info";
  if (status === "cancelled" || status === "refunded") return "danger";
  return "warning";
}

function formatarPeriodo(reserva: ReservaConfirmacao) {
  return `${formatarDataCurta(reserva.check_in)} - ${formatarDataCurta(reserva.check_out)}`;
}

function formatarDataCurta(valor: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  }).format(new Date(`${valor}T00:00:00`));
}

function formatarDataHora(valor: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(valor));
}

function formatarHorarioPrevisto(valor: string | null) {
  return valor ? valor.slice(0, 5) : "Não informado pelo hóspede";
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(Number.isFinite(valor) ? valor : 0);
}

function formatarOrigem(origem: ReservaConfirmacao["source"]) {
  const rotulos: Record<ReservaConfirmacao["source"], string> = {
    direct: "Direta",
    external: "Externa",
    manual: "Manual",
    marketplace: "Marketplace",
  };

  return rotulos[origem];
}

function formatarFormaPagamento(reserva: ReservaConfirmacao) {
  if (!reserva.payment_method) return "Não escolhida";
  return LABEL_FORMA_PAGAMENTO[reserva.payment_method];
}

function formatarLancamentoFinanceiro(reserva: ReservaConfirmacao) {
  const lancamento = reserva.lancamentoFinanceiro;
  if (!lancamento) return "Sem lançamento vinculado";

  return `${LABEL_STATUS_FINANCEIRO[lancamento.status]} - ${formatarMoeda(Number(lancamento.amount))}`;
}
