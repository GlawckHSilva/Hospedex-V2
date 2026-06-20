"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { Button, Input, Label } from "@hospedex/ui";

import { entrarAction } from "../../lib/auth/actions";

const MENSAGENS_LOGIN = [
  "Validando acesso...",
  "Carregando sessao...",
  "Preparando painel..."
] as const;

/**
 * Formulario de login visual.
 *
 * A autenticacao continua na Server Action existente. O estado de envio fica
 * dentro do proprio card para nao criar telas paralelas nem duplicar a marca.
 */
export function LoginForm() {
  return (
    <form action={entrarAction} className="space-y-5">
      <CamposLogin />
    </form>
  );
}

function CamposLogin() {
  const { pending } = useFormStatus();

  return (
    <>
      <div className="space-y-2">
        <Label className="text-slate-300" htmlFor="email">
          E-mail
        </Label>
        <Input
          autoComplete="email"
          className="h-12 border-white/10 bg-white/[0.06] text-white placeholder:text-slate-500 focus-visible:ring-cyan-400/70 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={pending}
          id="email"
          name="email"
          placeholder="seu@email.com"
          required
          type="email"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-slate-300" htmlFor="password">
          Senha
        </Label>
        <Input
          autoComplete="current-password"
          className="h-12 border-white/10 bg-white/[0.06] text-white placeholder:text-slate-500 focus-visible:ring-cyan-400/70 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={pending}
          id="password"
          minLength={6}
          name="password"
          placeholder="Digite sua senha"
          required
          type="password"
        />
      </div>
      <div className="flex items-center justify-end">
        <Link
          aria-disabled={pending}
          className="text-sm font-medium text-cyan-300 transition hover:text-cyan-100 hover:underline aria-disabled:pointer-events-none aria-disabled:opacity-60"
          href="/recuperar-senha"
        >
          Esqueci minha senha
        </Link>
      </div>
      <LoginLoadingCard ativo={pending} />
      <Button
        className="h-12 w-full rounded-xl bg-cyan-400 font-bold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-300 disabled:cursor-wait disabled:opacity-80"
        disabled={pending}
        type="submit"
      >
        {pending ? (
          <>
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Entrando...
          </>
        ) : (
          <>
            Entrar
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>
    </>
  );
}

function LoginLoadingCard({ ativo }: { ativo: boolean }) {
  const mensagem = useMensagemLogin(ativo);

  return (
    <AnimatePresence initial={false}>
      {ativo ? (
        <motion.div
          animate={{ height: "auto", opacity: 1, y: 0 }}
          className="overflow-hidden rounded-xl border border-cyan-300/15 bg-cyan-300/[0.06] px-3 py-3 text-sm text-cyan-50"
          exit={{ height: 0, opacity: 0, y: -4 }}
          initial={{ height: 0, opacity: 0, y: -4 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <div className="auth-login-inline-progress" aria-hidden="true" />
          <p className="mt-3 text-xs font-medium text-cyan-100">{mensagem}</p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function useMensagemLogin(ativo: boolean) {
  const [indice, setIndice] = useState(0);

  useEffect(() => {
    if (!ativo) {
      setIndice(0);
      return;
    }

    const intervalo = window.setInterval(() => {
      setIndice((valorAtual) => (valorAtual + 1) % MENSAGENS_LOGIN.length);
    }, 950);

    return () => window.clearInterval(intervalo);
  }, [ativo]);

  return MENSAGENS_LOGIN[indice];
}
