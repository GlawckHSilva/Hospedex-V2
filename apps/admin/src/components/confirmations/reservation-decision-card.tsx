import {
  Banknote,
  CalendarDays,
  CheckCircle2,
  Mail,
  MessageSquareText,
  Phone,
  User,
  Users,
  XCircle,
} from "lucide-react";
import type { ReactNode } from "react";

import { Badge, Button, Card, CardContent } from "@hospedex/ui";

import {
  adicionarObservacaoConfirmacaoAction,
  cancelarReservaConfirmacaoAction,
  confirmarPagamentoConfirmacaoAction,
  confirmarReservaConfirmacaoAction,
  marcarPagamentoPendenteConfirmacaoAction,
} from "../../lib/confirmations/actions";
import type { ReservaConfirmacao } from "../../lib/confirmations/types";
import { ConfirmDialog, EntityViewModal } from "../management/entity-modal";
import { FormActionButton } from "../management/form-submit-button";
import { ReservationBillingPanel } from "../reservations/reservation-billing-panel";
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
  pending: "Pendente",
} as const;

const LABEL_STATUS_PAGAMENTO = {
  cancelled: "Pagamento cancelado",
  overdue: "Pagamento atrasado",
  paid: "Pagamento quitado",
  partial: "Pagamento parcial",
  pending: "Pagamento pendente",
  received: "Pagamento recebido",
  refunded: "Pagamento estornado",
} as const;

const LABEL_STATUS_FINANCEIRO = {
  cancelled: "Lançamento cancelado",
  paid: "Lançamento pago",
  pending: "Lançamento pendente",
  refunded: "Lançamento estornado",
} as const;

const LABEL_FORMA_PAGAMENTO = {
  bank_transfer: "Transferencia bancaria",
  cash: "Dinheiro",
  credit_card: "Cartao de credito",
  debit_card: "Cartao de debito",
  pix: "Pix",
} as const;

/**
 * Card operacional da reserva.
 *
 * Centraliza decisões sensíveis de confirmação e pagamento. As ações continuam
 * em Server Actions para respeitar tenant, permissões e RLS.
 */
