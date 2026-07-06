"use client";

import { Building2, Mail, MapPin, Phone, Save } from "lucide-react";
import {
  type FormEvent,
  type MouseEvent,
  type ReactNode,
  type Ref,
  useMemo,
  useRef,
  useState,
} from "react";

import { Button, Input, Label } from "@hospedex/ui";

import { FormSubmitButton } from "../management/form-submit-button";
import type { DadosConfiguracoesGerenciamento } from "../../lib/settings/types";
import { LogoUploadField } from "./logo-upload-field";

type ConfiguracoesGerais = DadosConfiguracoesGerenciamento["configuracoes"];

const LIMITE_DESCRICAO_CURTA = 160;

const UFS = [
  ["AC", "Acre"],
  ["AL", "Alagoas"],
  ["AP", "Amapa"],
  ["AM", "Amazonas"],
  ["BA", "Bahia"],
  ["CE", "Ceara"],
  ["DF", "Distrito Federal"],
  ["ES", "Espirito Santo"],
  ["GO", "Goias"],
  ["MA", "Maranhao"],
  ["MT", "Mato Grosso"],
  ["MS", "Mato Grosso do Sul"],
  ["MG", "Minas Gerais"],
  ["PA", "Para"],
  ["PB", "Paraiba"],
  ["PR", "Parana"],
  ["PE", "Pernambuco"],
  ["PI", "Piaui"],
  ["RJ", "Rio de Janeiro"],
  ["RN", "Rio Grande do Norte"],
  ["RS", "Rio Grande do Sul"],
  ["RO", "Rondonia"],
  ["RR", "Roraima"],
  ["SC", "Santa Catarina"],
  ["SP", "Sao Paulo"],
  ["SE", "Sergipe"],
  ["TO", "Tocantins"],
] as const;

export function GeneralSettingsForm({
  action,
  configuracoes,
  podeGerenciarConfiguracoes,
}: {
  action: (formData: FormData) => void | Promise<void>;
  configuracoes: ConfiguracoesGerais;
  podeGerenciarConfiguracoes: boolean;
}) {
  const telefoneRef = useRef<HTMLInputElement | null>(null);
  const whatsappRef = useRef<HTMLInputElement | null>(null);
  const [telefone, setTelefone] = useState(mascararTelefone(configuracoes.phone ?? ""));
  const [whatsapp, setWhatsapp] = useState(mascararTelefone(configuracoes.whatsapp ?? ""));
  const [descricao, setDescricao] = useState(configuracoes.short_description ?? "");
  const [usarTelefoneNoWhatsapp, setUsarTelefoneNoWhatsapp] = useState(
    Boolean(telefone) && somenteNumeros(telefone) === somenteNumeros(whatsapp)
  );
  const [submetendo, setSubmetendo] = useState(false);
  const [erroContato, setErroContato] = useState<string | null>(null);

  const bloqueado = !podeGerenciarConfiguracoes || submetendo;
  const contadorDescricao = useMemo(
    () => `${descricao.length}/${LIMITE_DESCRICAO_CURTA}`,
    [descricao.length]
  );

  function atualizarTelefone(valor: string) {
    const mascarado = mascararTelefone(valor);
    setTelefone(mascarado);
    if (usarTelefoneNoWhatsapp) setWhatsapp(mascarado);
  }

  function atualizarUsoMesmoNumero(marcado: boolean) {
    setUsarTelefoneNoWhatsapp(marcado);
    if (marcado) setWhatsapp(telefone);
  }

  function validarAntesDeSalvar(evento: FormEvent<HTMLFormElement>) {
    setErroContato(null);

    if (telefone && !telefoneValido(telefone)) {
      evento.preventDefault();
      setSubmetendo(false);
      setErroContato("Informe um número válido.");
      telefoneRef.current?.focus();
      return;
    }

    if (whatsapp && !telefoneValido(whatsapp)) {
      evento.preventDefault();
      setSubmetendo(false);
      setErroContato("Informe um número válido.");
      whatsappRef.current?.focus();
      return;
    }

    setSubmetendo(true);
  }

  return (
    <form
      action={action}
      className="grid gap-5"
      encType="multipart/form-data"
      onSubmit={validarAntesDeSalvar}
    >
      <SecaoModal
        descricao="Defina como seu empreendimento será identificado no Hospedex."
        icon={<Building2 />}
        titulo="Identidade"
      >
        <CampoTexto
          defaultValue={configuracoes.tenantName}
          disabled={bloqueado}
          label="Nome do empreendimento"
          name="tenantName"
          required
        />
        <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
          <LogoUploadField
            disabled={bloqueado}
            logoUrl={configuracoes.logo_url}
          />
          <CampoDescricao
            contador={contadorDescricao}
            disabled={bloqueado}
            value={descricao}
            onChange={setDescricao}
          />
        </div>
      </SecaoModal>

      <SecaoModal
        descricao="Esses contatos podem aparecer em reservas, comprovantes e comunicações com hóspedes."
        icon={<Phone />}
        titulo="Contato"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <CampoTexto
            disabled={bloqueado}
            label="Telefone"
            name="phone"
            onChange={atualizarTelefone}
            placeholder="(43) 99810-8328"
            inputRef={telefoneRef}
            value={telefone}
          />
          <div className="grid gap-2">
            <CampoTexto
              disabled={bloqueado || usarTelefoneNoWhatsapp}
              label="WhatsApp"
              name="whatsapp"
              onChange={(valor) => setWhatsapp(mascararTelefone(valor))}
              placeholder="(43) 99810-8328"
              inputRef={whatsappRef}
              value={whatsapp}
            />
            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              <input
                checked={usarTelefoneNoWhatsapp}
                className="h-4 w-4 accent-cyan-400"
                disabled={bloqueado}
                onChange={(evento) =>
                  atualizarUsoMesmoNumero(evento.target.checked)
                }
                type="checkbox"
              />
              Usar o mesmo número do telefone no WhatsApp
            </label>
          </div>
          <CampoTexto
            defaultValue={configuracoes.email ?? ""}
            disabled={bloqueado}
            icon={<Mail />}
            label="E-mail"
            name="email"
            type="email"
          />
        </div>
        {erroContato ? (
          <p className="rounded-lg border border-red-300/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {erroContato}
          </p>
        ) : null}
      </SecaoModal>

      <SecaoModal
        descricao="Informe a localização principal do empreendimento."
        icon={<MapPin />}
        titulo="Localização"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <CampoTexto
            defaultValue={configuracoes.city ?? ""}
            disabled={bloqueado}
            label="Cidade"
            name="city"
          />
          <div className="grid gap-2">
            <Label htmlFor="state">Estado</Label>
            <select
              className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              defaultValue={configuracoes.state ?? ""}
              disabled={bloqueado}
              id="state"
              name="state"
            >
              <option value="">Selecione</option>
              {UFS.map(([uf, nome]) => (
                <option key={uf} value={uf}>
                  {uf} - {nome}
                </option>
              ))}
            </select>
          </div>
        </div>
      </SecaoModal>

      <div className="sticky bottom-0 z-10 -mx-1 flex items-center justify-between gap-3 border-t bg-background/95 p-3 backdrop-blur">
        <Button
          disabled={submetendo}
          onClick={fecharModalAtual}
          type="button"
          variant="outline"
        >
          Cancelar
        </Button>
        <FormSubmitButton
          disabled={!podeGerenciarConfiguracoes}
          pendingLabel="Salvando..."
          variant="default"
        >
          <Save className="h-4 w-4" />
          Salvar alterações
        </FormSubmitButton>
      </div>
    </form>
  );
}

