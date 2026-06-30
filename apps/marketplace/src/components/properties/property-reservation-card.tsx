"use client";

import {
  Banknote,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock,
  Mail,
  Phone,
  Send,
  ShieldCheck,
  User,
  Users
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { GlassButton, GlassCard, GlassInput, StatusBadge, buttonVariants, cn } from "@hospedex/ui";
import type { ReservationPaymentMethod } from "@hospedex/types";

import {
  converterValorBrl,
  formatarDataCotacao,
  formatarMoeda
} from "../../lib/currency/format";
import type { CotacoesCambio } from "../../lib/currency/types";
import { solicitarReservaPublicaAction } from "../../lib/marketplace/actions";
import type { PropriedadePublica } from "../../lib/marketplace/data";
import { criarClienteSupabaseBrowser } from "../../lib/supabase/client";

export type ReservaFeedback = {
  codigo?: string | undefined;
  mensagem?: string | undefined;
  status: "erro" | "sucesso" | null;
};

export type PropertyReservationCardProps = {
  cotacoesCambio: CotacoesCambio;
  feedback: ReservaFeedback;
  property: PropriedadePublica;
};

type ResumoReserva = {
  diarias: number;
  hospedesExtras: number;
  quantidadeHospedesExtras: number;
  juros: number;
  noites: number;
  parcelaValor: number;
  subtotal: number;
  taxaLimpeza: number;
  total: number;
};

type DadosHospedeLogado = {
  email: string;
  nome: string;
  telefone: string;
};

const inputIconClass =
  "pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-white";
const selectIconClass =
  "pointer-events-none absolute right-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-white";
const reservationInputWithIconClass =
  "marketplace-reservation-control h-12 min-w-0 pl-10 pr-10 text-sm text-slate-50 placeholder:text-slate-400/80";
const reservationInputPlainClass =
  "marketplace-reservation-control h-12 min-w-0 px-3 text-sm text-slate-50 placeholder:text-slate-400/80";
const reservationSelectWithIconClass =
  "marketplace-reservation-control h-12 w-full min-w-0 appearance-none rounded-md pl-10 pr-10 text-sm text-slate-50 outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40";
const reservationSelectPlainClass =
  "marketplace-reservation-control h-12 w-full min-w-0 appearance-none rounded-md px-3 pr-10 text-sm text-slate-50 outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40";
const reservationTextareaClass =
  "marketplace-reservation-control min-h-24 w-full resize-y rounded-md px-3 py-3 text-sm leading-5 text-slate-50 placeholder:text-slate-400/80 outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40";
const LIMITE_PADRAO_HOSPEDES_EXTRAS = 10;

/**
 * Card publico de solicitacao da Casa.
 *
 * O formulario salva apenas a preferencia de pagamento. Dados sensiveis de
 * cartao ou banco nunca sao solicitados no Marketplace.
 */
export function PropertyReservationCard({
  cotacoesCambio,
  feedback,
  property
}: PropertyReservationCardProps) {
  if (feedback.status === "sucesso") {
    return <ReservationSuccess codigo={feedback.codigo} property={property} />;
  }

  const metodosPagamento = property.requestProfile.paymentMethods;
  const primeiroMetodo = metodosPagamento[0]?.method ?? "";
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [horarioPrevistoCheckIn, setHorarioPrevistoCheckIn] = useState(
    extrairHorarioPadrao(property.checkIn)
  );
  const [horarioPrevistoCheckOut, setHorarioPrevistoCheckOut] = useState(
    extrairHorarioPadrao(property.checkOut)
  );
  const [quantidadeHospedes, setQuantidadeHospedes] = useState(
    String(Math.max(1, Math.min(obterMaximoHospedesSelecionavel(property), 2)))
  );
  const [formaPagamento, setFormaPagamento] = useState<ReservationPaymentMethod | "">(
    primeiroMetodo
  );
  const parcelasDisponiveis = useMemo(
    () => obterParcelasDisponiveis(property),
    [property]
  );
  const parcelaPadrao = parcelasDisponiveis[0]?.parcela ?? 1;
  const [parcelas, setParcelas] = useState(parcelaPadrao);
  const [nomeHospede, setNomeHospede] = useState("");
  const [telefoneHospede, setTelefoneHospede] = useState("");
  const [emailHospede, setEmailHospede] = useState("");
  const [hospedeLogado, setHospedeLogado] = useState<DadosHospedeLogado | null>(
    null
  );
  const parcelaSelecionada =
    parcelasDisponiveis.find((parcela) => parcela.parcela === parcelas) ??
    parcelasDisponiveis[0] ??
    { jurosPercentual: 0, parcela: 1 };
  const resumo = useMemo(
    () =>
      calcularResumoReserva({
        checkIn,
        checkOut,
        formaPagamento,
        hospedes: obterQuantidadeHospedesParaResumo(
          quantidadeHospedes,
          obterMaximoHospedesSelecionavel(property)
        ),
        jurosPercentual: parcelaSelecionada.jurosPercentual,
        parcelas: parcelaSelecionada.parcela,
        property
      }),
    [
      checkIn,
      checkOut,
      formaPagamento,
      parcelaSelecionada.jurosPercentual,
      parcelaSelecionada.parcela,
      property,
      quantidadeHospedes
    ]
  );
  const podeSolicitarReserva = property.maxGuests > 0 && metodosPagamento.length > 0;

  useEffect(() => {
    const supabase = criarClienteSupabaseBrowser();
    if (!supabase) return;

    const clienteSupabase = supabase;
    let ativo = true;

    async function carregarHospedeLogado() {
      const { data: usuarioResultado } = await clienteSupabase.auth.getUser();
      const usuario = usuarioResultado.user;
      if (!usuario?.email || !ativo) return;

      const { data: perfil } = await clienteSupabase
        .from("profiles")
        .select("full_name,phone,email")
        .eq("id", usuario.id)
        .maybeSingle<{
          email: string | null;
          full_name: string | null;
          phone: string | null;
        }>();

      const dados = {
        email: usuario.email.trim().toLowerCase(),
        nome: perfil?.full_name ?? "",
        telefone: perfil?.phone ?? ""
      };

      if (ativo) {
        setHospedeLogado(dados);
        setEmailHospede(dados.email);
        setNomeHospede((valorAtual) => valorAtual || dados.nome);
        setTelefoneHospede((valorAtual) => valorAtual || dados.telefone);
      }
    }

    void carregarHospedeLogado();

    return () => {
      ativo = false;
    };
  }, []);

  return (
    <GlassCard className="p-5 shadow-2xl shadow-cyan-950/15">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Diaria inicial</p>
          <p className="mt-2 text-3xl font-semibold">{formatarPreco(property.minPrice)}</p>
          <ConversaoInternacional
            cotacoesCambio={cotacoesCambio}
            valorBrl={property.minPrice}
          />
        </div>
        <StatusBadge tone="info">Solicitacao</StatusBadge>
      </div>

      {feedback.status === "erro" ? (
        <div
          className="mt-5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          {feedback.mensagem ?? "Nao foi possivel enviar a solicitacao."}
        </div>
      ) : null}

      <form action={solicitarReservaPublicaAction} className="mt-6 grid gap-4">
        <input name="propertySlug" type="hidden" value={property.slug} />

        <ReservationFormFields
          checkIn={checkIn}
          checkOut={checkOut}
          cotacoesCambio={cotacoesCambio}
          formaPagamento={formaPagamento}
          metodosPagamento={metodosPagamento}
          emailHospede={emailHospede}
          emailHospedeBloqueado={Boolean(hospedeLogado?.email)}
          parcelas={parcelas}
          horarioPrevistoCheckIn={horarioPrevistoCheckIn}
          horarioPrevistoCheckOut={horarioPrevistoCheckOut}
          parcelasDisponiveis={parcelasDisponiveis}
          podeSolicitarReserva={podeSolicitarReserva}
          property={property}
          quantidadeHospedes={quantidadeHospedes}
          resumo={resumo}
          setCheckIn={setCheckIn}
          setCheckOut={setCheckOut}
          setEmailHospede={setEmailHospede}
          setFormaPagamento={(metodo) => {
            setFormaPagamento(metodo);
            setParcelas(metodo === "credit_card" ? parcelaPadrao : 1);
          }}
          setHorarioPrevistoCheckIn={setHorarioPrevistoCheckIn}
          setHorarioPrevistoCheckOut={setHorarioPrevistoCheckOut}
          nomeHospede={nomeHospede}
          setParcelas={setParcelas}
          setNomeHospede={setNomeHospede}
          setQuantidadeHospedes={setQuantidadeHospedes}
          setTelefoneHospede={setTelefoneHospede}
          telefoneHospede={telefoneHospede}
        />
      </form>
    </GlassCard>
  );
}

function ReservationFormFields({
  checkIn,
  checkOut,
  cotacoesCambio,
  emailHospede,
  emailHospedeBloqueado,
  formaPagamento,
  horarioPrevistoCheckIn,
  horarioPrevistoCheckOut,
  metodosPagamento,
  nomeHospede,
  parcelas,
  parcelasDisponiveis,
  podeSolicitarReserva,
  property,
  quantidadeHospedes,
  resumo,
  setCheckIn,
  setCheckOut,
  setEmailHospede,
  setFormaPagamento,
  setHorarioPrevistoCheckIn,
  setHorarioPrevistoCheckOut,
  setNomeHospede,
  setParcelas,
  setQuantidadeHospedes,
  setTelefoneHospede,
  telefoneHospede
}: {
  checkIn: string;
  checkOut: string;
  cotacoesCambio: CotacoesCambio;
  emailHospede: string;
  emailHospedeBloqueado: boolean;
  formaPagamento: ReservationPaymentMethod | "";
  horarioPrevistoCheckIn: string;
  horarioPrevistoCheckOut: string;
  metodosPagamento: PropriedadePublica["requestProfile"]["paymentMethods"];
  nomeHospede: string;
  parcelas: number;
  parcelasDisponiveis: Array<{ jurosPercentual: number; parcela: number }>;
  podeSolicitarReserva: boolean;
  property: PropriedadePublica;
  quantidadeHospedes: string;
  resumo: ResumoReserva;
  setCheckIn: (valor: string) => void;
  setCheckOut: (valor: string) => void;
  setEmailHospede: (valor: string) => void;
  setFormaPagamento: (valor: ReservationPaymentMethod | "") => void;
  setHorarioPrevistoCheckIn: (valor: string) => void;
  setHorarioPrevistoCheckOut: (valor: string) => void;
  setNomeHospede: (valor: string) => void;
  setParcelas: (valor: number) => void;
  setQuantidadeHospedes: (valor: string) => void;
  setTelefoneHospede: (valor: string) => void;
  telefoneHospede: string;
}) {
  const { pending } = useFormStatus();
  const bloqueado = pending || !podeSolicitarReserva;

  return (
    <fieldset className="grid gap-4" disabled={pending}>
      {!podeSolicitarReserva ? (
        <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-200">
          O proprietario ainda nao configurou as formas de pagamento desta casa.
        </div>
      ) : null}

      <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Field label="Check-in">
          <CalendarDays className={inputIconClass} />
          <GlassInput
            className={reservationInputWithIconClass}
            disabled={bloqueado}
            name="checkIn"
            onChange={(evento) => setCheckIn(evento.target.value)}
            required
            type="date"
            value={checkIn}
          />
        </Field>
        <Field label="Check-out">
          <CalendarDays className={inputIconClass} />
          <GlassInput
            className={reservationInputWithIconClass}
            disabled={bloqueado}
            name="checkOut"
            onChange={(evento) => setCheckOut(evento.target.value)}
            required
            type="date"
            value={checkOut}
          />
        </Field>
      </div>

      <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Field label="Horario previsto de chegada">
          <Clock className={inputIconClass} />
          <GlassInput
            className={reservationInputWithIconClass}
            disabled={bloqueado}
            name="horarioPrevistoCheckIn"
            onChange={(evento) => setHorarioPrevistoCheckIn(evento.target.value)}
            type="time"
            value={horarioPrevistoCheckIn}
          />
          <span className="mt-1 block text-[11px] font-medium normal-case leading-4 text-cyan-100/75">
            Padrao da casa: {property.checkIn}.
          </span>
        </Field>
        <Field label="Horario previsto de saida">
          <Clock className={inputIconClass} />
          <GlassInput
            className={reservationInputWithIconClass}
            disabled={bloqueado}
            name="horarioPrevistoCheckOut"
            onChange={(evento) => setHorarioPrevistoCheckOut(evento.target.value)}
            type="time"
            value={horarioPrevistoCheckOut}
          />
          <span className="mt-1 block text-[11px] font-medium normal-case leading-4 text-cyan-100/75">
            Padrao da casa: {property.checkOut}.
          </span>
        </Field>
      </div>

      <Field label="Hospedes">
        <Users className={inputIconClass} />
        <GlassInput
          className={reservationInputWithIconClass}
          disabled={bloqueado}
          inputMode="numeric"
          max={obterMaximoHospedesSelecionavel(property)}
          min={1}
          name="quantidadeHospedes"
          onBlur={() =>
            setQuantidadeHospedes(
              normalizarQuantidadeHospedesInput(
                quantidadeHospedes,
                obterMaximoHospedesSelecionavel(property)
              )
            )
          }
          onChange={(evento) => setQuantidadeHospedes(evento.target.value.replace(/\D/g, ""))}
          required
          type="number"
          value={quantidadeHospedes}
        />
        <span className="mt-1 block text-[11px] font-medium normal-case leading-4 text-cyan-100/75">
          {obterTextoLimiteHospedes(property)}
        </span>
      </Field>

      <Field label="Nome do hospede">
        <User className={inputIconClass} />
        <GlassInput
          className={reservationInputWithIconClass}
          disabled={bloqueado}
          name="hospedeNome"
          onChange={(evento) => setNomeHospede(evento.target.value)}
          required
          value={nomeHospede}
        />
      </Field>

      <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Field label="Telefone">
          <Phone className={inputIconClass} />
          <GlassInput
            className={reservationInputWithIconClass}
            disabled={bloqueado}
            name="hospedeTelefone"
            onChange={(evento) => setTelefoneHospede(evento.target.value)}
            required
            value={telefoneHospede}
          />
        </Field>
        <Field label="E-mail">
          <Mail className={inputIconClass} />
          <GlassInput
            className={cn(
              reservationInputWithIconClass,
              emailHospedeBloqueado && "cursor-not-allowed border-cyan-300/35 bg-cyan-400/10"
            )}
            disabled={bloqueado}
            name="hospedeEmail"
            onChange={(evento) => setEmailHospede(evento.target.value)}
            readOnly={emailHospedeBloqueado}
            required
            type="email"
            value={emailHospede}
          />
          {emailHospedeBloqueado ? (
            <span className="mt-1 block text-[11px] font-medium normal-case leading-4 text-cyan-100/75">
              Este e-mail esta vinculado a sua conta.
            </span>
          ) : null}
        </Field>
      </div>

      <Field label="CPF opcional">
        <GlassInput
          className={reservationInputPlainClass}
          disabled={bloqueado}
          name="hospedeDocumento"
        />
      </Field>

      <Field label="Forma de pagamento">
        <Banknote className={inputIconClass} />
        <select
          className={reservationSelectWithIconClass}
          disabled={bloqueado}
          name="formaPagamento"
          onChange={(evento) =>
            setFormaPagamento(evento.target.value as ReservationPaymentMethod)
          }
          required
          value={formaPagamento}
        >
          {metodosPagamento.length ? null : (
            <option value="">Sem forma configurada</option>
          )}
          {metodosPagamento.map((metodo) => (
            <option key={metodo.method} value={metodo.method}>
              {metodo.label}
            </option>
          ))}
        </select>
        <ChevronDown className={selectIconClass} />
      </Field>

      {formaPagamento === "credit_card" ? (
        <Field label="Parcelas">
          <select
            className={reservationSelectPlainClass}
            disabled={bloqueado}
            onChange={(evento) => setParcelas(Number.parseInt(evento.target.value, 10))}
            value={parcelas}
          >
            {parcelasDisponiveis.map((parcela) => (
              <option key={parcela.parcela} value={parcela.parcela}>
                {parcela.parcela}x
                {parcela.jurosPercentual > 0
                  ? ` com ${parcela.jurosPercentual}% de juros`
                  : " sem juros"}
              </option>
            ))}
          </select>
          <ChevronDown className={selectIconClass} />
        </Field>
      ) : null}

      <label className="grid gap-2 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
        Observacoes
        <textarea
          className={reservationTextareaClass}
          disabled={bloqueado}
          name="observacoes"
          placeholder="Conte o motivo da viagem, horario previsto de chegada ou pedidos importantes."
        />
      </label>

      <ResumoValores
        cotacoesCambio={cotacoesCambio}
        formaPagamento={formaPagamento}
        property={property}
        resumo={resumo}
      />
      <PerfilConfianca property={property} />

      <GlassButton
        className="w-full border-cyan-300/50 bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-500/20 hover:bg-cyan-200 disabled:border-cyan-900/50 disabled:bg-cyan-950/50 disabled:text-cyan-100/60"
        disabled={bloqueado}
        size="lg"
        type="submit"
      >
        <Send className="h-4 w-4 text-white" />
        {pending ? "Enviando..." : "Solicitar reserva"}
      </GlassButton>
      <p className="text-center text-xs leading-5 text-muted-foreground">
        A forma de pagamento e apenas uma preferencia. Nao pedimos numero de
        cartao, CVV, validade ou dados bancarios sensiveis.
      </p>
    </fieldset>
  );
}

function ResumoValores({
  cotacoesCambio,
  formaPagamento,
  property,
  resumo
}: {
  cotacoesCambio: CotacoesCambio;
  formaPagamento: ReservationPaymentMethod | "";
  property: PropriedadePublica;
  resumo: ResumoReserva;
}) {
  return (
    <div className="grid gap-3 rounded-lg border bg-background/70 p-4 text-sm">
      <ResumoLinha label={`${resumo.noites || 0} diaria(s)`} valor={resumo.diarias} />
      {resumo.taxaLimpeza ? (
        <ResumoLinha label="Taxa de limpeza" valor={resumo.taxaLimpeza} />
      ) : null}
      {resumo.hospedesExtras > 0 ? (
        <ResumoLinha
          label={`${resumo.quantidadeHospedesExtras} ${
            resumo.quantidadeHospedesExtras === 1 ? "hospede extra" : "hospedes extras"
          }`}
          valor={resumo.hospedesExtras}
        />
      ) : null}
      {resumo.juros ? <ResumoLinha label="Juros do cartao" valor={resumo.juros} /> : null}
      {property.pricing.caucao ? (
        <ResumoLinha label="Caucao informativa" valor={property.pricing.caucao} />
      ) : null}
      <span className="flex items-center justify-between gap-3 border-t pt-3 text-muted-foreground">
        <strong className="text-foreground">Total estimado</strong>
        <strong className="text-lg text-foreground">{formatarPreco(resumo.total || null)}</strong>
      </span>
      {formaPagamento === "credit_card" && resumo.parcelaValor > 0 && resumo.noites > 0 ? (
        <span className="text-xs text-muted-foreground">
          Cartao em {Math.max(1, Math.round(resumo.total / resumo.parcelaValor))}x de{" "}
          {formatarPreco(resumo.parcelaValor)}.
        </span>
      ) : null}
      <ConversaoTotal cotacoesCambio={cotacoesCambio} totalBrl={resumo.total} />
      <span className="flex items-center justify-between gap-3 text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <Clock className="h-4 w-4 text-white" />
          Horarios
        </span>
        <strong className="text-right text-foreground">
          {property.checkIn} / {property.checkOut}
        </strong>
      </span>
    </div>
  );
}

function ConversaoInternacional({
  cotacoesCambio,
  valorBrl
}: {
  cotacoesCambio: CotacoesCambio;
  valorBrl: number | null;
}) {
  if (!valorBrl) return null;

  if (!cotacoesCambio.disponivel) {
    return (
      <p className="mt-3 rounded-md border border-dashed bg-background/60 px-3 py-2 text-xs text-muted-foreground">
        {cotacoesCambio.mensagem}
      </p>
    );
  }

  const usd = converterValorBrl(valorBrl, cotacoesCambio, "USD");
  const eur = converterValorBrl(valorBrl, cotacoesCambio, "EUR");
  const dataCotacao = formatarDataCotacao(cotacoesCambio.cotadoEm);

  if (!usd || !eur) return null;

  return (
    <div className="mt-3 grid gap-1 text-xs leading-5 text-muted-foreground">
      <span>Aprox. {formatarMoeda(usd, "USD")}</span>
      <span>Aprox. {formatarMoeda(eur, "EUR")}</span>
      <span>
        Valores em dolar e euro sao aproximados
        {dataCotacao ? `, cotacao de ${dataCotacao}` : ""}.
      </span>
    </div>
  );
}

function ConversaoTotal({
  cotacoesCambio,
  totalBrl
}: {
  cotacoesCambio: CotacoesCambio;
  totalBrl: number;
}) {
  if (!totalBrl || !cotacoesCambio.disponivel) return null;

  const usd = converterValorBrl(totalBrl, cotacoesCambio, "USD");
  const eur = converterValorBrl(totalBrl, cotacoesCambio, "EUR");
  if (!usd || !eur) return null;

  return (
    <div className="rounded-md border border-dashed bg-background/60 px-3 py-2 text-xs text-muted-foreground">
      <p className="font-semibold text-foreground">Total aproximado internacional</p>
      <p className="mt-1">Aprox. {formatarMoeda(usd, "USD")}</p>
      <p>Aprox. {formatarMoeda(eur, "EUR")}</p>
      <p className="mt-2 leading-5">
        Conversao apenas informativa. O valor oficial da reserva permanece em BRL.
      </p>
    </div>
  );
}

function PerfilConfianca({ property }: { property: PropriedadePublica }) {
  const perfil = property.requestProfile;
  const iniciais = obterIniciais(perfil.ownerName || perfil.businessName);

  return (
    <div className="rounded-lg border bg-background/70 p-4">
      <div className="flex items-center gap-3">
        {perfil.avatarUrl ? (
          <img
            alt={`Foto de ${perfil.ownerName}`}
            className="h-11 w-11 rounded-full object-cover"
            src={perfil.avatarUrl}
          />
        ) : (
          <span className="grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {iniciais}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{perfil.ownerName}</p>
          <p className="truncate text-xs text-muted-foreground">{perfil.businessName}</p>
        </div>
      </div>
      <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-primary">
        <ShieldCheck className="h-4 w-4 text-withe" />
        Proprietario verificado
      </p>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        Comunique-se pelos contatos oficiais desta pagina e confira os dados da
        reserva antes de realizar qualquer pagamento.
      </p>
    </div>
  );
}

function ResumoLinha({ label, valor }: { label: string; valor: number }) {
  return (
    <span className="flex items-center justify-between gap-3 text-muted-foreground">
      <span>{label}</span>
      <strong className="text-foreground">{formatarPreco(valor)}</strong>
    </span>
  );
}

function ReservationSuccess({
  codigo,
  property
}: {
  codigo?: string | undefined;
  property: PropriedadePublica;
}) {
  return (
    <GlassCard
      aria-live="polite"
      className="p-6 text-center shadow-2xl shadow-cyan-950/15"
      role="status"
    >
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
        <CheckCircle2 className="h-6 w-6 text-white" />
      </span>
      <h2 className="mt-5 text-xl font-semibold text-whie">Solicitacao enviada com sucesso.</h2>
      <p className="mt-3 text-sm leading-6 text-muted-foreground text-white">
        O proprietario ira analisar sua reserva.
      </p>
      {codigo ? (
        <p className="mt-4 rounded-lg border bg-background/70 px-3 py-2 text-sm font-semibold">
          Codigo {codigo}
        </p>
      ) : null}
      <Link className={cn(buttonVariants({ size: "lg" }), "mt-6 w-full")} href={`/propriedades/${property.slug}`}>
        Voltar a propriedade
      </Link>
    </GlassCard>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="grid min-w-0 gap-2 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
      {label}
      <span className="relative min-w-0">{children}</span>
    </label>
  );
}

function calcularResumoReserva({
  checkIn,
  checkOut,
  formaPagamento,
  hospedes,
  jurosPercentual,
  parcelas,
  property
}: {
  checkIn: string;
  checkOut: string;
  formaPagamento: ReservationPaymentMethod | "";
  hospedes: number;
  jurosPercentual: number;
  parcelas: number;
  property: PropriedadePublica;
}): ResumoReserva {
  const noites = calcularNoites(checkIn, checkOut);
  const diarias = noites * property.pricing.dailyRate;
  const taxaLimpeza = noites > 0 ? property.pricing.cleaningFee : 0;
  const capacidadeSemCobrancaExtra = obterCapacidadeCadastrada(property);
  const quantidadeHospedesExtras =
    noites > 0 && permiteHospedesExtras(property)
      ? Math.max(0, hospedes - capacidadeSemCobrancaExtra)
      : 0;
  // Regra oficial: a capacidade cadastrada da casa e a quantidade inclusa.
  // Hospedes acima dessa capacidade pagam o adicional uma vez por reserva.
  const hospedesExtras = quantidadeHospedesExtras * property.pricing.valorHospedeExtra;
  const subtotal = diarias + taxaLimpeza + hospedesExtras;
  const juros =
    formaPagamento === "credit_card" && jurosPercentual > 0
      ? subtotal * (jurosPercentual / 100)
      : 0;
  const total = subtotal + juros;
  const quantidadeParcelas =
    formaPagamento === "credit_card" ? Math.max(parcelas, 1) : 1;

  return {
    diarias,
    hospedesExtras,
    quantidadeHospedesExtras,
    juros,
    noites,
    parcelaValor: quantidadeParcelas > 0 ? total / quantidadeParcelas : total,
    subtotal,
    taxaLimpeza,
    total
  };
}

function obterCapacidadeCadastrada(property: PropriedadePublica) {
  return Math.max(property.maxGuests || 1, 1);
}

function obterMaximoHospedesSelecionavel(property: PropriedadePublica) {
  const capacidadeCadastrada = obterCapacidadeCadastrada(property);
  if (permiteHospedesExtras(property)) {
    // Enquanto nao existir campo proprio de limite de extras, a interface
    // libera uma margem operacional clara sem alterar a capacidade cadastrada.
    return capacidadeCadastrada + LIMITE_PADRAO_HOSPEDES_EXTRAS;
  }

  return capacidadeCadastrada;
}

function permiteHospedesExtras(property: PropriedadePublica) {
  return property.pricing.cobraHospedeExtra && property.pricing.valorHospedeExtra > 0;
}

function obterTextoLimiteHospedes(property: PropriedadePublica) {
  const capacidade = obterCapacidadeCadastrada(property);
  const maximo = obterMaximoHospedesSelecionavel(property);

  if (permiteHospedesExtras(property)) {
    return `${capacidade} hospede${capacidade === 1 ? "" : "s"} incluso${capacidade === 1 ? "" : "s"} sem extra. Ate ${maximo} com adicional.`;
  }

  return `Esta casa permite ate ${capacidade} hospede${capacidade === 1 ? "" : "s"}.`;
}

function obterQuantidadeHospedesParaResumo(valor: string, capacidadeMaxima: number) {
  const numero = Number.parseInt(valor, 10);
  if (!Number.isFinite(numero)) return 1;

  return Math.max(1, Math.min(numero, Math.max(capacidadeMaxima || 1, 1)));
}

function normalizarQuantidadeHospedesInput(valor: string, capacidadeMaxima: number) {
  return String(obterQuantidadeHospedesParaResumo(valor, capacidadeMaxima));
}

function obterParcelasDisponiveis(property: PropriedadePublica) {
  const limite = Math.max(1, property.pricing.maxParcelasCartao || 1);
  const configuradas = property.pricing.jurosParcelasCartao
    .filter((item) => item.parcela >= 1 && item.parcela <= limite)
    .sort((a, b) => a.parcela - b.parcela);
  const porParcela = new Map<number, { jurosPercentual: number; parcela: number }>();

  porParcela.set(1, { jurosPercentual: 0, parcela: 1 });
  for (const parcela of configuradas) {
    porParcela.set(parcela.parcela, parcela);
  }

  return [...porParcela.values()].sort((a, b) => a.parcela - b.parcela);
}

function calcularNoites(checkIn: string, checkOut: string) {
  const inicio = parseDataInput(checkIn);
  const fim = parseDataInput(checkOut);
  if (!inicio || !fim || fim <= inicio) return 0;

  return Math.round((fim.getTime() - inicio.getTime()) / 86_400_000);
}

function parseDataInput(valor: string) {
  const partes = valor.split("-").map(Number);
  if (partes.length !== 3 || partes.some((parte) => !Number.isFinite(parte))) {
    return null;
  }

  return new Date(Date.UTC(partes[0]!, partes[1]! - 1, partes[2]!));
}

function extrairHorarioPadrao(valor: string | null | undefined) {
  if (!valor) return "";
  return valor.match(/\b\d{2}:\d{2}\b/)?.[0] ?? "";
}

function obterIniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).slice(0, 2);
  return partes.map((parte) => parte[0]?.toUpperCase()).join("") || "HX";
}

function formatarPreco(valor: number | null) {
  if (!valor) return "Sob consulta";

  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    maximumFractionDigits: 0,
    style: "currency"
  }).format(valor);
}