export function ReservationDecisionCard({
  podeGerenciar,
  podeGerenciarPagamento,
  reserva,
}: ReservationDecisionCardProps) {
  const hospede = reserva.hospedePrincipal;
  const reservaEncerrada = ["cancelled", "completed"].includes(reserva.status);
  const podeConfirmarReserva = reserva.status === "pending";
  const pagamentoRecebido = ["paid", "received"].includes(reserva.payment_status);
  const pagamentoComHistorico = ["partial", "paid", "received"].includes(reserva.payment_status);
  const podeCancelarReserva =
    podeGerenciar && (!pagamentoComHistorico || podeGerenciarPagamento);

  return (
    <Card className="admin-glass-card overflow-hidden">
      <CardContent className="grid gap-4 p-5">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={variantStatusReserva(reserva.status)}>
                {LABEL_STATUS_RESERVA[reserva.status]}
              </Badge>
              <Badge variant={variantStatusPagamento(reserva.payment_status)}>
                {LABEL_STATUS_PAGAMENTO[reserva.payment_status]}
              </Badge>
            </div>
            <h3 className="mt-3 text-lg font-semibold tracking-normal">
              {reserva.code}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {hospede?.full_name ?? "Hóspede não informado"}
            </p>
          </div>

          <EntityViewModal
            title={`Reserva ${reserva.code}`}
            triggerLabel="Visualizar"
          >
            <DetalhesReserva
              podeGerenciarPagamento={podeGerenciarPagamento && !reservaEncerrada}
              reserva={reserva}
            />
          </EntityViewModal>
        </header>

        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <Info icon={<Phone />} label="Telefone" valor={hospede?.phone ?? "Não informado"} />
          <Info icon={<Mail />} label="E-mail" valor={hospede?.email ?? "Não informado"} />
          <Info
            icon={<CalendarDays />}
            label="Período"
            valor={`${formatarDataCurta(reserva.check_in)} - ${formatarDataCurta(reserva.check_out)}`}
          />
          <Info
            icon={<CalendarDays />}
            label="Chegada prevista"
            valor={formatarHorarioPrevisto(reserva.expected_checkin_time)}
          />
          <Info
            icon={<CalendarDays />}
            label="Saida prevista"
            valor={formatarHorarioPrevisto(reserva.expected_checkout_time)}
          />
          <Info
            icon={<Users />}
            label="Hóspedes"
            valor={`${reserva.guests_count} ${reserva.guests_count === 1 ? "hóspede" : "hóspedes"}`}
          />
          <Info
            icon={<Banknote />}
            label="Valor total"
            valor={formatarMoeda(Number(reserva.total_amount))}
          />
          <Info
            icon={<MessageSquareText />}
            label="Casa"
            valor={reserva.propriedade?.name ?? "Casa removida"}
          />
          <Info
            icon={<Banknote />}
            label="Financeiro"
            valor={formatarLancamentoFinanceiro(reserva)}
          />
          <Info
            icon={<Banknote />}
            label="Forma escolhida"
            valor={formatarFormaPagamento(reserva)}
          />
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          <AcaoConfirmarReserva
            disabled={!podeGerenciar || !podeConfirmarReserva}
            reservaId={reserva.id}
          />
          <AcaoCancelarReserva
            disabled={reservaEncerrada || !podeCancelarReserva}
            reservaId={reserva.id}
          />
          <AcaoPagamentoRecebido
            disabled={!podeGerenciarPagamento || reservaEncerrada || pagamentoRecebido}
            reserva={reserva}
          />
          <AcaoPagamentoPendente
            disabled={!podeGerenciarPagamento || reservaEncerrada || !pagamentoComHistorico}
            reservaId={reserva.id}
          />
        </div>

        {reserva.mensagemWhatsapp ? (
          <EntityViewModal
            description="Copie a mensagem ou abra o WhatsApp com texto preenchido. O sistema nao confirma envio real nesta etapa."
            title={`WhatsApp da reserva ${reserva.code}`}
            triggerAction="status"
            triggerClassName="w-full"
            triggerIcon={<MessageSquareText />}
            triggerLabel="Ver mensagem"
          >
            <ReservationWhatsappActions reserva={reserva} />
          </EntityViewModal>
        ) : null}
      </CardContent>
    </Card>
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
          <Info label="Período" valor={`${formatarDataCurta(reserva.check_in)} - ${formatarDataCurta(reserva.check_out)}`} />
          <Info label="Chegada prevista" valor={formatarHorarioPrevisto(reserva.expected_checkin_time)} />
          <Info label="Saida prevista" valor={formatarHorarioPrevisto(reserva.expected_checkout_time)} />
          <Info label="Valor" valor={formatarMoeda(Number(reserva.total_amount))} />
          <Info label="Status" valor={LABEL_STATUS_RESERVA[reserva.status]} />
          <Info label="Pagamento" valor={LABEL_STATUS_PAGAMENTO[reserva.payment_status]} />
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
        <Info label="Operacional" valor={reserva.internal_notes ?? reserva.notes ?? "Sem observação operacional."} />
      </PainelDetalhe>

      <ReservationBillingPanel
        canManagePayments={podeGerenciarPagamento}
        charges={reserva.cobrancas}
        currency={reserva.currency}
        defaultPaymentMethod={reserva.payment_method}
        paymentStatus={reserva.payment_status}
        paymentStatusUpdatedAt={reserva.payment_status_updated_at}
        payments={reserva.pagamentos}
        registerPaymentAction={confirmarPagamentoConfirmacaoAction}
        reservationId={reserva.id}
        totalAmount={Number(reserva.total_amount)}
        transactions={reserva.lancamentosFinanceiros}
      />

      <PainelDetalhe titulo="WhatsApp">
        <ReservationWhatsappActions reserva={reserva} />
      </PainelDetalhe>

      <PainelDetalhe titulo="Adicionar observação operacional">
        <form action={adicionarObservacaoConfirmacaoAction} className="grid gap-3">
          <input name="reservaId" type="hidden" value={reserva.id} />
          <textarea
            className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            name="observacao"
            placeholder="Registre uma observação interna para a operação."
            required
          />
          <Button className="w-fit" type="submit">
            <MessageSquareText />
            Adicionar observação
          </Button>
        </form>
      </PainelDetalhe>

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
      description="Ao aprovar, uma cobranca sera criada e o periodo ficara segurado temporariamente."
      disabled={disabled}
      title="Aprovar reserva e gerar cobranca"
      triggerAction="add"
      triggerClassName="w-full"
      triggerIcon={<CheckCircle2 />}
      triggerLabel="Aprovar e gerar cobranca"
      triggerVariant="default"
    >
      <FormularioConfirmacao
        action={confirmarReservaConfirmacaoAction}
        botao="Aprovar e gerar cobranca"
        campo="observacao"
        impacto="Ao aprovar, a reserva fica aguardando pagamento e segura o periodo temporariamente."
        pendingLabel="Gerando..."
        placeholder="Observação operacional opcional"
        reservaId={reservaId}
        variante="add"
      />
    </ConfirmDialog>
  );
}

