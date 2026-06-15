import type { PropertyStatus, PropertyType } from "@hospedex/types";
import { Button, Input, Label } from "@hospedex/ui";
import type { ComponentProps } from "react";

import {
  atualizarPropriedadeAction,
  criarPropriedadeAction
} from "../../lib/properties/actions";
import type { PropriedadeComRelacionamentos } from "../../lib/properties/types";

/**
 * Formulário de propriedade.
 *
 * Mantém apenas os campos iniciais da V2. Regras de tenant, owner e limite do
 * plano ficam nas server actions para evitar confiar em dados do navegador.
 */

export type PropertyFormProps = {
  modo: "criar" | "editar";
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

export function PropertyForm({ modo, podeGerenciar, propriedade }: PropertyFormProps) {
  const action = modo === "editar" ? atualizarPropriedadeAction : criarPropriedadeAction;
  const endereco = propriedade?.enderecoFormatado;

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
          type="file"
        />
      </div>

      <div className="flex justify-end">
        <Button disabled={!podeGerenciar} type="submit">
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
