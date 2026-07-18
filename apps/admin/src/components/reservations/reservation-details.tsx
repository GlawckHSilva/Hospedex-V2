import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";

import { Badge, Card, CardContent } from "@hospedex/ui";

import {
  LABEL_ORIGEM_RESERVA,
  LABEL_STATUS_PAGAMENTO_RESERVA,
  LABEL_STATUS_RESERVA,
  obterVariantStatusPagamentoReserva,
  obterVariantStatusReserva,
  reservaPermiteAcoesFinanceiras,
  type ReservaComRelacionamentos,
} from "../../lib/reservations/types";
import { LABEL_STATUS_LANCAMENTO } from "../../lib/finance/types";
import {
  cancelarPagamentoReservaAction,
  estornarPagamentoReservaAction,
  registrarPagamentoManualReservaAction
} from "../../lib/reservations/actions";
import { ReservationTimeline } from "./reservation-timeline";
import { ReservationBillingPanel } from "./reservation-billing-panel";

/**
 * Detalhe operacional da reserva.
 *
 * Centraliza leitura de hospede, casa, valores, pagamento, calendario e timeline
 * para que a listagem continue compacta sem esconder informacoes importantes.
 */
export function ReservationDetails({
  podeGerenciarPagamento = false,
  reserva,
}: {
  podeGerenciarPagamento?: boolean;
  reserva: ReservaComRelacionamentos;
}) {
  const hospede =
    reserva.hospedes.find((item) => item.is_primary) ?? reserva.hospedes[0];
  const endereco = obterObjetoJson(reserva.propriedade?.address);
  const valores = obterObjetoJson(reserva.propriedade?.pricing_details);
  const noites = calcularNoites(reserva.check_in, reserva.check_out);
  const valorDiaria = Number(valores.valorDiaria ?? 0);
  const taxaLimpeza = Number(valores.taxaLimpeza ?? 0);
  const caucao = Number(valores.valorCaucao ?? 0);
  const valorBase = Number(reserva.total_amount);
  const lancamentoPrincipal =
    reserva.lancamentosFinanceiros.find((item) => item.status === "paid") ??
    reserva.lancamentosFinanceiros[0] ??
    null;
  const podeOperarFinanceiro =
    podeGerenciarPagamento && reservaPermiteAcoesFinanceiras(reserva.status);

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_22rem]">
      <div className="space-y-4">
        <Secao titulo="Resumo">
          <Info label="Codigo" valor={reserva.code} />
          <Info
            label="Status"
            valor={
              <Badge variant={obterVariantStatusReserva(reserva.status)}>
                {LABEL_STATUS_RESERVA[reserva.status]}
              </Badge>
            }
          />
          <Info
            label="Pagamento"
            valor={
              <Badge
                variant={obterVariantStatusPagamentoReserva(reserva.statusPagamento)}
              >
                {LABEL_STATUS_PAGAMENTO_RESERVA[reserva.statusPagamento]}
              </Badge>
            }
          />
          <Info label="Origem" valor={LABEL_ORIGEM_RESERVA[reserva.source]} />
          <Info label="Criada em" valor={formatarDataHora(reserva.created_at)} />
          <Info label="Atualizada em" valor={formatarDataHora(reserva.updated_at)} />
        </Secao>

        <Secao titulo="Hospede">
          <div className="flex items-center gap-3 rounded-lg border bg-background/55 p-3 sm:col-span-2 xl:col-span-3">
            <AvatarHospede
              avatarUrl={reserva.hospedePerfil?.avatar_url ?? null}
              nome={reserva.hospedePerfil?.full_name ?? hospede?.full_name ?? "Hospede"}
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {hospede?.full_name ?? "Nao informado"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {hospede?.email ?? "E-mail nao informado"}
              </p>
            </div>
          </div>
          <Info label="Nome" valor={hospede?.full_name ?? "Nao informado"} />
          <Info label="Telefone" valor={hospede?.phone ?? "Nao informado"} />
          <Info label="E-mail" valor={hospede?.email ?? "Nao informado"} />
          <Info label="Documento" valor={hospede?.document_number ?? "Nao informado"} />
          <Info label="Observacoes" valor={reserva.guest_notes ?? "Sem observacoes."} />
        </Secao>

        <Secao titulo="Casa">
          <Info label="Nome" valor={reserva.propriedade?.name ?? "Casa removida"} />
          <Info label="Endereco" valor={montarEndereco(endereco)} />
          <Info label="Cidade/estado" valor={montarCidadeEstado(endereco)} />
          <Info
            label="Google Maps"
            valor={
              typeof endereco.googleMapsLink === "string" && endereco.googleMapsLink ? (
                <a
                  className="inline-flex items-center gap-1 text-cyan-700 underline-offset-4 hover:underline dark:text-cyan-200"
                  href={endereco.googleMapsLink}
                  rel="noreferrer"
                  target="_blank"
                >
                  Abrir mapa <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : (
                "Nao informado"
              )
            }
          />
        </Secao>

        <Secao titulo="Periodo">
          <Info label="Check-in" valor={formatarData(reserva.check_in)} />
          <Info label="Check-out" valor={formatarData(reserva.check_out)} />
          <Info label="Noites" valor={`${noites} noite(s)`} />
          <Info label="Hospedes" valor={`${reserva.guests_count} hospede(s)`} />
          <Info
            label="Horario de chegada"
            valor={formatarHorarioPrevisto(reserva.expected_checkin_time)}
          />
          <Info
            label="Horario de saida"
            valor={formatarHorarioPrevisto(reserva.expected_checkout_time)}
          />
        </Secao>

        <Secao titulo="Valores">
          <Info label="Diaria" valor={formatarMoeda(valorDiaria)} />
          <Info label="Quantidade de diarias" valor={String(noites)} />
          <Info label="Taxa de limpeza" valor={formatarMoeda(taxaLimpeza)} />
          <Info label="Servicos extras" valor={formatarMoeda(reserva.valorServicosExtras)} />
          <Info label="Caucao" valor={formatarMoeda(caucao)} />
          <Info label="Juros/parcelas" valor="Nao informado" />
          <Info label="Total da reserva" valor={formatarMoeda(valorBase)} />
          <Info label="Total com extras" valor={formatarMoeda(reserva.valorTotalComExtras)} />
        </Secao>

        <Secao titulo="Pagamento e financeiro">
          <Info label="Forma de pagamento" valor={formatarFormaPagamento(reserva.payment_method)} />
          <Info
            label="Status do pagamento"
            valor={LABEL_STATUS_PAGAMENTO_RESERVA[reserva.statusPagamento]}
          />
          <Info label="Instrucoes" valor={reserva.notes ?? "Sem instrucoes cadastradas."} />
          <Info
            label="Lancamento vinculado"
            valor={lancamentoPrincipal ? lancamentoPrincipal.description ?? lancamentoPrincipal.id : "Nenhum"}
          />
          <Info
            label="Status financeiro"
            valor={
              lancamentoPrincipal
                ? LABEL_STATUS_LANCAMENTO[lancamentoPrincipal.status]
                : "Sem lancamento"
            }
          />
        </Secao>

        <ReservationBillingPanel
          canManagePayments={podeOperarFinanceiro}
          charges={reserva.cobrancas}
          currency={reserva.currency}
          defaultPaymentMethod={reserva.payment_method}
          paymentStatus={reserva.statusPagamento}
          paymentStatusUpdatedAt={reserva.payment_status_updated_at}
          payments={reserva.pagamentos}
          cancelPaymentAction={cancelarPagamentoReservaAction}
          refundPaymentAction={estornarPagamentoReservaAction}
          registerPaymentAction={registrarPagamentoManualReservaAction}
          reservationId={reserva.id}
          totalAmount={Number(reserva.total_amount)}
          transactions={reserva.lancamentosFinanceiros}
        />

        <Secao titulo="Calendario">
          <Info label="Recurso reservavel" valor="Casa/propriedade" />
          <Info label="Base" valor="property_id" />
          <Info label="Bloqueio" valor={obterStatusCalendario(reserva.status)} />
        </Secao>
      </div>

      <aside className="space-y-4">
        <Card className="border-cyan-300/20 bg-background/55">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold">Timeline</h3>
            <div className="mt-4">
              <ReservationTimeline reserva={reserva} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-cyan-300/20 bg-background/55">
          <CardContent className="space-y-3 p-4">
            <h3 className="text-sm font-semibold">Financeiro vinculado</h3>
            {reserva.lancamentosFinanceiros.length ? (
              reserva.lancamentosFinanceiros.map((lancamento) => (
                <div className="rounded-lg border bg-background/60 p-3 text-sm" key={lancamento.id}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">
                      {lancamento.description ?? "Lancamento da reserva"}
                    </span>
                    <Badge variant="outline">{LABEL_STATUS_LANCAMENTO[lancamento.status]}</Badge>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    {formatarMoeda(Number(lancamento.amount))} -{" "}
                    {lancamento.due_date ? formatarData(lancamento.due_date) : "Sem vencimento"}
                  </p>
                </div>
              ))
            ) : (
              <p className="rounded-lg border border-dashed bg-background/45 p-3 text-sm text-muted-foreground">
                Nenhum lancamento financeiro vinculado a esta reserva.
              </p>
            )}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function Secao({ children, titulo }: { children: ReactNode; titulo: string }) {
  return (
    <Card className="border-cyan-300/20 bg-background/50">
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold">{titulo}</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

function AvatarHospede({
  avatarUrl,
  nome,
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

function obterIniciais(nome: string) {
  return nome
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("");
}

function Info({ label, valor }: { label: string; valor: ReactNode }) {
  return (
    <div className="rounded-lg border bg-background/55 p-3 text-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1 break-words font-medium">{valor}</div>
    </div>
  );
}

function obterObjetoJson(valor: unknown): Record<string, unknown> {
  return valor && typeof valor === "object" && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : {};
}

function obterTexto(objeto: Record<string, unknown>, chave: string) {
  const valor = objeto[chave];
  return typeof valor === "string" ? valor : "";
}

function montarEndereco(endereco: Record<string, unknown>) {
  const partes = [
    obterTexto(endereco, "endereco"),
    obterTexto(endereco, "numero"),
    obterTexto(endereco, "bairro"),
  ].filter(Boolean);

  return partes.length ? partes.join(", ") : "Nao informado";
}

function montarCidadeEstado(endereco: Record<string, unknown>) {
  const cidade = obterTexto(endereco, "cidade");
  const estado = obterTexto(endereco, "estado");
  if (cidade && estado) return `${cidade} - ${estado}`;
  return cidade || estado || "Nao informado";
}

function obterStatusCalendario(status: ReservaComRelacionamentos["status"]) {
  if (status === "confirmed" || status === "checked_in") {
    return "Periodo bloqueado no calendario da casa.";
  }
  if (status === "awaiting_payment") {
    return "Aparece na agenda, mas so bloqueia definitivamente apos confirmacao.";
  }
  if (status === "cancelled") return "Periodo liberado por cancelamento.";
  if (status === "completed" || status === "checked_out") return "Historico preservado.";
  return "Reserva pendente; acompanhe antes de confirmar.";
}

function formatarFormaPagamento(valor: ReservaComRelacionamentos["payment_method"]) {
  const rotulos = {
    bank_transfer: "Transferencia bancaria",
    cash: "Dinheiro",
    credit_card: "Cartao de credito",
    debit_card: "Cartao de debito",
    pix: "Pix",
  } as const;

  return valor ? rotulos[valor] : "Nao informado";
}

function formatarHorarioPrevisto(valor: string | null) {
  return valor ? valor.slice(0, 5) : "Nao informado";
}

function calcularNoites(inicio: string, fim: string) {
  const inicioDate = new Date(`${inicio}T00:00:00Z`);
  const fimDate = new Date(`${fim}T00:00:00Z`);
  return Math.max(
    Math.round((fimDate.getTime() - inicioDate.getTime()) / 86_400_000),
    1
  );
}

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(Number.isFinite(valor) ? valor : 0);
}

function formatarData(valor: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(
    new Date(`${valor}T00:00:00`),
  );
}

function formatarDataHora(valor: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(valor));
}