function AcaoCancelarReserva({
  disabled,
  reservaId,
}: {
  disabled: boolean;
  reservaId: string;
}) {
  return (
    <ConfirmDialog
      description="Esta acao cancela a reserva e libera o periodo no calendario."
      disabled={disabled}
      title="Recusar ou cancelar reserva"
      triggerAction="cancel"
      triggerClassName="w-full"
      triggerIcon={<XCircle />}
      triggerLabel="Recusar/Cancelar reserva"
      triggerVariant="destructive"
    >
      <FormularioConfirmacao
        action={cancelarReservaConfirmacaoAction}
        botao="Cancelar reserva"
        campo="observacao"
        impacto="Esta acao cancela a reserva e libera o periodo no calendario."
        pendingLabel="Cancelando..."
        placeholder="Motivo opcional do cancelamento"
        reservaId={reservaId}
        variante="cancel"
      />
    </ConfirmDialog>
  );
}

function AcaoPagamentoRecebido({
  disabled,
  reserva,
}: {
  disabled: boolean;
  reserva: ReservaConfirmacao;
}) {
  return (
    <ConfirmDialog
      description="Sera criado ou atualizado um lancamento financeiro vinculado a reserva."
      disabled={disabled}
      title="Marcar pagamento como recebido"
      triggerAction="add"
      triggerClassName="w-full"
      triggerIcon={<Banknote />}
      triggerLabel="Marcar como pago"
      triggerVariant="default"
    >
      <FormularioConfirmacao
        action={confirmarPagamentoConfirmacaoAction}
        botao="Marcar como pago"
        campo="observacao"
        impacto="Sera criado/atualizado um lancamento financeiro vinculado a reserva."
        pendingLabel="Registrando..."
        placeholder="Observação opcional do pagamento"
        reservaId={reserva.id}
        valorPagamentoPadrao={Number(reserva.total_amount)}
        variante="add"
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
      description="O financeiro mantera historico do pagamento."
      disabled={disabled}
      title="Voltar pagamento para pendente"
      triggerAction="status"
      triggerClassName="w-full"
      triggerIcon={<Banknote />}
      triggerLabel="Voltar para pendente"
      triggerVariant="outline"
    >
      <FormularioConfirmacao
        action={marcarPagamentoPendenteConfirmacaoAction}
        botao="Voltar para pendente"
        campo="observacao"
        impacto="O financeiro mantera historico do pagamento."
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
      <p className="rounded-xl border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-sm text-muted-foreground">
        {impacto}
      </p>
      <textarea
        className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        name={campo}
        placeholder={placeholder}
      />
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
  return valor ? valor.slice(0, 5) : "Nao informado pelo hospede";
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(valor);
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
  if (!reserva.payment_method) return "Nao escolhida";
  return LABEL_FORMA_PAGAMENTO[reserva.payment_method];
}

function formatarLancamentoFinanceiro(reserva: ReservaConfirmacao) {
  const lancamento = reserva.lancamentoFinanceiro;
  if (!lancamento) return "Sem lançamento vinculado";

  return `${LABEL_STATUS_FINANCEIRO[lancamento.status]} - ${formatarMoeda(Number(lancamento.amount))}`;
}
