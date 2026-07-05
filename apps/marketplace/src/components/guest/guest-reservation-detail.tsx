import {
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  Home,
  MapPin,
  Phone,
  ShieldCheck,
  Users,
  WalletCards
} from "lucide-react";
import type { ReactNode } from "react";

import { GlassCard, GlassPanel, StatusBadge } from "@hospedex/ui";

import {
  formatarDataHoraHospede,
  formatarDataHospede,
  formatarMoedaHospede,
  LABEL_FORMA_PAGAMENTO,
  LABEL_STATUS_PAGAMENTO,
  LABEL_STATUS_RESERVA,
  MENSAGEM_STATUS_RESERVA,
  tomStatusPagamento,
  tomStatusReserva
} from "../../lib/guest/format";
import type { ReservaHospedeDetalhe } from "../../lib/guest/types";
import { ReservationVoucher } from "./reservation-voucher";

export function GuestReservationDetail({
  reserva
}: {
  reserva: ReservaHospedeDetalhe;
}) {
  const propriedade = reserva.propriedade;
  const proprietario = reserva.proprietario;
  const pagamento = reserva.pagamento;
  const formaPagamento = reserva.formaPagamento
    ? LABEL_FORMA_PAGAMENTO[reserva.formaPagamento]
    : "Nao informada";

  return (
    <div className="grid gap-6">
      <GlassPanel className="overflow-hidden p-0">
        <div className="relative min-h-64 bg-secondary">
          {propriedade?.imagemCapa ? (
            <img
              alt={`Foto de ${propriedade.nome}`}
              className="h-full min-h-64 w-full object-cover"
              src={propriedade.imagemCapa}
            />
          ) : (
            <div className="premium-grid-bg h-full min-h-64 w-full" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8">
            <div className="flex flex-wrap gap-2">
              <StatusBadge tone={tomStatusReserva(reserva.status)}>
                {LABEL_STATUS_RESERVA[reserva.status]}
              </StatusBadge>
              <StatusBadge tone={tomStatusPagamento(reserva.statusPagamento)}>
                Pagamento {LABEL_STATUS_PAGAMENTO[reserva.statusPagamento]}
              </StatusBadge>
            </div>
            <h1 className="mt-4 text-3xl font-semibold sm:text-5xl">
              {propriedade?.nome ?? "Reserva"}
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
              {MENSAGEM_STATUS_RESERVA[reserva.status] ??
                "Acompanhe os dados da sua hospedagem."}
            </p>
          </div>
        </div>
      </GlassPanel>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-6">
          <Secao title="Detalhes da reserva">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Resumo icon={CalendarDays} label="Check-in" value={formatarDataHospede(reserva.checkIn)} />
              <Resumo icon={CalendarDays} label="Check-out" value={formatarDataHospede(reserva.checkOut)} />
              <Resumo icon={Users} label="Hospedes" value={`${reserva.hospedesQuantidade}`} />
              <Resumo icon={WalletCards} label="Total" value={formatarMoedaHospede(reserva.total)} />
            </div>
            <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
              <Linha label="Codigo" value={reserva.codigo} />
              <Linha label="Forma de pagamento" value={formaPagamento} />
              <Linha
                label="Chegada prevista"
                value={
                  formatarHorarioPrevisto(reserva.horarioPrevistoCheckIn) ??
                  "Horario previsto de chegada nao informado pelo hospede."
                }
              />
              <Linha
                label="Saida prevista"
                value={
                  formatarHorarioPrevisto(reserva.horarioPrevistoCheckOut) ??
                  "Horario previsto de saida nao informado pelo hospede."
                }
              />
              <Linha label="Taxa de limpeza" value={formatarMoedaHospede(reserva.taxaLimpeza)} />
              <Linha label="Observacoes" value={reserva.observacoes ?? "Sem observacoes."} />
            </div>
          </Secao>

          <Secao title="Pagamento">
            <div className="grid gap-4">
              <div className="flex flex-wrap gap-2">
                <StatusBadge tone={tomStatusPagamento(reserva.statusPagamento)}>
                  {LABEL_STATUS_PAGAMENTO[reserva.statusPagamento]}
                </StatusBadge>
                <StatusBadge tone="info">{formaPagamento}</StatusBadge>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                {pagamento?.instrucoes ??
                  "As instrucoes de pagamento serao exibidas quando o proprietario confirmar a reserva."}
              </p>
              {pagamento?.mensagemPreparada ? (
                <div className="rounded-xl border bg-background/45 p-4 text-sm text-muted-foreground">
                  {pagamento.mensagemPreparada}
                </div>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-3">
                <Resumo
                  icon={WalletCards}
                  label="Total"
                  value={formatarMoedaHospede(reserva.financeiro.valorTotal)}
                />
                <Resumo
                  icon={CheckCircle2}
                  label="Pago"
                  value={formatarMoedaHospede(reserva.financeiro.valorPago)}
                />
                <Resumo
                  icon={Clock}
                  label="Pendente"
                  value={formatarMoedaHospede(reserva.financeiro.valorPendente)}
                />
              </div>
              {reserva.financeiro.cobrancaAberta ? (
                <div className="rounded-xl border border-cyan-300/20 bg-background/45 p-4 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone="warning">Cobranca aberta</StatusBadge>
                    <StatusBadge tone={tomStatusPagamento(reserva.statusPagamento)}>
                      {formatarStatusCobranca(reserva.financeiro.cobrancaAberta.status)}
                    </StatusBadge>
                  </div>
                  <div className="mt-4 grid gap-2 text-muted-foreground">
                    <Linha
                      label="Valor pendente"
                      value={formatarMoedaHospede(reserva.financeiro.cobrancaAberta.valorPendente)}
                    />
                    <Linha
                      label="Vencimento"
                      value={
                        reserva.financeiro.cobrancaAberta.vencimento
                          ? formatarDataHoraHospede(reserva.financeiro.cobrancaAberta.vencimento)
                          : "Sem vencimento informado."
                      }
                    />
                    <Linha
                      label="Forma"
                      value={
                        reserva.financeiro.cobrancaAberta.formaPagamento
                          ? LABEL_FORMA_PAGAMENTO[reserva.financeiro.cobrancaAberta.formaPagamento]
                          : formaPagamento
                      }
                    />
                  </div>
                  {reserva.financeiro.cobrancaAberta.instrucoes ? (
                    <p className="mt-4 rounded-xl border bg-background/45 p-3 text-muted-foreground">
                      {reserva.financeiro.cobrancaAberta.instrucoes}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed bg-background/35 p-4 text-sm text-muted-foreground">
                  Nenhuma cobranca aberta para esta reserva.
                </p>
              )}
              {reserva.financeiro.pagamentos.length ? (
                <div className="grid gap-2">
                  {reserva.financeiro.pagamentos.map((item) => (
                    <div
                      className="flex flex-col gap-2 rounded-xl border bg-background/45 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                      key={`${item.criadoEm}-${item.valor}`}
                    >
                      <div>
                        <p className="font-medium">
                          {formatarMoedaHospede(item.valor)} - {formatarStatusPagamentoRegistro(item.status)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.confirmadoEm
                            ? `Confirmado em ${formatarDataHoraHospede(item.confirmadoEm)}`
                            : `Registrado em ${formatarDataHoraHospede(item.criadoEm)}`}
                        </p>
                        {item.tipoReversao === "refund" ? (
                          <p className="mt-1 text-xs text-amber-200">
                            Estorno registrado para esta reserva.
                          </p>
                        ) : null}
                        {item.valorEstornado > 0 && item.tipoReversao === null ? (
                          <p className="mt-1 text-xs text-amber-200">
                            Valor ja estornado: {formatarMoedaHospede(item.valorEstornado)}
                          </p>
                        ) : null}
                      </div>
                      {item.formaPagamento ? (
                        <StatusBadge tone="info">{LABEL_FORMA_PAGAMENTO[item.formaPagamento]}</StatusBadge>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </Secao>

          <Secao title="Guia da viagem">
            <div className="grid gap-3 sm:grid-cols-2">
              <Resumo
                icon={Clock}
                label="Check-in padrao"
                value={reserva.checkInHorario ?? "Horario padrao ainda nao informado."}
              />
              <Resumo
                icon={Clock}
                label="Check-out padrao"
                value={reserva.checkOutHorario ?? "Horario padrao ainda nao informado."}
              />
            </div>
            <ListaSimples
              itens={reserva.regrasCasa}
              tituloVazio="O proprietario ainda nao cadastrou regras para esta casa."
            />
            <ListaSimples
              itens={reserva.comodidades.slice(0, 12)}
              titulo="Comodidades"
              tituloVazio="Esta casa ainda nao possui comodidades cadastradas."
            />
          </Secao>

          <Secao title="Guia da regiao">
            {reserva.guiaRegiao.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {reserva.guiaRegiao.slice(0, 6).map((local) => (
                  <div className="rounded-xl border bg-background/45 p-4" key={local.nome}>
                    <p className="text-xs uppercase tracking-[0.16em] text-primary">
                      {local.categoria}
                    </p>
                    <h3 className="mt-2 font-semibold">{local.nome}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {local.endereco ?? local.telefone ?? local.whatsapp ?? "Detalhes nao informados."}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                O proprietario ainda nao cadastrou recomendacoes para esta regiao.
              </p>
            )}
          </Secao>

          <Secao title="Timeline">
            <div className="grid gap-3">
              {reserva.timeline.map((item) => (
                <div className="flex gap-3 rounded-xl border bg-background/45 p-4" key={`${item.data}-${item.status}`}>
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{item.descricao}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatarDataHoraHospede(item.data)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Secao>
        </div>

        <aside className="grid gap-6 self-start lg:sticky lg:top-24">
          <ReservationVoucher reserva={reserva} />

          <GlassCard className="p-5">
            <h2 className="text-lg font-semibold">Localizacao e contato</h2>
            <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
              <p className="inline-flex gap-2">
                <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                {montarEnderecoCompleto(propriedade) ??
                  "Endereco ainda nao informado pelo proprietario."}
              </p>
              {propriedade?.googleMapsLink ? (
                <a
                  className="inline-flex items-center gap-2 text-primary hover:text-primary/80"
                  href={propriedade.googleMapsLink}
                  rel="noreferrer"
                  target="_blank"
                >
                  Abrir no Google Maps
                  <ExternalLink className="h-4 w-4" />
                </a>
              ) : null}
              <p className="inline-flex gap-2">
                <Phone className="mt-0.5 h-4 w-4 text-primary" />
                {proprietario?.whatsapp ??
                  proprietario?.telefone ??
                  pagamento?.proprietarioWhatsapp ??
                  pagamento?.proprietarioTelefone ??
                  "Contato do proprietario ainda nao informado."}
              </p>
              {proprietario?.nome || proprietario?.empreendimento ? (
                <p>
                  {proprietario.nome ?? proprietario.empreendimento}
                  {proprietario.cidade || proprietario.estado
                    ? ` - ${[proprietario.cidade, proprietario.estado].filter(Boolean).join("/")}`
                    : ""}
                </p>
              ) : null}
            </div>
          </GlassCard>
        </aside>
      </div>
    </div>
  );
}

function Secao({
  children,
  title
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <GlassCard className="p-5">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </GlassCard>
  );
}

function Resumo({
  icon: Icone,
  label,
  value
}: {
  icon: typeof Home;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border bg-background/45 p-4">
      <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
        <Icone className="h-4 w-4 text-primary" />
        {label}
      </span>
      <strong className="mt-2 block text-base text-foreground">{value}</strong>
    </div>
  );
}

function Linha({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <strong className="max-w-[60%] text-right font-medium text-foreground">{value}</strong>
    </div>
  );
}

function ListaSimples({
  itens,
  titulo,
  tituloVazio
}: {
  itens: string[];
  titulo?: string;
  tituloVazio: string;
}) {
  return (
    <div className="mt-5">
      {titulo ? <h3 className="mb-3 font-semibold">{titulo}</h3> : null}
      {itens.length ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {itens.map((item) => (
            <span
              className="inline-flex items-center gap-2 rounded-xl border bg-background/45 p-3 text-sm"
              key={item}
            >
              <ShieldCheck className="h-4 w-4 text-primary" />
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{tituloVazio}</p>
      )}
    </div>
  );
}

function formatarStatusCobranca(status: ReservaHospedeDetalhe["financeiro"]["cobrancaAberta"] extends infer Cobranca
  ? Cobranca extends { status: infer Status }
    ? Status
    : never
  : never) {
  const labels = {
    cancelled: "Cancelada",
    overdue: "Vencida",
    paid: "Quitada",
    partial: "Parcial",
    pending: "Pendente",
    refunded: "Estornada",
  } as const;

  return labels[status as keyof typeof labels] ?? "Pendente";
}

function formatarStatusPagamentoRegistro(
  status: ReservaHospedeDetalhe["financeiro"]["pagamentos"][number]["status"]
) {
  const labels = {
    cancelled: "cancelado",
    confirmed: "confirmado",
    pending_review: "em analise",
    refunded: "estornado",
    rejected: "rejeitado",
  } as const;

  return labels[status];
}

function formatarHorarioPrevisto(horario: string | null) {
  if (!horario) return null;
  return horario.slice(0, 5);
}

function montarEnderecoCompleto(propriedade: ReservaHospedeDetalhe["propriedade"]) {
  if (!propriedade) return null;

  const partes = [
    propriedade.enderecoLinha,
    propriedade.bairro,
    [propriedade.cidade, propriedade.estado].filter(Boolean).join("/")
  ].filter(Boolean);

  return partes.length ? partes.join(" - ") : null;
}
