"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "lucide-react";

import { Button, Input, Label } from "@hospedex/ui";

import { entrarAction } from "../../lib/auth/actions";
import { HospedexLoadingOverlay } from "../brand/hospedex-loading";

/**
 * Formulario de login visual.
 *
 * A autenticacao continua na Server Action existente. Este componente apenas
 * mostra o loading premium enquanto o Supabase valida as credenciais.
 */
export function LoginForm() {
  const [enviando, setEnviando] = useState(false);

  return (
    <>
      <form action={entrarAction} className="space-y-5" onSubmit={() => setEnviando(true)}>
        <div className="space-y-2">
          <Label className="text-slate-300" htmlFor="email">
            E-mail
          </Label>
          <Input
            autoComplete="email"
            className="h-12 border-white/10 bg-white/[0.06] text-white placeholder:text-slate-500 focus-visible:ring-cyan-400/70"
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
            className="h-12 border-white/10 bg-white/[0.06] text-white placeholder:text-slate-500 focus-visible:ring-cyan-400/70"
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
            className="text-sm font-medium text-cyan-300 transition hover:text-cyan-100 hover:underline"
            href="/recuperar-senha"
          >
            Esqueci minha senha
          </Link>
        </div>
        <Button
          className="h-12 w-full rounded-xl bg-cyan-400 font-bold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-300"
          type="submit"
        >
          Entrar
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>
      <HospedexLoadingOverlay aberto={enviando} />
    </>
  );
}
