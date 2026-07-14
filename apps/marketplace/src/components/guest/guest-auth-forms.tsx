import { KeyRound, Mail, Phone, User } from "lucide-react";
import Link from "next/link";

import { GlassCard, GlassInput } from "@hospedex/ui";

import {
  MarketplaceIconField,
  marketplaceInputWithIconClass,
} from "../forms/marketplace-icon-field";
import {
  cadastroHospedeAction,
  loginHospedeAction,
  recuperarSenhaHospedeAction,
} from "../../lib/guest/actions";
import { FormSubmitButton } from "./form-submit-button";

export function GuestLoginCard({ mensagem }: { mensagem: string | null }) {
  return (
    <GlassCard className="mx-auto w-full max-w-[calc(100vw-2rem)] overflow-hidden p-6 shadow-2xl shadow-cyan-950/20 sm:max-w-md">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
        Área do Hóspede
      </p>
      <h1 className="mt-3 text-3xl font-semibold">Entrar</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Acompanhe suas reservas, pagamento e instruções de viagem.
      </p>

      {mensagem ? (
        <div className="mt-5 rounded-lg border border-primary/25 bg-primary/10 p-3 text-sm text-primary">
          {mensagem}
        </div>
      ) : null}

      <form action={loginHospedeAction} className="mt-6 grid gap-4">
        <MarketplaceIconField icon={Mail} label="E-mail" srOnly>
          <GlassInput
            className={marketplaceInputWithIconClass}
            name="email"
            placeholder="E-mail"
            required
            type="email"
          />
        </MarketplaceIconField>
        <MarketplaceIconField icon={KeyRound} label="Senha" srOnly>
          <GlassInput
            className={marketplaceInputWithIconClass}
            name="senha"
            placeholder="Senha"
            required
            type="password"
          />
        </MarketplaceIconField>
        <FormSubmitButton pendingText="Entrando...">Entrar</FormSubmitButton>
      </form>

      <form action={recuperarSenhaHospedeAction} className="mt-5 grid gap-3">
        <p className="text-xs text-muted-foreground">
          Esqueceu a senha? Informe seu e-mail acima e solicite a recuperação.
        </p>
        <MarketplaceIconField icon={Mail} label="E-mail para recuperação" srOnly>
          <GlassInput
            className={marketplaceInputWithIconClass}
            name="email"
            placeholder="E-mail para recuperação"
            type="email"
          />
        </MarketplaceIconField>
        <FormSubmitButton pendingText="Enviando...">
          Recuperar senha
        </FormSubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Ainda não tem conta?{" "}
        <Link
          className="font-medium text-primary hover:text-primary/80"
          href="/cadastro"
        >
          Criar conta
        </Link>
      </p>
    </GlassCard>
  );
}

export function GuestSignupCard({ mensagem }: { mensagem: string | null }) {
  return (
    <GlassCard className="mx-auto w-full max-w-[calc(100vw-2rem)] overflow-hidden p-6 shadow-2xl shadow-cyan-950/20 sm:max-w-lg">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
        Área do Hóspede
      </p>
      <h1 className="mt-3 text-3xl font-semibold">Criar conta</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Use o mesmo e-mail informado na solicitação de hospedagem para vincular
        suas reservas.
      </p>

      {mensagem ? (
        <div className="mt-5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {mensagem}
        </div>
      ) : null}

      <form action={cadastroHospedeAction} className="mt-6 grid gap-4">
        <MarketplaceIconField icon={User} label="Nome completo" srOnly>
          <GlassInput
            className={marketplaceInputWithIconClass}
            name="nome"
            placeholder="Nome completo"
            required
          />
        </MarketplaceIconField>
        <MarketplaceIconField icon={Mail} label="E-mail" srOnly>
          <GlassInput
            className={marketplaceInputWithIconClass}
            name="email"
            placeholder="E-mail"
            required
            type="email"
          />
        </MarketplaceIconField>
        <MarketplaceIconField icon={Phone} label="Telefone" srOnly>
          <GlassInput
            className={marketplaceInputWithIconClass}
            name="telefone"
            placeholder="Telefone"
          />
        </MarketplaceIconField>
        <MarketplaceIconField icon={KeyRound} label="Senha" srOnly>
          <GlassInput
            className={marketplaceInputWithIconClass}
            minLength={6}
            name="senha"
            placeholder="Senha"
            required
            type="password"
          />
        </MarketplaceIconField>
        <FormSubmitButton pendingText="Criando...">
          Criar conta
        </FormSubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link
          className="font-medium text-primary hover:text-primary/80"
          href="/login"
        >
          Entrar
        </Link>
      </p>
    </GlassCard>
  );
}
