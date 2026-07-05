import { CalendarDays, Home, MapPin, User, WalletCards } from "lucide-react";

import {
  formatarDataHoraHospede,
  formatarDataHospede,
  formatarMoedaHospede,
  LABEL_FORMA_PAGAMENTO,
  LABEL_STATUS_PAGAMENTO,
  LABEL_STATUS_RESERVA
} from "../../lib/guest/format";
import type { ReservaHospedeDetalhe } from "../../lib/guest/types";

type VoucherStatus = "cancelado" | "pendente" | "provisorio" | "valido";

/**
 * Documento imprimivel do voucher.
 *
 * Esta camada nao altera reserva, pagamento ou financeiro. Ela somente monta
 * um documento limpo com os dados que a rota protegida do hospede ja carregou.
 */
export function ReservationVoucherDocument({ reserva }: { reserva: ReservaHospedeDetalhe }) {
  const statusVoucher = obterStatusVoucher(reserva);

  return (
    <article
      className="voucher-page mx-auto w-full max-w-[794px] overflow-hidden rounded-2xl bg-white text-slate-950 shadow-2xl ring-1 ring-slate-200"
    >
      <div className="voucher-header border-b border-slate-200 bg-slate-950 px-5 py-5 text-white sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-300">
              Hospedex
            </p>
            <h2 className="mt-2 text-2xl font-bold uppercase tracking-tight">Voucher de hospedagem</h2>
            <p className="mt-2 text-sm text-slate-300">
              Comprovante da reserva realizada pelo Hospedex
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Emitido em {formatarDataHoraHospede(new Date().toISOString())}
            </p>
          </div>
          <VoucherBadge status={statusVoucher} />
        </div>
        <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
          <VoucherInfo label="Reserva" value={reserva.codigo} />
          <VoucherInfo label="Status da reserva" value={LABEL_STATUS_RESERVA[reserva.status]} />
          <VoucherInfo label="Status do pagamento" value={LABEL_STATUS_PAGAMENTO[reserva.statusPagamento]} />
        </div>
      </div>

      {statusVoucher === "provisorio" ? (
        <VoucherNotice>Este voucher so tera validade completa apos a confirmacao do pagamento.</VoucherNotice>
      ) : null}
      {statusVoucher === "cancelado" ? (
        <VoucherNotice tone="danger">
          Reserva cancelada. Este voucher nao possui validade para hospedagem.
        </VoucherNotice>
      ) : null}

      <div className="voucher-content grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
        <VoucherSection icon={Home} title="Reserva">
          <VoucherLine label="Hospedagem" value={reserva.propriedade?.nome} />
          <VoucherLine
            label="Cidade/estado"
            value={[reserva.propriedade?.cidade, reserva.propriedade?.estado].filter(Boolean).join("/")}
          />
          <VoucherLine
            label="Anfitriao"
            value={reserva.proprietario?.nome ?? reserva.proprietario?.empreendimento ?? reserva.pagamento?.proprietarioNome}
          />
        </VoucherSection>

        <VoucherSection icon={User} title="Hospede">
          <VoucherLine label="Nome" value={reserva.hospede?.nome} />
          <VoucherLine label="Telefone/WhatsApp" value={reserva.hospede?.telefone} />
          <VoucherLine label="E-mail" value={reserva.hospede?.email} />
        </VoucherSection>

        <VoucherSection icon={CalendarDays} title="Periodo">
          <VoucherLine label="Check-in" value={formatarDataComHorario(reserva.checkIn, reserva.horarioPrevistoCheckIn)} />
          <VoucherLine label="Check-out" value={formatarDataComHorario(reserva.checkOut, reserva.horarioPrevistoCheckOut)} />
          <VoucherLine label="Noites" value={formatarNoites(reserva)} />
          <VoucherLine label="Hospedes" value={`${reserva.hospedesQuantidade}`} />
        </VoucherSection>

        <VoucherSection icon={WalletCards} title="Pagamento">
          <VoucherLine label="Forma de pagamento" value={formatarFormaPagamento(reserva)} />
          <VoucherLine label="Status" value={LABEL_STATUS_PAGAMENTO[reserva.statusPagamento]} />
          <VoucherLine label="Valor total" value={formatarMoedaHospede(reserva.financeiro.valorTotal)} />
          <VoucherLine label="Valor pago" value={formatarMoedaHospede(reserva.financeiro.valorPago)} />
          <VoucherLine label="Valor pendente" value={formatarMoedaHospede(reserva.financeiro.valorPendente)} />
        </VoucherSection>

        <VoucherSection icon={MapPin} title="Endereco e contato">
          <VoucherLine label="Endereco" value={montarEnderecoCompleto(reserva.propriedade)} />
          <VoucherLine
            label="Contato do anfitriao"
            value={
              reserva.proprietario?.whatsapp ??
              reserva.proprietario?.telefone ??
              reserva.pagamento?.proprietarioWhatsapp ??
              reserva.pagamento?.proprietarioTelefone
            }
          />
        </VoucherSection>

        <VoucherSection icon={Home} title="Observacao curta">
          <p className="voucher-observation text-sm font-medium leading-5 text-slate-800">
            {obterObservacaoCurta(reserva.observacoes)}
          </p>
        </VoucherSection>

        <footer className="voucher-footer rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-600">
          <p>Documento emitido pelo Hospedex para conferencia da reserva.</p>
        </footer>
      </div>
    </article>
  );
}