function SecaoModal({
  children,
  descricao,
  icon,
  titulo,
}: {
  children: ReactNode;
  descricao: string;
  icon: ReactNode;
  titulo: string;
}) {
  return (
    <section className="grid gap-4 rounded-2xl border bg-background/45 p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-cyan-500/15 text-cyan-200 [&_svg]:h-4 [&_svg]:w-4">
          {icon}
        </span>
        <div>
          <h3 className="text-sm font-semibold">{titulo}</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {descricao}
          </p>
        </div>
      </div>
      {children}
    </section>
  );
}

function CampoTexto({
  defaultValue,
  disabled,
  icon,
  inputRef,
  label,
  name,
  onChange,
  placeholder,
  required,
  type = "text",
  value,
}: {
  defaultValue?: string;
  disabled?: boolean;
  icon?: ReactNode;
  inputRef?: Ref<HTMLInputElement>;
  label: string;
  name: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  value?: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <div className="relative">
        {icon ? (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg]:h-4 [&_svg]:w-4">
            {icon}
          </span>
        ) : null}
        <Input
          className={icon ? "pl-9" : undefined}
          defaultValue={value === undefined ? defaultValue : undefined}
          disabled={disabled}
          id={name}
          name={name}
          onChange={onChange ? (evento) => onChange(evento.target.value) : undefined}
          placeholder={placeholder}
          ref={inputRef}
          required={required}
          type={type}
          value={value}
        />
      </div>
    </div>
  );
}

function CampoDescricao({
  contador,
  disabled,
  onChange,
  value,
}: {
  contador: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="shortDescription">Descrição curta</Label>
        <span className="text-xs text-muted-foreground">{contador}</span>
      </div>
      <textarea
        className="min-h-32 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        id="shortDescription"
        maxLength={LIMITE_DESCRICAO_CURTA}
        name="shortDescription"
        onChange={(evento) => onChange(evento.target.value)}
        placeholder="Ex: Casas de temporada em Manoel Ribas com atendimento direto pelo proprietário."
        value={value}
      />
      <p className="text-xs leading-5 text-muted-foreground">
        Resumo rápido sobre seu empreendimento. Pode aparecer em comprovantes,
        página pública e comunicações.
      </p>
    </div>
  );
}

function mascararTelefone(valor: string) {
  const numeros = somenteNumeros(valor).slice(0, 11);
  if (numeros.length <= 2) return numeros;
  if (numeros.length <= 6) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
  if (numeros.length <= 10) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
  }

  return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
}

function telefoneValido(valor: string) {
  const digitos = somenteNumeros(valor);
  return digitos.length >= 10 && digitos.length <= 11;
}

function somenteNumeros(valor: string) {
  return valor.replace(/\D/g, "");
}

function fecharModalAtual(evento: MouseEvent<HTMLButtonElement>) {
  evento.currentTarget
    .closest('[role="dialog"]')
    ?.querySelector<HTMLButtonElement>('[aria-label="Fechar modal"]')
    ?.click();
}
