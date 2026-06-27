"use client";

import {
  Banknote,
  CalendarDays,
  CheckCircle2,
  Clock,
  Mail,
  Phone,
  ShieldCheck,
  User,
  Users
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { GlassButton, GlassCard, GlassInput, StatusBadge, buttonVariants, cn } from "@hospedex/ui";
import type { ReservationPaymentMethod } from "@hospedex/types";

import { solicitarReservaPublicaAction } from "../../lib/marketplace/actions";
import type { PropriedadePublica } from "../../lib/marketplace/data";

export type ReservaFeedback = {
  codigo?: string | undefined;
  mensagem?: string | undefined;
  status: "erro" | "sucesso" | null;
};

export type PropertyReservationCardProps = {
  feedback: ReservaFeedback;
  property: PropriedadePublica;
};

type ResumoReserva = {
  diarias: number;
  hospedesExtras: number;
  juros: number;
  noites: number;
  parcelaValor: number;
  subtotal: number;
  taxaLimpeza: number;
  total: number;
};

/**
 * Card publico de solicitacao da Casa.
 *
 * O formulario salva apenas a preferencia de pagamento. Dados sensiveis de
 * cartao ou banco nunca sao solicitados no Marketplace.
 */
export function PropertyReservationCard({ feedback, property }: PropertyReservationCardProps) {
  if (feedback.status === "sucesso") {
    return <ReservationSuccess codigo={feedback.codigo} property={property} />;
  }

  const metodosPagamento = property.requestProfile.paymentMethods;
  const primeiroMetodo = metodosPagamento[0]?.method ?? "";
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [quantidadeHospedes, setQuantidadeHospedes] = useState(
    Math.max(1, Math.min(property.maxGuests || 1, 2))
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
        hospedes: quantidadeHospedes,
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

  return (
    <GlassCard className="p-5 shadow-2xl shadow-cyan-950/15">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Diaria inicial</p>
          <p className="mt-2 text-3xl font-semibold">{formatarPreco(property.minPrice)}</p>
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
          formaPagamento={formaPagamento}
          metodosPagamento={metodosPagamento}
          parcelas={parcelas}
          parcelasDisponiveis={parcelasDisponiveis}
          podeSolicitarReserva={podeSolicitarReserva}
          property={property}
          quantidadeHospedes={quantidadeHospedes}
          resumo={resumo}
          setCheckIn={setCheckIn}
          setCheckOut={setCheckOut}
          setFormaPagamento={(metodo) => {
            setFormaPagamento(metodo);
            setParcelas(metodo === "credit_card" ? parcelaPadrao : 1);
          }}
          setParcelas={setParcelas}
          setQuantidadeHospedes={setQuantidadeHospedes}
        />
      </form>
    </GlassCard>
  );
}

function ReservationFormFields({
  checkIn,
  checkOut,
  formaPagamento,
  metodosPagamento,
  parcelas,
  parcelasDisponiveis,
  podeSolicitarReserva,
  property,
  quantidadeHospedes,
  resumo,
  setCheckIn,
  setCheckOut,
  setFormaPagamento,
  setParcelas,
  setQuantidadeHospedes
}: {
  checkIn: string;
  checkOut: string;
  formaPagamento: ReservationPaymentMethod | "";
  metodosPagamento: PropriedadePublica["requestProfile"]["paymentMethods"];
  parcelas: number;
  parcelasDisponiveis: Array<{ jurosPercentual: number; parcela: number }>;
  podeSolicitarReserva: boolean;
  property: PropriedadePublica;
  quantidadeHospedes: number;
  resumo: ResumoReserva;
  setCheckIn: (valor: string) => void;
  setCheckOut: (valor: string) => void;
  setFormaPagamento: (valor: ReservationPaymentMethod | "") => void;
  setParcelas: (valor: number) => void;
  setQuantidadeHospedes: (valor: number) => void;
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

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Check-in">
          <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <GlassInput
            className="h-11 pl-10"
            disabled={bloqueado}
            name="checkIn"
            onChange={(evento) => setCheckIn(evento.target.value)}
            required
            type="date"
            value={checkIn}
          />
        </Field>
        <Field label="Check-out">
          <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <GlassInput
            className="h-11 pl-10"
            disabled={bloqueado}
            name="checkOut"
            onChange={(evento) => setCheckOut(evento.target.value)}
            required
            type="date"
            value={checkOut}
          />
        </Field>
      </div>

      <Field label="Hospedes">
        <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <GlassInput
          className="h-11 pl-10"
          disabled={bloqueado}
          max={property.maxGuests}
          min={1}
          name="quantidadeHospedes"
          onChange={(evento) =>
            setQuantidadeHospedes(Math.max(1, Number.parseInt(evento.target.value, 10) || 1))
          }
          required
          type="number"
          value={quantidadeHospedes}
        />
      </Field>

      <Field label="Nome do hospede">
        <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <GlassInput className="h-11 pl-10" disabled={bloqueado} name="hospedeNome" required />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Telefone">
          <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <GlassInput
            className="h-11 pl-10"
            disabled={bloqueado}
            name="hospedeTelefone"
            required
          />
        </Field>
        <Field label="E-mail">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <GlassInput
            className="h-11 pl-10"
            disabled={bloqueado}
            name="hospedeEmail"
            required
            type="email"
          />
        </Field>
      </div>

      <Field label="CPF opcional">
        <GlassInput className="h-11" disabled={bloqueado} name="hospedeDocumento" />
      </Field>

      <Field label="Forma de pagamento">
        <Banknote className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <select
          className="glass-input h-11 w-full rounded-md pl-10 pr-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
      </Field>

      {formaPagamento === "credit_card" ? (
        <Field label="Parcelas">
          <select
            className="glass-input h-11 w-full rounded-md px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
        </Field>
      ) : null}

      <label className="grid gap-2 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
        Observacoes
        <textarea
          className="glass-input min-h-24 w-full resize-y rounded-md px-3 py-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          disabled={bloqueado}
          name="observacoes"
          placeholder="Conte o motivo da viagem, horario previsto de chegada ou pedidos importantes."
        />
      </label>

      <ResumoValores
        formaPagamento={formaPagamento}
        property={property}
        resumo={resumo}
      />
      <PerfilConfianca property={property} />

      <GlassButton className="w-full" disabled={bloqueado} size="lg" type="submit">
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
  formaPagamento,
  property,
  resumo
}: {
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
      {resumo.hospedesExtras ? (
        <ResumoLinha label="Hospedes extras" valor={resumo.hospedesExtras} />
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
      <span className="rounded-md border border-dashed bg-background/60 px-3 py-2 text-xs text-muted-foreground">
        Conversao internacional indisponivel no momento.
      </span>
      <span className="flex items-center justify-between gap-3 text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Horarios
        </span>
        <strong className="text-right text-foreground">
          {property.checkIn} / {property.checkOut}
        </strong>
      </span>
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
        <ShieldCheck className="h-4 w-4" />
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
        <CheckCircle2 className="h-6 w-6" />
      </span>
      <h2 className="mt-5 text-xl font-semibold">Solicitacao enviada com sucesso.</h2>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
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
    <label className="grid gap-2 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
      {label}
      <span className="relative">{children}</span>
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
  const hospedesExtras =
    noites > 0 && property.pricing.cobraHospedeExtra
      ? Math.max(0, hospedes - property.pricing.hospedesInclusos) *
        property.pricing.valorHospedeExtra *
        noites
      : 0;
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
    juros,
    noites,
    parcelaValor: quantidadeParcelas > 0 ? total / quantidadeParcelas : total,
    subtotal,
    taxaLimpeza,
    total
  };
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
