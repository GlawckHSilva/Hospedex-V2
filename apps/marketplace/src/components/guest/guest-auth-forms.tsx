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
    <GlassCard className="marketplace-login-card mx-auto w-full max-w-[calc(100vw-2rem)] overflow-hidden p-6 sm:max-w-md sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-normal text-primary">
        Área do Hóspede
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-normal sm:text-4xl">
        Entrar no Hospedex
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Acesse sua área para acompanhar reservas, pagamentos e sua viagem.
      </p>

      {mensagem ? (
        <div className="mt-5 rounded-lg border border-primary/25 bg-primary/10 p-3 text-sm text-primary">
          {mensagem}
        </div>
      ) : null}

      <form action={loginHospedeAction} className="mt-7 grid gap-4">
        <MarketplaceIconField icon={Mail} label="E-mail">
          <GlassInput
            className={marketplaceInputWithIconClass + " marketplace-login-input"}
            name="email"
            placeholder="E-mail"
            required
            type="email"
          />
        </MarketplaceIconField>
        <MarketplaceIconField icon={KeyRound} label="Senha">
          <GlassInput
            className={marketplaceInputWithIconClass + " marketplace-login-input"}
            name="senha"
            placeholder="Senha"
            required
            type="password"
          />
        </MarketplaceIconField>
        <FormSubmitButton
          className="marketplace-login-primary-button mt-1 h-12 rounded-xl"
          pendingText="Entrando..."
        >
          Entrar
        </FormSubmitButton>
      </form>

      <form
        action={recuperarSenhaHospedeAction}
        className="marketplace-login-recovery mt-6 grid gap-3 border-t border-border/70 pt-5 dark:border-cyan-300/12"
      >
        <div>
          <p className="text-sm font-semibold text-foreground">Esqueceu sua senha?</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Informe seu e-mail para receber as instruções de recuperação.
          </p>
        </div>
        <MarketplaceIconField icon={Mail} label="E-mail para recuperação">
          <GlassInput
            className={marketplaceInputWithIconClass + " marketplace-login-input"}
            name="email"
            placeholder="E-mail para recuperação"
            type="email"
          />
        </MarketplaceIconField>
        <FormSubmitButton
          className="marketplace-login-secondary-button h-11 rounded-xl"
          pendingText="Enviando..."
        >
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
