import { CalendarDays, CopyCheck, Home, MapPin, Phone, User, WalletCards } from "lucide-react";

import { GlassCard } from "@hospedex/ui";

import {
  formatarDataHoraHospede,
  formatarDataHospede,
  formatarMoedaHospede,
  LABEL_FORMA_PAGAMENTO,
  LABEL_STATUS_PAGAMENTO,
  LABEL_STATUS_RESERVA
} from "../../lib/guest/format";
import type { ReservaHospedeDetalhe } from "../../lib/guest/types";
import { VoucherActions } from "./voucher-actions";

type VoucherStatus = "cancelado" | "pendente" | "provisorio" | "valido";

/**
 * Voucher visual da reserva do hospede.
 *
 * Este componente separa a exibicao do comprovante das regras operacionais da
 * reserva. O voucher nunca altera status, pagamento ou calendario; ele apenas
 * apresenta os dados ja autorizados pela rota protegida do hospede.
 */
export function ReservationVoucher({ reserva }: { reserva: ReservaHospedeDetalhe }) {
  const disponivel = reserva.status !== "pending";
  const statusVoucher = obterStatusVoucher(reserva);
  const textoVoucher = montarTextoVoucher(reserva);

  if (!disponivel) {
    return (
      <GlassCard className="p-5">
        <VoucherHeader texto={textoVoucher} disponivel={false} />
        <div className="mt-5 rounded-xl border border-amber-300/25 bg-amber-400/10 p-4 text-sm text-amber-100">
          O voucher sera liberado apos a confirmacao da reserva.
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-4 sm:p-5">
      <VoucherHeader texto={textoVoucher} disponivel />
      <article
        className="guest-voucher-print-root mt-5 overflow-hidden rounded-2xl bg-white text-slate-950 shadow-2xl ring-1 ring-slate-200"
        id="voucher-hospedagem"
      >
        <div className="border-b border-slate-200 bg-slate-950 px-5 py-5 text-white sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-300">
                Voucher de hospedagem
              </p>
              <h2 className="mt-2 text-2xl font-bold">Comprovante da reserva realizada pelo Hospedex</h2>
              <p className="mt-2 text-sm text-slate-300">
                Emitido em {formatarDataHoraHospede(new Date().toISOString())}
              </p>
            </div>
            <VoucherBadge status={statusVoucher} />
          </div>
          <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
            <VoucherInfo label="Codigo" value={reserva.codigo} />
            <VoucherInfo label="Reserva" value={LABEL_STATUS_RESERVA[reserva.status]} />
            <VoucherInfo label="Pagamento" value={LABEL_STATUS_PAGAMENTO[reserva.statusPagamento]} />
          </div>
        </div>

        {statusVoucher === "provisorio" ? (
          <VoucherNotice>
            Este voucher so tera validade completa apos a confirmacao do pagamento pelo proprietario.
          </VoucherNotice>
        ) : null}
        {statusVoucher === "cancelado" ? (
          <VoucherNotice tone="danger">
            Esta reserva foi cancelada. Este comprovante permanece apenas como historico.
          </VoucherNotice>
        ) : null}

        <div className="grid gap-5 p-5 sm:p-6">
          <VoucherSection icon={User} title="Hospede">
            <VoucherLine label="Nome" value={reserva.hospede?.nome} />
            <VoucherLine label="E-mail" value={reserva.hospede?.email} />
            <VoucherLine label="Telefone" value={reserva.hospede?.telefone} />
            <VoucherLine label="Documento" value={reserva.hospede?.documento} />
          </VoucherSection>

          <VoucherSection icon={Home} title="Hospedagem">
            <VoucherLine label="Casa" value={reserva.propriedade?.nome} />
            <VoucherLine
              label="Periodo"
              value={`${formatarDataHospede(reserva.checkIn)} a ${formatarDataHospede(reserva.checkOut)}`}
            />
            <VoucherLine label="Noites" value={formatarNoites(reserva)} />
            <VoucherLine label="Hospedes" value={`${reserva.hospedesQuantidade}`} />
            <VoucherLine
              label="Chegada prevista"
              value={formatarHorarioPrevisto(reserva.horarioPrevistoCheckIn) ?? reserva.checkInHorario}
            />
            <VoucherLine
              label="Saida prevista"
              value={formatarHorarioPrevisto(reserva.horarioPrevistoCheckOut) ?? reserva.checkOutHorario}
            />
          </VoucherSection>

          <VoucherSection icon={WalletCards} title="Pagamento">
            <VoucherLine label="Forma" value={formatarFormaPagamento(reserva)} />
            <VoucherLine label="Status" value={LABEL_STATUS_PAGAMENTO[reserva.statusPagamento]} />
            <VoucherLine label="Valor total" value={formatarMoedaHospede(reserva.financeiro.valorTotal)} />
            <VoucherLine label="Valor pago" value={formatarMoedaHospede(reserva.financeiro.valorPago)} />
            <VoucherLine label="Valor pendente" value={formatarMoedaHospede(reserva.financeiro.valorPendente)} />
            <VoucherLine label="Taxa de limpeza" value={formatarMoedaHospede(reserva.taxaLimpeza)} />
          </VoucherSection>

          <VoucherSection icon={MapPin} title="Endereco e anfitriao">
            <VoucherLine label="Endereco" value={montarEnderecoCompleto(reserva.propriedade)} />
            <VoucherLine label="Google Maps" value={reserva.propriedade?.googleMapsLink} />
            <VoucherLine
              label="Anfitriao"
              value={reserva.proprietario?.nome ?? reserva.proprietario?.empreendimento ?? reserva.pagamento?.proprietarioNome}
            />
            <VoucherLine
              label="Contato"
              value={
                reserva.proprietario?.whatsapp ??
                reserva.proprietario?.telefone ??
                reserva.pagamento?.proprietarioWhatsapp ??
                reserva.pagamento?.proprietarioTelefone
              }
            />
          </VoucherSection>

          <VoucherSection icon={CopyCheck} title="Instrucoes e regras">
            <VoucherLine label="Observacoes" value={reserva.observacoes} />
            <VoucherList label="Regras da casa" values={reserva.regrasCasa.slice(0, 8)} />
            <VoucherList label="Comodidades principais" values={reserva.comodidades.slice(0, 10)} />
          </VoucherSection>

          {reserva.pagamento?.instrucoes ? (
            <VoucherSection icon={Phone} title="Instrucoes de pagamento">
              <p className="text-sm leading-6 text-slate-700">{reserva.pagamento.instrucoes}</p>
            </VoucherSection>
          ) : null}
        </div>
      </article>
    </GlassCard>
  );
}

function VoucherHeader({ disponivel, texto }: { disponivel: boolean; texto: string }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          Voucher de hospedagem
        </p>
        <h2 className="mt-2 text-2xl font-semibold">Comprovante de reserva</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Documento visual para consulta, copia e impressao pelo hospede.
        </p>
      </div>
      <VoucherActions disponivel={disponivel} texto={texto} />
    </div>
  );
}

