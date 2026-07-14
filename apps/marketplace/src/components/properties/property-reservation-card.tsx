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
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  GlassButton,
  GlassCard,
  GlassInput,
  StatusBadge,
  buttonVariants,
  cn,
} from "@hospedex/ui";
import type { ReservationPaymentMethod } from "@hospedex/types";

import {
  MarketplaceIconField,
  MarketplacePlainField,
  marketplaceInputPlainClass,
  marketplaceInputWithIconClass,
  marketplaceSelectPlainClass,
  marketplaceSelectWithIconClass,
  marketplaceTextareaClass,
} from "../forms/marketplace-icon-field";
import {
  converterValorBrl,
  formatarDataCotacao,
  formatarMoeda,
} from "../../lib/currency/format";
import type { CotacoesCambio } from "../../lib/currency/types";
import { formatarDiarias, formatarQuantidade } from "../../lib/format";
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

const selectIconClass =
  "pointer-events-none absolute right-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground";
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
  property,
}: PropertyReservationCardProps) {
  if (feedback.status === "sucesso") {
    return <ReservationSuccess codigo={feedback.codigo} property={property} />;
  }

  const metodosPagamento = property.requestProfile.paymentMethods;
  const primeiroMetodo = metodosPagamento[0]?.method ?? "";
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [horarioPrevistoCheckIn, setHorarioPrevistoCheckIn] = useState(
    extrairHorarioPadrao(property.checkIn),
  );
  const [horarioPrevistoCheckOut, setHorarioPrevistoCheckOut] = useState(
    extrairHorarioPadrao(property.checkOut),
  );
  const [quantidadeHospedes, setQuantidadeHospedes] = useState(
    String(Math.max(1, Math.min(obterMaximoHospedesSelecionavel(property), 2))),
  );
  const [formaPagamento, setFormaPagamento] = useState<
    ReservationPaymentMethod | ""
  >(primeiroMetodo);
  const parcelasDisponiveis = useMemo(
    () => obterParcelasDisponiveis(property),
    [property],
  );
  const parcelaPadrao = parcelasDisponiveis[0]?.parcela ?? 1;
  const [parcelas, setParcelas] = useState(parcelaPadrao);
  const [nomeHospede, setNomeHospede] = useState("");
  const [telefoneHospede, setTelefoneHospede] = useState("");
  const [emailHospede, setEmailHospede] = useState("");
  const [hospedeLogado, setHospedeLogado] = useState<DadosHospedeLogado | null>(
    null,
  );
  const parcelaSelecionada = parcelasDisponiveis.find(
    (parcela) => parcela.parcela === parcelas,
  ) ??
    parcelasDisponiveis[0] ?? { jurosPercentual: 0, parcela: 1 };
  const resumo = useMemo(
    () =>
      calcularResumoReserva({
        checkIn,
        checkOut,
        formaPagamento,
        hospedes: obterQuantidadeHospedesParaResumo(
          quantidadeHospedes,
          obterMaximoHospedesSelecionavel(property),
        ),
        jurosPercentual: parcelaSelecionada.jurosPercentual,
        parcelas: parcelaSelecionada.parcela,
        property,
      }),
    [
      checkIn,
      checkOut,
      formaPagamento,
      parcelaSelecionada.jurosPercentual,
      parcelaSelecionada.parcela,
      property,
      quantidadeHospedes,
    ],
  );
  const podeSolicitarReserva =
    property.maxGuests > 0 && metodosPagamento.length > 0;

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
        telefone: perfil?.phone ?? "",
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
    <GlassCard className="w-full max-w-full border-border bg-card/90 p-4 shadow-2xl shadow-cyan-950/10 backdrop-blur-xl dark:border-slate-600/45 dark:bg-slate-950/82 dark:shadow-black/30 sm:p-6">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Diária inicial</p>
          <p className="mt-2 text-3xl font-semibold text-foreground sm:text-4xl">
            {formatarPreco(property.minPrice)}
            <span className="ml-1 text-base font-medium text-muted-foreground">
              /noite
            </span>
          </p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Taxas e adicionais são calculados após selecionar as datas.
          </p>
          <ConversaoInternacional
            cotacoesCambio={cotacoesCambio}
            valorBrl={property.minPrice}
          />
        </div>
        <StatusBadge className="w-fit" tone="info">
          Solicitação
        </StatusBadge>
      </div>

      {feedback.status === "erro" ? (
        <div
          className="mt-5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          {feedback.mensagem ?? "Não foi possível enviar a solicitação."}
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
  telefoneHospede,
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
        <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
          O proprietário ainda não configurou as formas de pagamento desta casa.
        </div>
      ) : null}

      <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <MarketplaceIconField icon={CalendarDays} label="Entrada">
          <GlassInput
            className={marketplaceInputWithIconClass}
            disabled={bloqueado}
            name="checkIn"
            onChange={(evento) => setCheckIn(evento.target.value)}
            required
            type="date"
            value={checkIn}
          />
        </MarketplaceIconField>
        <MarketplaceIconField icon={CalendarDays} label="Saída">
          <GlassInput
            className={marketplaceInputWithIconClass}
            disabled={bloqueado}
            name="checkOut"
            onChange={(evento) => setCheckOut(evento.target.value)}
            required
            type="date"
            value={checkOut}
          />
        </MarketplaceIconField>
      </div>

      <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <MarketplaceIconField
          helpText={`Padrão da casa: ${property.checkIn}.`}
          icon={Clock}
          label="Horário previsto de chegada"
        >
          <GlassInput
            className={marketplaceInputWithIconClass}
            disabled={bloqueado}
            name="horarioPrevistoCheckIn"
            onChange={(evento) =>
              setHorarioPrevistoCheckIn(evento.target.value)
            }
            type="time"
            value={horarioPrevistoCheckIn}
          />
        </MarketplaceIconField>
        <MarketplaceIconField
          helpText={`Padrão da casa: ${property.checkOut}.`}
          icon={Clock}
          label="Horário previsto de saída"
        >
          <GlassInput
            className={marketplaceInputWithIconClass}
            disabled={bloqueado}
            name="horarioPrevistoCheckOut"
            onChange={(evento) =>
              setHorarioPrevistoCheckOut(evento.target.value)
            }
            type="time"
            value={horarioPrevistoCheckOut}
          />
        </MarketplaceIconField>
      </div>

      <MarketplaceIconField
        helpText={obterTextoLimiteHospedes(property)}
        icon={Users}
        label="Hóspedes"
      >
        <GlassInput
          className={marketplaceInputWithIconClass}
          disabled={bloqueado}
          inputMode="numeric"
          max={obterMaximoHospedesSelecionavel(property)}
          min={1}
          name="quantidadeHospedes"
          onBlur={() =>
            setQuantidadeHospedes(
              normalizarQuantidadeHospedesInput(
                quantidadeHospedes,
                obterMaximoHospedesSelecionavel(property),
              ),
            )
          }
          onChange={(evento) =>
            setQuantidadeHospedes(evento.target.value.replace(/\D/g, ""))
          }
          required
          type="number"
          value={quantidadeHospedes}
        />
      </MarketplaceIconField>

      <MarketplaceIconField icon={User} label="Nome do hóspede">
        <GlassInput
          className={marketplaceInputWithIconClass}
          disabled={bloqueado}
          name="hospedeNome"
          onChange={(evento) => setNomeHospede(evento.target.value)}
          required
          value={nomeHospede}
        />
      </MarketplaceIconField>

      <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <MarketplaceIconField icon={Phone} label="Telefone">
          <GlassInput
            className={marketplaceInputWithIconClass}
            disabled={bloqueado}
            name="hospedeTelefone"
            onChange={(evento) => setTelefoneHospede(evento.target.value)}
            required
            value={telefoneHospede}
          />
        </MarketplaceIconField>
        <MarketplaceIconField
          helpText={
            emailHospedeBloqueado
              ? "Este e-mail está vinculado à sua conta."
              : null
          }
          icon={Mail}
          label="E-mail"
        >
          <GlassInput
            className={cn(
              marketplaceInputWithIconClass,
              emailHospedeBloqueado &&
                "cursor-not-allowed border-border bg-muted text-muted-foreground dark:border-cyan-300/35 dark:bg-cyan-400/10",
            )}
            disabled={bloqueado}
            name="hospedeEmail"
            onChange={(evento) => setEmailHospede(evento.target.value)}
            readOnly={emailHospedeBloqueado}
            required
            type="email"
            value={emailHospede}
          />
        </MarketplaceIconField>
      </div>

      <MarketplacePlainField label="CPF opcional">
        <GlassInput
          className={marketplaceInputPlainClass}
          disabled={bloqueado}
          name="hospedeDocumento"
        />
      </MarketplacePlainField>

      <MarketplaceIconField
        helpText="Nenhum pagamento é realizado nesta etapa."
        icon={Banknote}
        label="Preferência de pagamento"
      >
        <select
          className={marketplaceSelectWithIconClass}
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
      </MarketplaceIconField>

      {formaPagamento === "credit_card" ? (
        <MarketplacePlainField label="Parcelas">
          <select
            className={marketplaceSelectPlainClass}
            disabled={bloqueado}
            onChange={(evento) =>
              setParcelas(Number.parseInt(evento.target.value, 10))
            }
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
        </MarketplacePlainField>
      ) : null}

      <MarketplacePlainField label="Observações">
        <textarea
          className={marketplaceTextareaClass}
          disabled={bloqueado}
          name="observacoes"
          placeholder="Conte o motivo da viagem, horário previsto de chegada ou pedidos importantes."
        />
      </MarketplacePlainField>

      <ResumoValores
        cotacoesCambio={cotacoesCambio}
        formaPagamento={formaPagamento}
        property={property}
        resumo={resumo}
      />
      <PerfilConfianca property={property} />

      <GlassButton
        className="h-14 w-full border-primary bg-primary text-base text-primary-foreground shadow-lg shadow-cyan-950/18 hover:bg-primary-hover disabled:border-border disabled:bg-muted disabled:text-disabled dark:border-sky-400/50 dark:bg-sky-500 dark:text-white dark:shadow-sky-500/25 dark:hover:bg-sky-400 dark:disabled:border-cyan-900/50 dark:disabled:bg-cyan-950/50 dark:disabled:text-cyan-100/60"
        disabled={bloqueado}
        size="lg"
        type="submit"
      >
        <Send className="h-4 w-4 text-current" />
        {pending ? "Enviando..." : "Solicitar reserva"}
      </GlassButton>
      <p className="text-center text-xs leading-5 text-muted-foreground">
        A forma de pagamento é apenas uma preferência. Não pedimos número de
        cartão, CVV, validade ou dados bancários sensíveis.
      </p>
    </fieldset>
  );
}

