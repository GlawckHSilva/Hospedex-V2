import type { PropertyRow, UnitRow } from "@hospedex/types";
import { Button, Input, Label } from "@hospedex/ui";
import type { ComponentProps } from "react";

import {
  atualizarItemInventarioAction,
  criarItemInventarioAction
} from "../../lib/inventory/actions";
import {
  CATEGORIAS_INVENTARIO,
  ESTADOS_CONSERVACAO,
  LABEL_CATEGORIA_INVENTARIO,
  LABEL_ESTADO_CONSERVACAO,
  type ItemInventarioCompleto
} from "../../lib/inventory/types";

/**
 * Formulario de item de inventario.
 *
 * O formulario envia apenas dados do item. Tenant e owner sao resolvidos nas
 * server actions para impedir cadastro fora do cliente autenticado.
 */

export type InventoryItemFormProps = {
  item?: ItemInventarioCompleto;
  modo: "criar" | "editar";
  podeGerenciar: boolean;
  propriedades: PropertyRow[];
  unidades: UnitRow[];
};

const campoClasse =
  "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
const areaClasse =
  "min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export function InventoryItemForm({
  item,
  modo,
  podeGerenciar,
  propriedades,
  unidades
}: InventoryItemFormProps) {
  const action = modo === "editar" ? atualizarItemInventarioAction : criarItemInventarioAction;
  const bloqueado = !podeGerenciar || propriedades.length === 0;

  return (
    <form action={action} className="grid gap-4">
      {item ? <input name="itemId" type="hidden" value={item.id} /> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <CampoTexto
          defaultValue={item?.name ?? ""}
          disabled={bloqueado}
          label="Nome"
          name="name"
          required
        />
        <CampoSelect
          defaultValue={item?.category ?? "other"}
          disabled={bloqueado}
          label="Categoria"
          name="category"
          opcoes={CATEGORIAS_INVENTARIO.map((valor) => ({
            label: LABEL_CATEGORIA_INVENTARIO[valor],
            value: valor
          }))}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <CampoPropriedade
          defaultValue={item?.property_id ?? propriedades[0]?.id ?? ""}
          disabled={bloqueado}
          propriedades={propriedades}
        />
        <CampoUnidade
          defaultValue={item?.unit_id ?? ""}
          disabled={bloqueado}
          unidades={unidades}
        />
        <CampoSelect
          defaultValue={item?.conservation_state ?? "good"}
          disabled={bloqueado}
          label="Estado"
          name="conservationState"
          opcoes={ESTADOS_CONSERVACAO.map((valor) => ({
            label: LABEL_ESTADO_CONSERVACAO[valor],
            value: valor
          }))}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <CampoTexto
          defaultValue={String(item?.quantity ?? 1)}
          disabled={bloqueado}
          label="Quantidade"
          min={0}
          name="quantity"
          required
          type="number"
        />
        <CampoTexto
          defaultValue={String(item?.estimated_value ?? 0)}
          disabled={bloqueado}
          label="Valor estimado"
          min={0}
          name="estimatedValue"
          required
          step="0.01"
          type="number"
        />
        <CampoTexto
          defaultValue={item?.image_url ?? ""}
          disabled={bloqueado}
          label="URL da foto"
          name="imageUrl"
          type="url"
        />
      </div>

      <CampoArea
        defaultValue={item?.notes ?? ""}
        disabled={bloqueado}
        label="Observacoes"
        name="notes"
      />

      <div className="flex justify-end">
        <Button disabled={bloqueado} type="submit">
          {modo === "editar" ? "Salvar item" : "Criar item"}
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

function CampoArea({
  defaultValue,
  disabled,
  label,
  name
}: {
  defaultValue: string;
  disabled: boolean;
  label: string;
  name: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <textarea
        className={areaClasse}
        defaultValue={defaultValue}
        disabled={disabled}
        id={name}
        name={name}
      />
    </div>
  );
}

function CampoSelect({
  defaultValue,
  disabled,
  label,
  name,
  opcoes
}: {
  defaultValue: string;
  disabled: boolean;
  label: string;
  name: string;
  opcoes: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <select className={campoClasse} defaultValue={defaultValue} disabled={disabled} id={name} name={name}>
        {opcoes.map((opcao) => (
          <option key={opcao.value} value={opcao.value}>
            {opcao.label}
          </option>
        ))}
      </select>
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
  propriedades: PropertyRow[];
}) {
  return (
    <CampoSelect
      defaultValue={defaultValue}
      disabled={disabled}
      label="Propriedade"
      name="propertyId"
      opcoes={propriedades.map((propriedade) => ({
        label: propriedade.name,
        value: propriedade.id
      }))}
    />
  );
}

function CampoUnidade({
  defaultValue,
  disabled,
  unidades
}: {
  defaultValue: string;
  disabled: boolean;
  unidades: UnitRow[];
}) {
  return (
    <CampoSelect
      defaultValue={defaultValue}
      disabled={disabled}
      label="Unidade"
      name="unitId"
      opcoes={[
        { label: "Sem unidade especifica", value: "" },
        ...unidades.map((unidade) => ({ label: unidade.name, value: unidade.id }))
      ]}
    />
  );
}
