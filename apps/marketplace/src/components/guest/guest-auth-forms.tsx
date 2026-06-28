import { KeyRound, Mail, Phone, User } from "lucide-react";
import Link from "next/link";
import type { ComponentType, ReactNode } from "react";

import { GlassCard, GlassInput } from "@hospedex/ui";

import {
  cadastroHospedeAction,
  loginHospedeAction,
  recuperarSenhaHospedeAction
} from "../../lib/guest/actions";
import { FormSubmitButton } from "./form-submit-button";

export function GuestLoginCard({
  mensagem
}: {
  mensagem: string | null;
}) {
  return (
    <GlassCard className="mx-auto w-full max-w-md p-6 shadow-2xl shadow-cyan-950/20">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
        Area do Hospede
      </p>
      <h1 className="mt-3 text-3xl font-semibold">Entrar</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Acompanhe suas reservas, pagamento e instrucoes de viagem.
      </p>

      {mensagem ? (
        <div className="mt-5 rounded-lg border border-primary/25 bg-primary/10 p-3 text-sm text-primary">
          {mensagem}
        </div>
      ) : null}

      <form action={loginHospedeAction} className="mt-6 grid gap-4">
        <CampoIcone icon={Mail}>
          <GlassInput name="email" placeholder="E-mail" required type="email" />
        </CampoIcone>
        <CampoIcone icon={KeyRound}>
          <GlassInput name="senha" placeholder="Senha" required type="password" />
        </CampoIcone>
        <FormSubmitButton pendingText="Entrando...">Entrar</FormSubmitButton>
      </form>

      <form action={recuperarSenhaHospedeAction} className="mt-5 grid gap-3">
        <p className="text-xs text-muted-foreground">
          Esqueceu a senha? Informe seu e-mail acima e solicite a recuperacao.
        </p>
        <GlassInput name="email" placeholder="E-mail para recuperacao" type="email" />
        <FormSubmitButton pendingText="Enviando...">Recuperar senha</FormSubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Ainda nao tem conta?{" "}
        <Link className="font-medium text-primary hover:text-primary/80" href="/cadastro">
          Criar conta
        </Link>
      </p>
    </GlassCard>
  );
}

export function GuestSignupCard({
  mensagem
}: {
  mensagem: string | null;
}) {
  return (
    <GlassCard className="mx-auto w-full max-w-lg p-6 shadow-2xl shadow-cyan-950/20">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
        Area do Hospede
      </p>
      <h1 className="mt-3 text-3xl font-semibold">Criar conta</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Use o mesmo e-mail informado na solicitacao de hospedagem para vincular suas reservas.
      </p>

      {mensagem ? (
        <div className="mt-5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {mensagem}
        </div>
      ) : null}

      <form action={cadastroHospedeAction} className="mt-6 grid gap-4">
        <CampoIcone icon={User}>
          <GlassInput name="nome" placeholder="Nome completo" required />
        </CampoIcone>
        <CampoIcone icon={Mail}>
          <GlassInput name="email" placeholder="E-mail" required type="email" />
        </CampoIcone>
        <CampoIcone icon={Phone}>
          <GlassInput name="telefone" placeholder="Telefone" />
        </CampoIcone>
        <CampoIcone icon={KeyRound}>
          <GlassInput
            minLength={6}
            name="senha"
            placeholder="Senha"
            required
            type="password"
          />
        </CampoIcone>
        <FormSubmitButton pendingText="Criando...">Criar conta</FormSubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Ja tem conta?{" "}
        <Link className="font-medium text-primary hover:text-primary/80" href="/login">
          Entrar
        </Link>
      </p>
    </GlassCard>
  );
}

function CampoIcone({
  children,
  icon: Icone
}: {
  children: ReactNode;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="relative">
      <Icone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <div className="[&_input]:pl-10">{children}</div>
    </div>
  );
}
