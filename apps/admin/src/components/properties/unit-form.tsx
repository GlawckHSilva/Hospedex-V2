import type { UnitStatus } from "@hospedex/types";
import { Button, Input, Label } from "@hospedex/ui";
import type { ComponentProps } from "react";

import {
  atualizarUnidadeAction,
  criarUnidadeAction
} from "../../lib/properties/actions";
import type {
  PropriedadeComRelacionamentos,
  UnidadeComCategoria
} from "../../lib/properties/types";

/**
 * Formulário de unidade.
 *
 * A unidade sempre aponta para uma propriedade do tenant. Categorias são criadas
 * de forma simples para preparar pousadas e pequenos hotéis sem abrir CRUD próprio.
 */

export type UnitFormProps = {
  modo: "criar" | "editar";
  podeGerenciar: boolean;
  propriedades: PropriedadeComRelacionamentos[];
  retorno: "/propriedades" | "/unidades";
  propriedadeInicialId?: string;
  unidade?: UnidadeComCategoria;
};

const STATUS: Array<{ valor: UnitStatus; label: string }> = [
  { valor: "active", label: "Ativa" },
  { valor: "inactive", label: "Pausada" },
  { valor: "maintenance", label: "Manutenção" }
];

const CATEGORIAS = ["Standard", "Luxo", "Master"];

const campoClasse =
  "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export function UnitForm({
  modo,
  podeGerenciar,
  propriedades,
  retorno,
  propriedadeInicialId,
  unidade
}: UnitFormProps) {
  const action = modo === "editar" ? atualizarUnidadeAction : criarUnidadeAction;
  const propriedadeSelecionada =
    unidade?.property_id ?? propriedadeInicialId ?? propriedades[0]?.id ?? "";
  const bloqueado = !podeGerenciar || propriedades.length === 0;

  return (
    <form action={action} className="grid gap-4">
      <input name="retorno" type="hidden" value={retorno} />
      {unidade ? <input name="unidadeId" type="hidden" value={unidade.id} /> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <CampoTexto
          defaultValue={unidade?.name}
          disabled={bloqueado}
          label="Nome"
          name="nome"
          required
        />
        <CampoTexto
          defaultValue={normalizarCategoria(unidade?.categoria?.name)}
          disabled={bloqueado}
          label="Categoria"
          list="categorias-unidade"
          name="categoria"
          placeholder="Ex.: Suíte standard"
          required
        />
        <datalist id="categorias-unidade">
          {CATEGORIAS.map((categoria) => (
            <option key={categoria} value={categoria} />
          ))}
        </datalist>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <CampoPropriedade
          defaultValue={propriedadeSelecionada}
          disabled={bloqueado}
          propriedades={propriedades}
        />
        <CampoStatus defaultValue={unidade?.status ?? "active"} disabled={bloqueado} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <CampoTexto
          defaultValue={String(unidade?.capacity ?? 1)}
          disabled={bloqueado}
          label="Capacidade"
          min={1}
          name="capacidade"
          required
          type="number"
        />
        <CampoTexto
          defaultValue={String(unidade?.bedrooms ?? 0)}
          disabled={bloqueado}
          label="Quartos"
          min={0}
          name="quartos"
          required
          type="number"
        />
        <CampoTexto
          defaultValue={String(unidade?.beds ?? 1)}
          disabled={bloqueado}
          label="Camas"
          min={1}
          name="camas"
          required
          type="number"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <CampoTexto
          defaultValue={String(unidade?.bathrooms ?? 0)}
          disabled={bloqueado}
          label="Banheiros"
          min={0}
          name="banheiros"
          required
          type="number"
        />
        <CampoTexto
          defaultValue={String(unidade?.base_price ?? 0)}
          disabled={bloqueado}
          label="Valor base"
          min={0}
          name="valorBase"
          required
          step="0.01"
          type="number"
        />
      </div>

      <div className="flex justify-end">
        <Button disabled={bloqueado} type="submit">
          {modo === "editar" ? "Salvar unidade" : "Criar unidade"}
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

function CampoPropriedade({
  defaultValue,
  disabled,
  propriedades
}: {
  defaultValue: string;
  disabled: boolean;
  propriedades: PropriedadeComRelacionamentos[];
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="propriedadeId">Propriedade</Label>
      <select
        className={campoClasse}
        defaultValue={defaultValue}
        disabled={disabled}
        id="propriedadeId"
        name="propriedadeId"
      >
        {propriedades.map((propriedade) => (
          <option key={propriedade.id} value={propriedade.id}>
            {propriedade.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function CampoStatus({ defaultValue, disabled }: { defaultValue: UnitStatus; disabled: boolean }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="status">Status</Label>
      <select
        className={campoClasse}
        defaultValue={defaultValue}
        disabled={disabled}
        id="status"
        name="status"
      >
        {STATUS.map((status) => (
          <option key={status.valor} value={status.valor}>
            {status.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function normalizarCategoria(categoria?: string | null): string {
  return categoria && CATEGORIAS.includes(categoria) ? categoria : "Standard";
}
