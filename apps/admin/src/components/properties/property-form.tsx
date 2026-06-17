"use client";

import type { PropertyStatus, PropertyType } from "@hospedex/types";
import { Button, Input, Label } from "@hospedex/ui";
import type { ComponentProps } from "react";
import { useState } from "react";

import {
  atualizarPropriedadeAction,
  criarPropriedadeAction
} from "../../lib/properties/actions";
import type { PropriedadeComRelacionamentos } from "../../lib/properties/types";
import {
  TAMANHO_MAXIMO_IMAGEM_PROPRIEDADE_BYTES,
  TAMANHO_MAXIMO_IMAGEM_PROPRIEDADE_MB,
  tipoImagemPropriedadePermitido
} from "../../lib/properties/media-limits";

/**
 * Formulário de propriedade.
 *
 * Mantém apenas os campos iniciais da V2. Regras de tenant, owner e limite do
 * plano ficam nas server actions para evitar confiar em dados do navegador.
 */

export type PropertyFormProps = {
  modo: "criar" | "editar";
  multiUnidadesAtivo: boolean;
  podeGerenciar: boolean;
  propriedade?: PropriedadeComRelacionamentos;
};

const TIPOS: Array<{ valor: PropertyType; label: string }> = [
  { valor: "seasonal_home", label: "Casa de temporada" },
  { valor: "inn", label: "Pousada" },
  { valor: "small_hotel", label: "Pequeno hotel" }
];

const STATUS: Array<{ valor: PropertyStatus; label: string }> = [
  { valor: "draft", label: "Rascunho" },
  { valor: "published", label: "Ativa" },
  { valor: "paused", label: "Pausada" }
];

const campoClasse =
  "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
const areaClasse =
  "min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export function PropertyForm({
  modo,
  multiUnidadesAtivo,
  podeGerenciar,
  propriedade
}: PropertyFormProps) {
  const action = modo === "editar" ? atualizarPropriedadeAction : criarPropriedadeAction;
  const endereco = propriedade?.enderecoFormatado;
  const unidadeCasa = propriedade?.unidades[0];
  const [erroImagem, setErroImagem] = useState<string | null>(null);
  const bloqueado = !podeGerenciar || Boolean(erroImagem);

  function validarImagemSelecionada(arquivo?: File) {
    if (!arquivo) {
      setErroImagem(null);
      return;
    }

    if (!tipoImagemPropriedadePermitido(arquivo.type)) {
      setErroImagem("Use uma imagem JPG, PNG, WebP ou GIF.");
      return;
    }

    if (arquivo.size > TAMANHO_MAXIMO_IMAGEM_PROPRIEDADE_BYTES) {
      setErroImagem(`A imagem deve ter no maximo ${TAMANHO_MAXIMO_IMAGEM_PROPRIEDADE_MB}MB.`);
      return;
    }

    setErroImagem(null);
  }

  return (
    <form action={action} className="grid gap-4">
      {propriedade ? (
        <input name="propriedadeId" type="hidden" value={propriedade.id} />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <CampoTexto
          defaultValue={propriedade?.name}
          disabled={!podeGerenciar}
          label="Nome"
          name="nome"
          required
        />
        <CampoSelect
          defaultValue={propriedade?.property_type ?? "seasonal_home"}
          disabled={!podeGerenciar}
          label="Tipo"
          name="tipo"
          options={TIPOS}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${modo}-descricao`}>Descrição</Label>
        <textarea
          className={areaClasse}
          defaultValue={propriedade?.description ?? ""}
          disabled={!podeGerenciar}
          id={`${modo}-descricao`}
          name="descricao"
          placeholder="Resumo curto para operação interna."
        />
      </div>

      <div className="grid gap-4 md:grid-cols-[1.4fr_0.8fr_0.5fr]">
        <CampoTexto
          defaultValue={endereco?.linha1}
          disabled={!podeGerenciar}
          label="Endereço"
          name="endereco"
          required
        />
        <CampoTexto
          defaultValue={endereco?.cidade}
          disabled={!podeGerenciar}
          label="Cidade"
          name="cidade"
          required
        />
        <CampoTexto
          defaultValue={endereco?.estado}
          disabled={!podeGerenciar}
          label="Estado"
          maxLength={2}
          name="estado"
          required
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <CampoSelect
          defaultValue={propriedade?.status ?? "draft"}
          disabled={!podeGerenciar}
          label="Status"
          name="status"
          options={STATUS}
        />
        <CampoTexto
          accept="image/*"
          disabled={!podeGerenciar}
          label="Imagem de capa"
          name="imagemCapaArquivo"
          onChange={(evento) => validarImagemSelecionada(evento.currentTarget.files?.[0])}
          type="file"
        />
      </div>

      {!multiUnidadesAtivo ? (
        <div className="grid gap-4 md:grid-cols-3">
          <CampoTexto
            defaultValue={String(unidadeCasa?.capacity ?? 1)}
            disabled={!podeGerenciar}
            label="Capacidade da casa"
            min={1}
            name="capacidadeCasa"
            required
            type="number"
          />
          <CampoTexto
            defaultValue={String(unidadeCasa?.bedrooms ?? 0)}
            disabled={!podeGerenciar}
            label="Quartos"
            min={0}
            name="quartosCasa"
            required
            type="number"
          />
          <CampoTexto
            defaultValue={String(unidadeCasa?.beds ?? 1)}
            disabled={!podeGerenciar}
            label="Camas"
            min={1}
            name="camasCasa"
            required
            type="number"
          />
          <CampoTexto
            defaultValue={String(unidadeCasa?.bathrooms ?? 0)}
            disabled={!podeGerenciar}
            label="Banheiros"
            min={0}
            name="banheirosCasa"
            required
            type="number"
          />
          <CampoTexto
            defaultValue={String(unidadeCasa?.base_price ?? 0)}
            disabled={!podeGerenciar}
            label="Valor base"
            min={0}
            name="valorBaseCasa"
            required
            step="0.01"
            type="number"
          />
        </div>
      ) : null}
      {erroImagem ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {erroImagem}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button disabled={bloqueado} type="submit">
          {modo === "editar" ? "Salvar propriedade" : "Criar propriedade"}
        </Button>
      </div>
    </form>
  );
}

function CampoTexto({
  label,
  name,
  ...props
}: {
  label: string;
  name: string;
} & ComponentProps<typeof Input>) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} {...props} />
    </div>
  );
}

function CampoSelect({
  defaultValue,
  disabled,
  label,
  name,
  options
}: {
  defaultValue: string;
  disabled: boolean;
  label: string;
  name: string;
  options: Array<{ valor: string; label: string }>;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <select
        className={campoClasse}
        defaultValue={defaultValue}
        disabled={disabled}
        id={name}
        name={name}
      >
        {options.map((option) => (
          <option key={option.valor} value={option.valor}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
