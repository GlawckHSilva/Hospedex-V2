import type { ReservationPaymentMethod } from "@hospedex/types";
import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";

import { Badge, Card, CardContent } from "@hospedex/ui";

import {
  LABEL_ORIGEM_RESERVA,
  LABEL_STATUS_PAGAMENTO_RESERVA,
  LABEL_STATUS_RESERVA,
  obterVariantStatusPagamentoReserva,
  obterVariantStatusReserva,
  type ReservaComRelacionamentos,
} from "../../lib/reservations/types";
import { LABEL_STATUS_LANCAMENTO } from "../../lib/finance/types";
import { ReservationTimeline } from "./reservation-timeline";

const LABEL_FORMA_PAGAMENTO: Record<ReservationPaymentMethod, string> = {
  bank_transfer: "Transferencia bancaria",
  cash: "Dinheiro",
  credit_card: "Cartao de credito",
  debit_card: "Cartao de debito",
  pix: "Pix",
};

/**
 * Detalhe operacional da reserva.
 *
 * Centraliza leitura de hospede, casa, valores, pagamento, calendario e timeline
 * para que a listagem continue compacta sem esconder informacoes importantes.
 */
export function ReservationDetails({
  reserva,
}: {
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
  if (["awaiting_payment", "confirmed", "checked_in"].includes(status)) {
    return "Periodo bloqueado para a reserva.";
  }
  if (status === "cancelled") return "Periodo liberado por cancelamento.";
  if (status === "completed" || status === "checked_out") return "Historico preservado.";
  return "Reserva pendente; acompanhe antes de confirmar.";
}

function formatarFormaPagamento(valor: ReservationPaymentMethod | null) {
  return valor ? LABEL_FORMA_PAGAMENTO[valor] : "Nao informado";
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
