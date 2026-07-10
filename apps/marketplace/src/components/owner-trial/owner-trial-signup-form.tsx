"use client";

import { ArrowLeft, ArrowRight, Check, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

import { GlassButton, GlassCard, GlassInput, Label, cn } from "@hospedex/ui";

import { FormSubmitButton } from "../guest/form-submit-button";
import { iniciarTrialProprietarioAction } from "../../lib/owner-trial/actions";

type PlanoCadastro = {
  codigo: string;
  limiteCasas: number;
  nome: string;
  precoAnual: number;
  precoMensal: number;
};

const ETAPAS = ["Dados pessoais", "Empreendimento", "Plano e pagamento", "Confirmacao"];

/** Formulario progressivo sem capturar qualquer dado sensivel de pagamento. */
export function OwnerTrialSignupForm({ erro, plano }: { erro?: string; plano: PlanoCadastro }) {
  const [etapa, setEtapa] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  function avancar() {
    const painel = formRef.current?.querySelector<HTMLElement>(`[data-step="${etapa}"]`);
    const campos = [...(painel?.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input,select") ?? [])];
    const invalido = campos.find((campo) => !campo.checkValidity());
    if (invalido) {
      invalido.reportValidity();
      invalido.focus();
      return;
    }
    setEtapa((atual) => Math.min(atual + 1, ETAPAS.length - 1));
  }

  return (
    <form action={iniciarTrialProprietarioAction} className="space-y-6" ref={formRef}>
      <input name="plano" type="hidden" value={plano.codigo} />
      <Stepper etapa={etapa} />

      {erro ? (
        <p className="rounded-lg border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {erro}
        </p>
      ) : null}

      <div className={cn("grid gap-4 sm:grid-cols-2", etapa !== 0 && "hidden")} data-step="0">
        <Campo label="Nome" name="nome" autoComplete="given-name" />
        <Campo label="Sobrenome" name="sobrenome" autoComplete="family-name" />
        <Campo className="sm:col-span-2" label="E-mail" name="email" type="email" autoComplete="email" />
        <Campo
          label="Telefone/WhatsApp"
          name="telefone"
          type="tel"
          inputMode="tel"
          pattern="[0-9 ()+-]{10,20}"
          placeholder="(43) 99999-9999"
          autoComplete="tel"
          maxLength={15}
          onInput={(evento) => {
            evento.currentTarget.value = mascararTelefone(evento.currentTarget.value);
          }}
        />
        <div />
        <Campo label="Senha" name="senha" type="password" minLength={8} autoComplete="new-password" />
        <Campo
          label="Confirmar senha"
          name="confirmacaoSenha"
          type="password"
          minLength={8}
          autoComplete="new-password"
        />
      </div>

      <div className={cn("grid gap-4 sm:grid-cols-2", etapa !== 1 && "hidden")} data-step="1">
        <Campo className="sm:col-span-2" label="Nome do empreendimento" name="empreendimento" />
        <Campo label="Cidade" name="cidade" autoComplete="address-level2" />
        <Campo label="Estado" name="estado" maxLength={2} placeholder="PR" autoComplete="address-level1" />
        <Campo
          className="sm:col-span-2"
          label="Quantidade estimada de casas"
          name="quantidadeEstimada"
          type="number"
          min={1}
          max={plano.limiteCasas}
          defaultValue={1}
        />
      </div>

      <div className={cn("space-y-5", etapa !== 2 && "hidden")} data-step="2">
        <ResumoPlano plano={plano} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Selecao label="Ciclo apos o trial" name="ciclo" defaultValue="monthly">
            <option value="monthly">Mensal</option>
            <option value="annual">Anual</option>
          </Selecao>
          <Selecao label="Preferencia de pagamento futura" name="formaPagamento" defaultValue="pix">
            <option value="pix">Pix</option>
            <option value="credit_card">Cartao de credito</option>
            <option value="debit_card">Cartao de debito</option>
          </Selecao>
        </div>
        <p className="flex gap-2 rounded-lg border border-cyan-300/20 bg-cyan-400/8 p-4 text-sm leading-6 text-cyan-50">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
          Esta escolha e apenas uma preferencia. Nenhum numero de cartao, token ou cobranca sera solicitado agora.
        </p>
      </div>

      <div className={cn("space-y-5", etapa !== 3 && "hidden")} data-step="3">
        <GlassCard className="space-y-4 p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-emerald-500/12 text-emerald-300">
              <Check className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-semibold text-foreground">30 dias gratis, sem cobranca agora</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                A cobranca so ocorrera futuramente, apos o trial, conforme o plano escolhido.
              </p>
            </div>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Seu teste gratis dura 30 dias.</li>
            <li>Voce podera cancelar ou alterar o plano antes do fim do teste.</li>
            <li>O limite inicial sera de {plano.limiteCasas} casa(s).</li>
          </ul>
        </GlassCard>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 text-sm text-muted-foreground">
          <input className="mt-0.5 h-4 w-4 accent-cyan-400" name="aceiteTermos" required type="checkbox" />
          <span>Li e aceito os termos do trial gratuito e a futura cobranca conforme o plano selecionado.</span>
        </label>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-between">
        {etapa > 0 ? (
          <GlassButton onClick={() => setEtapa((atual) => Math.max(0, atual - 1))} variant="outline">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </GlassButton>
        ) : (
          <Link className="inline-flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground" href="/anunciar#planos">
            <ArrowLeft className="h-4 w-4" /> Voltar aos planos
          </Link>
        )}

        {etapa < ETAPAS.length - 1 ? (
          <GlassButton onClick={avancar}>
            Proximo <ArrowRight className="h-4 w-4" />
          </GlassButton>
        ) : (
          <div className="w-full sm:w-auto sm:min-w-64">
            <FormSubmitButton pendingText="Criando seu acesso...">Comecar 30 dias gratis</FormSubmitButton>
          </div>
        )}
      </div>
    </form>
  );
}

function Stepper({ etapa }: { etapa: number }) {
  return (
    <div aria-label={`Etapa ${etapa + 1} de ${ETAPAS.length}`}>
      <div className="h-1 overflow-hidden rounded-full bg-border">
        <div className="h-full bg-cyan-400 transition-[width] duration-300" style={{ width: `${((etapa + 1) / ETAPAS.length) * 100}%` }} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase text-cyan-300">Etapa {etapa + 1} de {ETAPAS.length}</p>
        <p className="text-sm font-medium text-foreground">{ETAPAS[etapa]}</p>
      </div>
    </div>
  );
}

function Campo({ className, label, name, ...props }: React.ComponentProps<typeof GlassInput> & { label: string; name: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={name}>{label} *</Label>
      <GlassInput id={name} name={name} required {...props} />
    </div>
  );
}

function Selecao({ children, defaultValue, label, name }: { children: React.ReactNode; defaultValue: string; label: string; name: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label} *</Label>
      <select className="glass-input h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground" defaultValue={defaultValue} id={name} name={name} required>
        {children}
      </select>
    </div>
  );
}

function ResumoPlano({ plano }: { plano: PlanoCadastro }) {
  return (
    <GlassCard className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
      <div>
        <p className="text-xs font-semibold uppercase text-cyan-300">Plano selecionado</p>
        <h2 className="mt-1 text-xl font-semibold text-foreground">{plano.nome}</h2>
        <p className="mt-1 text-sm text-muted-foreground">Ate {plano.limiteCasas} casa(s)</p>
      </div>
      <div className="text-left sm:text-right">
        <p className="text-xl font-semibold text-foreground">{formatarMoeda(plano.precoMensal)}/mes</p>
        <p className="text-xs text-muted-foreground">ou {formatarMoeda(plano.precoAnual)}/ano</p>
      </div>
    </GlassCard>
  );
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", { currency: "BRL", maximumFractionDigits: 0, style: "currency" }).format(valor);
}

function mascararTelefone(valor: string) {
  const numeros = valor.replace(/\D/g, "").slice(0, 11);
  if (numeros.length <= 2) return numeros ? `(${numeros}` : "";
  if (numeros.length <= 6) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
  const corte = numeros.length === 11 ? 7 : 6;
  return `(${numeros.slice(0, 2)}) ${numeros.slice(2, corte)}-${numeros.slice(corte)}`;
}
