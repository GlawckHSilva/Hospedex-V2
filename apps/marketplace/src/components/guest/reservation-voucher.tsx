"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { GlassCard } from "@hospedex/ui";

import type { ReservaHospedeDetalhe } from "../../lib/guest/types";
import {
  montarTextoVoucher,
  ReservationVoucherDocument
} from "./reservation-voucher-document";
import { VoucherActions } from "./voucher-actions";

/**
 * Card de ações do comprovante da reserva.
 *
 * O comprovante não fica renderizado como prévia fixa no painel para evitar
 * poluir a tela do hóspede. Ele é aberto sob demanda em modal e impresso como
 * documento HTML isolado.
 */
export function ReservationVoucher({ reserva }: { reserva: ReservaHospedeDetalhe }) {
  const [aberto, setAberto] = useState(false);
  const [imprimirAoAbrir, setImprimirAoAbrir] = useState(false);
  const disponivel = reserva.status !== "pending";
  const textoVoucher = montarTextoVoucher(reserva);

  useEffect(() => {
    if (!aberto) return;

    const aoPressionarTecla = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setAberto(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", aoPressionarTecla);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", aoPressionarTecla);
    };
  }, [aberto]);

  useEffect(() => {
    if (!aberto || !imprimirAoAbrir) return;

    const temporizador = window.setTimeout(() => {
      imprimirComprovante();
      setImprimirAoAbrir(false);
    }, 120);

    return () => window.clearTimeout(temporizador);
  }, [aberto, imprimirAoAbrir]);

  function abrirComprovante() {
    if (!disponivel) return;
    setAberto(true);
  }

  function imprimir() {
    if (!disponivel) return;
    setAberto(true);
    setImprimirAoAbrir(true);
  }

  return (
    <GlassCard className="p-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          Comprovante
        </p>
        <h2 className="mt-2 text-2xl font-semibold">Voucher de hospedagem</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Gere, copie ou imprima o comprovante quando precisar.
        </p>
      </div>

      <div className="mt-5">
        <VoucherActions
          disponivel={disponivel}
          onImprimir={imprimir}
          onVerComprovante={abrirComprovante}
          texto={textoVoucher}
        />
      </div>

      {!disponivel ? (
        <div className="mt-5 rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning dark:border-amber-300/25 dark:bg-amber-400/10 dark:text-amber-100">
          O comprovante será liberado após a confirmação da reserva pelo proprietário.
        </div>
      ) : null}

      {aberto ? (
        <>
          <VoucherModal
            onClose={() => setAberto(false)}
            onImprimir={imprimirComprovante}
            reserva={reserva}
            texto={textoVoucher}
          />
          <VoucherPrintRoot reserva={reserva} />
        </>
      ) : null}
    </GlassCard>
  );
}

function VoucherModal({
  onClose,
  onImprimir,
  reserva,
  texto
}: {
  onClose: () => void;
  onImprimir: () => void;
  reserva: ReservaHospedeDetalhe;
  texto: string;
}) {
  return createPortal(
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-black/72 p-3 backdrop-blur-xl sm:p-6"
      role="dialog"
    >
      <button
        aria-label="Fechar comprovante"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        type="button"
      />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-cyan-300/20 bg-slate-950 shadow-2xl">
        <div className="flex flex-col gap-3 border-b border-cyan-300/15 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              Visualizacao do comprovante
            </p>
            <h3 className="mt-1 text-xl font-semibold text-white">Voucher de hospedagem</h3>
          </div>
          <div className="flex items-center gap-2">
            <VoucherActions
              disponivel
              mostrarVerComprovante={false}
              onImprimir={onImprimir}
              onVerComprovante={() => undefined}
              texto={texto}
            />
            <button
              aria-label="Fechar"
              className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-slate-200 hover:bg-white/10"
              onClick={onClose}
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto bg-slate-900/70 p-3 sm:p-6">
          <ReservationVoucherDocument reserva={reserva} />
        </div>
      </div>
    </div>,
    document.body
  );
}

function VoucherPrintRoot({ reserva }: { reserva: ReservaHospedeDetalhe }) {
  return createPortal(
    <div className="voucher-print-root-screen" id="voucher-print-root">
      <ReservationVoucherDocument reserva={reserva} />
    </div>,
    document.body
  );
}

function imprimirComprovante() {
  // A classe ativa o CSS de impressao que esconde o painel e mostra apenas o
  // documento branco do voucher.
  document.body.classList.add("printing-voucher");
  window.setTimeout(() => window.print(), 100);

  const limparClasse = () => {
    document.body.classList.remove("printing-voucher");
    window.removeEventListener("afterprint", limparClasse);
  };

  window.addEventListener("afterprint", limparClasse);
  window.setTimeout(limparClasse, 1200);
}