export function montarTextoVoucher(reserva: ReservaHospedeDetalhe) {
  const linhas = [
    "Reserva Hospedex",
    `Codigo: ${reserva.codigo}`,
    reserva.propriedade?.nome ? `Hospedagem: ${reserva.propriedade.nome}` : null,
    reserva.hospede?.nome ? `Hospede: ${reserva.hospede.nome}` : null,
    `Check-in: ${formatarDataComHorario(reserva.checkIn, reserva.horarioPrevistoCheckIn)}`,
    `Check-out: ${formatarDataComHorario(reserva.checkOut, reserva.horarioPrevistoCheckOut)}`,
    `Hospedes: ${reserva.hospedesQuantidade}`,
    `Valor total: ${formatarMoedaHospede(reserva.financeiro.valorTotal)}`,
    `Valor pago: ${formatarMoedaHospede(reserva.financeiro.valorPago)}`,
    `Valor pendente: ${formatarMoedaHospede(reserva.financeiro.valorPendente)}`,
    `Pagamento: ${LABEL_STATUS_PAGAMENTO[reserva.statusPagamento]}`,
    `Status da reserva: ${LABEL_STATUS_RESERVA[reserva.status]}`
  ];

  return linhas.filter(Boolean).join("\n");
}

function VoucherBadge({ status }: { status: VoucherStatus }) {
  const estilos = {
    cancelado: "bg-red-100 text-red-800 ring-red-200",
    pendente: "bg-amber-100 text-amber-800 ring-amber-200",
    provisorio: "bg-sky-100 text-sky-800 ring-sky-200",
    valido: "bg-emerald-100 text-emerald-800 ring-emerald-200"
  } as const;
  const labels = {
    cancelado: "Cancelada",
    pendente: "Pendente",
    provisorio: "Aguardando pagamento",
    valido: "Pagamento recebido"
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

  return <p className={`voucher-notice border-b px-5 py-3 text-sm font-medium sm:px-6 ${classe}`}>{children}</p>;
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
    <section className="voucher-section break-inside-avoid rounded-xl border border-slate-200 bg-slate-50/80 p-4">
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
    <div className="grid gap-1 text-sm sm:grid-cols-[160px_1fr]">
      <span className="font-medium text-slate-500">{label}</span>
      <strong className="font-semibold text-slate-900">{value}</strong>
    </div>
  );
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

function formatarDataComHorario(data: string, horario: string | null) {
  const horarioFormatado = formatarHorarioPrevisto(horario);
  return horarioFormatado ? `${formatarDataHospede(data)} as ${horarioFormatado}` : formatarDataHospede(data);
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

function obterObservacaoCurta(observacoes: string | null) {
  const texto = observacoes?.trim();
  if (!texto) return "Sem observacoes adicionais.";

  // O voucher impresso deve ser um comprovante compacto; textos longos continuam na pagina da reserva.
  return texto.length > 180 ? `${texto.slice(0, 177).trim()}...` : texto;
}