function ResumoValores({
  cotacoesCambio,
  formaPagamento,
  property,
  resumo,
}: {
  cotacoesCambio: CotacoesCambio;
  formaPagamento: ReservationPaymentMethod | "";
  property: PropriedadePublica;
  resumo: ResumoReserva;
}) {
  if (resumo.noites <= 0) {
    return (
      <div className="grid gap-2 rounded-lg border border-dashed bg-background/70 p-4 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground">
          Selecione as datas para calcular o total.
        </p>
        <p className="leading-6">
          O valor oficial continua em BRL. Taxa de limpeza, hóspedes extras e
          parcelas aparecem aqui antes de enviar a solicitação.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 rounded-lg border bg-background/70 p-4 text-sm">
      <ResumoLinha
        label={formatarDiarias(resumo.noites)}
        valor={resumo.diarias}
      />
      {resumo.taxaLimpeza ? (
        <ResumoLinha label="Taxa de limpeza" valor={resumo.taxaLimpeza} />
      ) : null}
      {resumo.hospedesExtras > 0 ? (
        <ResumoLinha
          label={formatarQuantidade(
            resumo.quantidadeHospedesExtras,
            "hóspede extra",
            "hóspedes extras",
          )}
          valor={resumo.hospedesExtras}
        />
      ) : null}
      {resumo.juros ? (
        <ResumoLinha label="Juros do cartão" valor={resumo.juros} />
      ) : null}
      {property.pricing.caucao ? (
        <ResumoLinha
          label="Caução informativa"
          valor={property.pricing.caucao}
        />
      ) : null}
      <span className="flex items-center justify-between gap-3 border-t pt-3 text-muted-foreground">
        <strong className="text-foreground">Total estimado</strong>
        <strong className="text-lg text-foreground">
          {formatarPreco(resumo.total || null)}
        </strong>
      </span>
      {formaPagamento === "credit_card" &&
      resumo.parcelaValor > 0 &&
      resumo.noites > 0 ? (
        <span className="text-xs text-muted-foreground">
          Cartão em{" "}
          {Math.max(1, Math.round(resumo.total / resumo.parcelaValor))}x de{" "}
          {formatarPreco(resumo.parcelaValor)}.
        </span>
      ) : null}
      <ConversaoTotal cotacoesCambio={cotacoesCambio} totalBrl={resumo.total} />
      <span className="flex items-center justify-between gap-3 text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Horários
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
  valorBrl,
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
        Valores em dólar e euro são aproximados
        {dataCotacao ? `, cotação de ${dataCotacao}` : ""}.
      </span>
    </div>
  );
}

function ConversaoTotal({
  cotacoesCambio,
  totalBrl,
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
      <p className="font-semibold text-foreground">
        Total aproximado internacional
      </p>
      <p className="mt-1">Aprox. {formatarMoeda(usd, "USD")}</p>
      <p>Aprox. {formatarMoeda(eur, "EUR")}</p>
      <p className="mt-2 leading-5">
        Conversão apenas informativa. O valor oficial da reserva permanece em
        BRL.
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
          <p className="truncate text-xs text-muted-foreground">
            {perfil.businessName}
          </p>
        </div>
      </div>
      <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-primary">
        <ShieldCheck className="h-4 w-4 text-primary" />
        Proprietário verificado
      </p>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        Comunique-se pelos contatos oficiais desta página e confira os dados da
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
  property,
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
        <CheckCircle2 className="h-6 w-6 text-primary" />
      </span>
      <h2 className="mt-5 text-xl font-semibold">
        Solicitação enviada com sucesso.
      </h2>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        O proprietário irá analisar sua reserva.
      </p>
      {codigo ? (
        <p className="mt-4 rounded-lg border bg-background/70 px-3 py-2 text-sm font-semibold">
          Código {codigo}
        </p>
      ) : null}
      <Link
        className={cn(buttonVariants({ size: "lg" }), "mt-6 w-full")}
        href={`/propriedades/${property.slug}`}
      >
        Voltar à propriedade
      </Link>
    </GlassCard>
  );
}

function calcularResumoReserva({
  checkIn,
  checkOut,
  formaPagamento,
  hospedes,
  jurosPercentual,
  parcelas,
  property,
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
  // Hóspedes acima dessa capacidade pagam o adicional uma vez por reserva.
  const hospedesExtras =
    quantidadeHospedesExtras * property.pricing.valorHospedeExtra;
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
    total,
  };
}

function obterCapacidadeCadastrada(property: PropriedadePublica) {
  return Math.max(property.maxGuests || 1, 1);
}

function obterMaximoHospedesSelecionavel(property: PropriedadePublica) {
  const capacidadeCadastrada = obterCapacidadeCadastrada(property);
  if (permiteHospedesExtras(property)) {
    // Enquanto não existir campo próprio de limite de extras, a interface
    // libera uma margem operacional clara sem alterar a capacidade cadastrada.
    return capacidadeCadastrada + LIMITE_PADRAO_HOSPEDES_EXTRAS;
  }

  return capacidadeCadastrada;
}

function permiteHospedesExtras(property: PropriedadePublica) {
  return (
    property.pricing.cobraHospedeExtra && property.pricing.valorHospedeExtra > 0
  );
}

function obterTextoLimiteHospedes(property: PropriedadePublica) {
  const capacidade = obterCapacidadeCadastrada(property);
  const maximo = obterMaximoHospedesSelecionavel(property);

  if (permiteHospedesExtras(property)) {
    const inclusos =
      capacidade === 1
        ? "1 hóspede incluído sem custo adicional."
        : `Até ${capacidade} hóspedes incluídos sem custo adicional.`;

    return `${inclusos} Hóspedes adicionais têm cobrança extra até ${formatarQuantidade(
      maximo,
      "hóspede",
      "hóspedes",
    )}.`;
  }

  return `Esta casa permite até ${formatarQuantidade(
    capacidade,
    "hóspede",
    "hóspedes",
  )}.`;
}

function obterQuantidadeHospedesParaResumo(
  valor: string,
  capacidadeMaxima: number,
) {
  const numero = Number.parseInt(valor, 10);
  if (!Number.isFinite(numero)) return 1;

  return Math.max(1, Math.min(numero, Math.max(capacidadeMaxima || 1, 1)));
}

function normalizarQuantidadeHospedesInput(
  valor: string,
  capacidadeMaxima: number,
) {
  return String(obterQuantidadeHospedesParaResumo(valor, capacidadeMaxima));
}

function obterParcelasDisponiveis(property: PropriedadePublica) {
  const limite = Math.max(1, property.pricing.maxParcelasCartao || 1);
  const configuradas = property.pricing.jurosParcelasCartao
    .filter((item) => item.parcela >= 1 && item.parcela <= limite)
    .sort((a, b) => a.parcela - b.parcela);
  const porParcela = new Map<
    number,
    { jurosPercentual: number; parcela: number }
  >();

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
    style: "currency",
  }).format(valor);
}
