"use client";

import type { PlatformSubscriptionBillingCycle } from "@hospedex/types";
import { Button, cn } from "@hospedex/ui";
import { CalendarClock, CreditCard, ExternalLink, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { useState, useTransition } from "react";

import { gerarCheckoutAssinaturaHospedexAction } from "../../lib/platform-billing/actions";
import { AppModal } from "../management/entity-modal";

/**
 * Acao visual para regularizar assinatura Hospedex.
 *
 * O botao nao renova licenca nem marca pagamento como recebido. Ele apenas
 * solicita ao servidor a invoice pending e envia o proprietario ao checkout
 * global da plataforma.
 */

type ResultadoCheckout = {
  checkoutUrl: string;
  invoiceId: string;
  preferenceId: string;
  reused: boolean;
};

export function LicenseRegularizationButton() {
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<ResultadoCheckout | null>(null);
  const [cicloCarregando, setCicloCarregando] =
    useState<PlatformSubscriptionBillingCycle | null>(null);
  const [isPending, startTransition] = useTransition();

  function regularizar(ciclo: PlatformSubscriptionBillingCycle) {
    setErro(null);
    setCheckout(null);
    setCicloCarregando(ciclo);

    startTransition(async () => {
      const resultado = await gerarCheckoutAssinaturaHospedexAction(ciclo);
      setCicloCarregando(null);

      if (!resultado.ok) {
        setErro(resultado.error);
        return;
      }

      const dados = {
        checkoutUrl: resultado.checkoutUrl,
        invoiceId: resultado.invoiceId,
        preferenceId: resultado.preferenceId,
        reused: resultado.reused,
      };
      setCheckout(dados);
      window.location.assign(resultado.checkoutUrl);
    });
  }

  const carregando = Boolean(isPending || cicloCarregando);

  return (
    <>
      <button
        className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-cyan-400/30 px-3 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-500/10 disabled:cursor-wait disabled:opacity-70"
        disabled={carregando}
        onClick={() => setAberto(true)}
        type="button"
      >
        {carregando ? "Preparando..." : "Regularizar pagamento"}
      </button>

      <AppModal
        description="Escolha o ciclo de regularizacao. A licenca so sera renovada quando o pagamento for confirmado pelo webhook futuro."
        eyebrow="Assinatura Hospedex"
        onOpenChange={setAberto}
        open={aberto}
        size="sm"
        title="Regularizar assinatura"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-cyan-300/15 bg-cyan-500/8 p-3 text-sm text-muted-foreground">
            A cobranca e da plataforma Hospedex. Ela nao altera reservas, nao
            usa o Mercado Pago do proprietario e nao marca a invoice como paga.
          </div>

          <div className="grid gap-3">
            <OpcaoRegularizacao
              ciclo="monthly"
              descricao="Gera ou reutiliza uma invoice pending mensal do plano atual."
              disabled={carregando}
              icon={<CreditCard className="h-4 w-4" />}
              loading={cicloCarregando === "monthly"}
              onClick={regularizar}
              titulo="Regularizar mensal"
            />
            <OpcaoRegularizacao
              ciclo="annual"
              descricao="Gera ou reutiliza uma invoice pending anual do plano atual."
              disabled={carregando}
              icon={<CalendarClock className="h-4 w-4" />}
              loading={cicloCarregando === "annual"}
              onClick={regularizar}
              titulo="Regularizar anual"
            />
          </div>

          {erro ? (
            <div className="rounded-xl border border-rose-400/25 bg-rose-500/10 p-3 text-sm text-rose-100">
              {erro}
            </div>
          ) : null}

          {checkout ? (
            <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-3 text-sm text-emerald-100">
              <p>
                {checkout.reused
                  ? "Invoice pending reutilizada."
                  : "Invoice pending criada."}
              </p>
              <a
                className="mt-2 inline-flex items-center gap-2 font-semibold text-cyan-100 hover:text-cyan-50"
                href={checkout.checkoutUrl}
                rel="noreferrer"
              >
                Abrir pagamento <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          ) : null}
        </div>
      </AppModal>
    </>
  );
}

function OpcaoRegularizacao({
  ciclo,
  descricao,
  disabled,
  icon,
  loading,
  onClick,
  titulo,
}: {
  ciclo: PlatformSubscriptionBillingCycle;
  descricao: string;
  disabled: boolean;
  icon: ReactNode;
  loading: boolean;
  onClick: (ciclo: PlatformSubscriptionBillingCycle) => void;
  titulo: string;
}) {
  return (
    <Button
      className={cn(
        "h-auto justify-start gap-3 rounded-xl border border-border bg-card/80 px-4 py-3 text-left hover:border-cyan-300/35 hover:bg-cyan-500/10",
        loading && "cursor-wait",
      )}
      disabled={disabled}
      onClick={() => onClick(ciclo)}
      type="button"
      variant="outline"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-300/25 bg-cyan-500/10 text-cyan-100">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-foreground">
          {loading ? "Gerando checkout..." : titulo}
        </span>
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">
          {descricao}
        </span>
      </span>
    </Button>
  );
}
