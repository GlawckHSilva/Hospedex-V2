"use client";

import { KeyRound, Mail, Phone, User } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

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

type ModoLoginHospede = "login" | "recuperacao";

export function GuestLoginCard({ mensagem }: { mensagem: string | null }) {
  const [modo, setModo] = useState<ModoLoginHospede>("login");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const idCampo = modo === "login" ? "guest-login-email" : "guest-recovery-email";
    window.setTimeout(() => {
      document.getElementById(idCampo)?.focus();
    }, 0);
  }, [modo]);

  return (
    <GlassCard className="marketplace-login-card mx-auto w-full max-w-[calc(100vw-2rem)] overflow-hidden p-5 sm:max-w-md sm:p-7">
      <p className="text-xs font-semibold uppercase tracking-normal text-primary">
        Area do Hospede
      </p>

      <div aria-live="polite">
        {modo === "login" ? (
          <>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal">
              Entrar no Hospedex
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Acesse suas reservas, pagamentos e instrucoes de viagem.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal">
              Recuperar senha
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Informe seu e-mail para receber as instrucoes de recuperacao.
            </p>
          </>
        )}
      </div>

      {mensagem ? (
        <div
          aria-live="polite"
          className="mt-5 rounded-lg border border-primary/25 bg-primary/10 p-3 text-sm text-primary"
        >
          {mensagem}
        </div>
      ) : null}

      {modo === "login" ? (
        <form action={loginHospedeAction} className="mt-6 grid gap-4">
          <MarketplaceIconField icon={Mail} label="E-mail">
            <GlassInput
              autoComplete="email"
              className={marketplaceInputWithIconClass + " marketplace-login-input"}
              id="guest-login-email"
              name="email"
              onChange={(evento) => setEmail(evento.target.value)}
              placeholder="voce@email.com"
              required
              type="email"
              value={email}
            />
          </MarketplaceIconField>
          <MarketplaceIconField icon={KeyRound} label="Senha">
            <GlassInput
              autoComplete="current-password"
              className={marketplaceInputWithIconClass + " marketplace-login-input"}
              name="senha"
              placeholder="Sua senha"
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
      ) : (
        <form action={recuperarSenhaHospedeAction} className="mt-6 grid gap-4">
          <MarketplaceIconField icon={Mail} label="E-mail">
            <GlassInput
              autoComplete="email"
              className={marketplaceInputWithIconClass + " marketplace-login-input"}
              id="guest-recovery-email"
              name="email"
              onChange={(evento) => setEmail(evento.target.value)}
              placeholder="voce@email.com"
              required
              type="email"
              value={email}
            />
          </MarketplaceIconField>
          <FormSubmitButton
            className="marketplace-login-primary-button mt-1 h-12 rounded-xl"
            pendingText="Enviando..."
          >
            Enviar link de recuperacao
          </FormSubmitButton>
        </form>
      )}

      <div className="mt-5 flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        {modo === "login" ? (
          <button
            className="w-fit font-medium text-primary underline-offset-4 transition hover:text-primary-hover hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
            onClick={() => setModo("recuperacao")}
            type="button"
          >
            Esqueceu sua senha?
          </button>
        ) : (
          <button
            className="w-fit font-medium text-primary underline-offset-4 transition hover:text-primary-hover hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
            onClick={() => setModo("login")}
            type="button"
          >
            Voltar para entrar
          </button>
        )}

        <span className="text-muted-foreground">
          Ainda nao tem conta?{" "}
          <Link
            className="font-medium text-primary hover:text-primary-hover"
            href="/cadastro"
          >
            Criar conta
          </Link>
        </span>
      </div>
    </GlassCard>
  );
}

export function GuestSignupCard({ mensagem }: { mensagem: string | null }) {
  return (
    <GlassCard className="marketplace-login-card mx-auto w-full max-w-[calc(100vw-2rem)] overflow-hidden p-5 sm:max-w-md sm:p-7">
      <p className="text-xs font-semibold uppercase tracking-normal text-primary">
        Area do Hospede
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-normal">
        Criar conta no Hospedex
      </h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Use o mesmo e-mail informado na solicitacao de hospedagem para vincular
        suas reservas.
      </p>

      {mensagem ? (
        <div className="mt-5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {mensagem}
        </div>
      ) : null}

      <form action={cadastroHospedeAction} className="mt-6 grid gap-4">
        <MarketplaceIconField icon={User} label="Nome completo">
          <GlassInput
            autoComplete="name"
            className={marketplaceInputWithIconClass + " marketplace-login-input"}
            name="nome"
            placeholder="Nome completo"
            required
          />
        </MarketplaceIconField>
        <MarketplaceIconField icon={Mail} label="E-mail">
          <GlassInput
            autoComplete="email"
            className={marketplaceInputWithIconClass + " marketplace-login-input"}
            name="email"
            placeholder="voce@email.com"
            required
            type="email"
          />
        </MarketplaceIconField>
        <MarketplaceIconField icon={Phone} label="Telefone">
          <GlassInput
            autoComplete="tel"
            className={marketplaceInputWithIconClass + " marketplace-login-input"}
            name="telefone"
            placeholder="Telefone"
          />
        </MarketplaceIconField>
        <MarketplaceIconField icon={KeyRound} label="Senha">
          <GlassInput
            autoComplete="new-password"
            className={marketplaceInputWithIconClass + " marketplace-login-input"}
            minLength={6}
            name="senha"
            placeholder="Minimo de 6 caracteres"
            required
            type="password"
          />
        </MarketplaceIconField>
        <FormSubmitButton
          className="marketplace-login-primary-button mt-1 h-12 rounded-xl"
          pendingText="Criando..."
        >
          Criar conta
        </FormSubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Ja tem conta?{" "}
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
