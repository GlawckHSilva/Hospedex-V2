import type { ProfileRow, PropertyRow } from "@hospedex/types";
import { Button, Input, Label } from "@hospedex/ui";
import type { ComponentProps } from "react";

import {
  atualizarTarefaManutencaoAction,
  criarTarefaManutencaoAction
} from "../../lib/inventory/actions";
import {
  LABEL_PRIORIDADE_MANUTENCAO,
  LABEL_STATUS_MANUTENCAO,
  LABEL_TIPO_MANUTENCAO,
  PRIORIDADES_MANUTENCAO,
  STATUS_MANUTENCAO,
  TIPOS_MANUTENCAO,
  type ItemInventarioCompleto,
  type TarefaManutencaoCompleta
} from "../../lib/inventory/types";

/**
 * Formulario de agenda de manutencao.
 *
 * Custos, fotos antes/depois e notificacoes ficam preparados no schema, mas nao
 * sao automatizados nesta etapa.
 */

export type MaintenanceTaskFormProps = {
  itens: ItemInventarioCompleto[];
  modo: "criar" | "editar";
  podeGerenciar: boolean;
  propriedades: PropertyRow[];
  responsaveis: ProfileRow[];
  tarefa?: TarefaManutencaoCompleta;
};

const campoClasse =
  "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
const areaClasse =
  "min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export function MaintenanceTaskForm({
  itens,
  modo,
  podeGerenciar,
  propriedades,
  responsaveis,
  tarefa,
}: MaintenanceTaskFormProps) {
  const action = modo === "editar" ? atualizarTarefaManutencaoAction : criarTarefaManutencaoAction;
  const bloqueado = !podeGerenciar || propriedades.length === 0;

  return (
    <form action={action} className="grid gap-4">
      {tarefa ? <input name="tarefaId" type="hidden" value={tarefa.id} /> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <CampoTexto
          defaultValue={tarefa?.title ?? ""}
          disabled={bloqueado}
          label="Titulo"
          name="title"
          required
        />
        <CampoSelect
          defaultValue={tarefa?.maintenance_type ?? "corrective"}
          disabled={bloqueado}
          label="Tipo"
          name="maintenanceType"
          opcoes={TIPOS_MANUTENCAO.map((valor) => ({
            label: LABEL_TIPO_MANUTENCAO[valor],
            value: valor
          }))}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <CampoSelect
          defaultValue={tarefa?.property_id ?? propriedades[0]?.id ?? ""}
          disabled={bloqueado}
          label="Propriedade"
          name="propertyId"
          opcoes={propriedades.map((propriedade) => ({
            label: propriedade.name,
            value: propriedade.id
          }))}
        />
        <CampoSelect
          defaultValue={tarefa?.inventory_item_id ?? ""}
          disabled={bloqueado}
          label="Item vinculado"
          name="inventoryItemId"
          opcoes={[
            { label: "Sem item vinculado", value: "" },
            ...itens.map((item) => ({ label: item.name, value: item.id }))
          ]}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <CampoSelect
          defaultValue={tarefa?.priority ?? "medium"}
          disabled={bloqueado}
          label="Prioridade"
          name="priority"
          opcoes={PRIORIDADES_MANUTENCAO.map((valor) => ({
            label: LABEL_PRIORIDADE_MANUTENCAO[valor],
            value: valor
          }))}
        />
        <CampoSelect
          defaultValue={tarefa?.status ?? "pending"}
          disabled={bloqueado}
          label="Status"
          name="status"
          opcoes={STATUS_MANUTENCAO.map((valor) => ({
            label: LABEL_STATUS_MANUTENCAO[valor],
            value: valor
          }))}
        />
        <CampoTexto
          defaultValue={tarefa?.scheduled_for ?? ""}
          disabled={bloqueado}
          label="Data prevista"
          name="scheduledFor"
          type="date"
        />
        <CampoSelect
          defaultValue={tarefa?.assigned_to ?? ""}
          disabled={bloqueado}
          label="Responsavel"
          name="assignedTo"
          opcoes={[
            { label: "Sem responsavel", value: "" },
            ...responsaveis.map((responsavel) => ({
              label: responsavel.full_name ?? responsavel.email,
              value: responsavel.id
            }))
          ]}
        />
      </div>

      <CampoArea
        defaultValue={tarefa?.notes ?? ""}
        disabled={bloqueado}
        label="Observacoes"
        name="notes"
      />

      <div className="flex justify-end">
        <Button disabled={bloqueado} type="submit">
          {modo === "editar" ? "Salvar manutencao" : "Criar manutencao"}
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