function VoucherBadge({ status }: { status: VoucherStatus }) {
  const estilos = {
    cancelado: "bg-red-100 text-red-800 ring-red-200",
    pendente: "bg-amber-100 text-amber-800 ring-amber-200",
    provisorio: "bg-sky-100 text-sky-800 ring-sky-200",
    valido: "bg-emerald-100 text-emerald-800 ring-emerald-200"
  } as const;
  const labels = {
    cancelado: "Cancelado",
    pendente: "Pendente",
    provisorio: "Provisorio",
    valido: "Valido"
  } as const;

  return (
    <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ring-1 ${estilos[status]}`}>
      {labels[status]}
    </span>
  );
}

function VoucherNotice({
  children,
  tone = "warning"
}: {
  children: string;
  tone?: "danger" | "warning";
}) {
  const classe =
    tone === "danger"
      ? "border-red-200 bg-red-50 text-red-800"
      : "border-amber-200 bg-amber-50 text-amber-800";

  return <p className={`border-b px-5 py-3 text-sm font-medium sm:px-6 ${classe}`}>{children}</p>;
}

function VoucherSection({
  children,
  icon: Icone,
  title
}: {
  children: React.ReactNode;
  icon: typeof CalendarDays;
  title: string;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
      <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-slate-700">
        <Icone className="h-4 w-4 text-cyan-700" />
        {title}
      </h3>
      <div className="mt-4 grid gap-2">{children}</div>
    </section>
  );
}

function VoucherInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/15 bg-white/10 px-3 py-2">
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-cyan-200">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function VoucherLine({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;

  return (
    <div className="grid gap-1 text-sm sm:grid-cols-[150px_1fr]">
      <span className="font-medium text-slate-500">{label}</span>
      <strong className="font-semibold text-slate-900">{value}</strong>
    </div>
  );
}

function VoucherList({ label, values }: { label: string; values: string[] }) {
  if (!values.length) return null;

  return (
    <div className="grid gap-2 text-sm">
      <span className="font-medium text-slate-500">{label}</span>
      <div className="flex flex-wrap gap-2">
        {values.map((value) => (
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200" key={value}>
            {value}
          </span>
        ))}
      </div>
    </div>
  );
}

export function montarTextoVoucher(reserva: ReservaHospedeDetalhe) {
  const linhas = [
    "VOUCHER DE HOSPEDAGEM - HOSPEDEX",
    `Reserva: ${reserva.codigo}`,
    `Status da reserva: ${LABEL_STATUS_RESERVA[reserva.status]}`,
    `Status do pagamento: ${LABEL_STATUS_PAGAMENTO[reserva.statusPagamento]}`,
    `Hospede: ${reserva.hospede?.nome ?? ""}`,
    reserva.hospede?.email ? `E-mail: ${reserva.hospede.email}` : null,
    reserva.hospede?.telefone ? `Telefone: ${reserva.hospede.telefone}` : null,
    `Casa: ${reserva.propriedade?.nome ?? ""}`,
    `Periodo: ${formatarDataHospede(reserva.checkIn)} a ${formatarDataHospede(reserva.checkOut)}`,
    formatarNoites(reserva) ? `Noites: ${formatarNoites(reserva)}` : null,
    `Hospedes: ${reserva.hospedesQuantidade}`,
    formatarHorarioPrevisto(reserva.horarioPrevistoCheckIn)
      ? `Chegada prevista: ${formatarHorarioPrevisto(reserva.horarioPrevistoCheckIn)}`
      : null,
    formatarHorarioPrevisto(reserva.horarioPrevistoCheckOut)
      ? `Saida prevista: ${formatarHorarioPrevisto(reserva.horarioPrevistoCheckOut)}`
      : null,
    `Forma de pagamento: ${formatarFormaPagamento(reserva)}`,
    `Valor total: ${formatarMoedaHospede(reserva.financeiro.valorTotal)}`,
    `Valor pago: ${formatarMoedaHospede(reserva.financeiro.valorPago)}`,
    `Valor pendente: ${formatarMoedaHospede(reserva.financeiro.valorPendente)}`,
    montarEnderecoCompleto(reserva.propriedade)
      ? `Endereco: ${montarEnderecoCompleto(reserva.propriedade)}`
      : null,
    reserva.proprietario?.whatsapp ?? reserva.proprietario?.telefone ?? reserva.pagamento?.proprietarioWhatsapp ?? reserva.pagamento?.proprietarioTelefone
      ? `Contato: ${reserva.proprietario?.whatsapp ?? reserva.proprietario?.telefone ?? reserva.pagamento?.proprietarioWhatsapp ?? reserva.pagamento?.proprietarioTelefone}`
      : null
  ];

  return linhas.filter(Boolean).join("\n");
}

function obterStatusVoucher(reserva: ReservaHospedeDetalhe): VoucherStatus {
  if (reserva.status === "pending") return "pendente";
  if (reserva.status === "cancelled") return "cancelado";
  if (reserva.statusPagamento === "paid" || reserva.statusPagamento === "received") return "valido";
  return "provisorio";
}

function formatarFormaPagamento(reserva: ReservaHospedeDetalhe) {
  return reserva.formaPagamento ? LABEL_FORMA_PAGAMENTO[reserva.formaPagamento] : "Nao informada";
}

function formatarNoites(reserva: ReservaHospedeDetalhe) {
  const inicio = new Date(`${reserva.checkIn}T12:00:00`);
  const fim = new Date(`${reserva.checkOut}T12:00:00`);

  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) return null;

  const noites = Math.max(0, Math.round((fim.getTime() - inicio.getTime()) / 86_400_000));
  if (!noites) return null;

  return `${noites} ${noites === 1 ? "noite" : "noites"}`;
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
