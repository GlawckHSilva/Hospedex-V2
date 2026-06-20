"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { Button, cn } from "@hospedex/ui";

import { AnimatedLoginBackground } from "../auth/animated-login-background";
import { HospedexBrand } from "./hospedex-brand";

const TEXTOS_CARREGAMENTO = [
  "Validando acesso...",
  "Carregando sessao...",
  "Buscando permissoes...",
  "Preparando seu painel..."
] as const;

type HospedexLoadingScreenProps = {
  className?: string;
  permitirNovaTentativa?: boolean;
};

/**
 * Loading oficial da V2.
 *
 * Usado no carregamento do App Router e no pos-login. O botao de nova tentativa
 * aparece apenas no fluxo de login para evitar loading infinito em falhas de rede.
 */
export function HospedexLoadingScreen({
  className,
  permitirNovaTentativa = false
}: HospedexLoadingScreenProps) {
  const { demorou, mensagem } = useMensagemCarregamento(permitirNovaTentativa);

  return (
    <div className={cn("auth-premium-bg flex min-h-screen items-center justify-center px-6", className)}>
      <AnimatedLoginBackground />
      <motion.div
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative z-10 flex w-full max-w-sm flex-col items-center text-center"
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.32, ease: "easeOut" }}
      >
        <div className="auth-loading-mark mb-8">
          <HospedexBrand priority showText={false} size="xl" />
        </div>
        <HospedexBrand priority size="lg" />
        <div className="mt-8 w-full">
          <div className="auth-loading-progress" aria-hidden="true" />
          <p className="mt-5 text-sm font-medium text-slate-200">{mensagem}</p>
          <p className="mt-2 text-xs text-slate-500">
            Mantendo sua sessao e permissoes sincronizadas.
          </p>
        </div>
        {permitirNovaTentativa && demorou ? (
          <div className="mt-6 rounded-2xl border border-cyan-300/15 bg-white/[0.04] p-4 text-center backdrop-blur-xl">
            <p className="text-xs text-slate-300">
              A conexao esta demorando mais que o esperado.
            </p>
            <Button
              className="mt-3 border-cyan-300/30 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20"
              onClick={() => window.location.reload()}
              size="sm"
              type="button"
              variant="outline"
            >
              Tentar novamente
            </Button>
          </div>
        ) : null}
      </motion.div>
    </div>
  );
}

export function HospedexLoadingOverlay({ aberto }: { aberto: boolean }) {
  return (
    <AnimatePresence>
      {aberto ? (
        <motion.div
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[100] bg-slate-950"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <HospedexLoadingScreen permitirNovaTentativa />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function useMensagemCarregamento(ativarTimeout: boolean) {
  const [indice, setIndice] = useState(0);
  const [demorou, setDemorou] = useState(false);

  useEffect(() => {
    const intervalo = window.setInterval(() => {
      setIndice((valorAtual) => (valorAtual + 1) % TEXTOS_CARREGAMENTO.length);
    }, 1100);

    return () => window.clearInterval(intervalo);
  }, []);

  useEffect(() => {
    if (!ativarTimeout) return;

    const timeout = window.setTimeout(() => setDemorou(true), 16000);
    return () => window.clearTimeout(timeout);
  }, [ativarTimeout]);

  return { demorou, mensagem: TEXTOS_CARREGAMENTO[indice] };
}
