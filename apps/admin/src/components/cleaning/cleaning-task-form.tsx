import type { ProfileRow, PropertyRow, ReservationRow } from "@hospedex/types";
import { Button, Input, Label } from "@hospedex/ui";
import type { ComponentProps } from "react";

import {
  atualizarTarefaLimpezaAction,
  criarTarefaLimpezaAction
} from "../../lib/cleaning/actions";
import {
  LABEL_STATUS_TAREFA_LIMPEZA,
  STATUS_TAREFA_LIMPEZA,
  type TarefaLimpezaCompleta
} from "../../lib/cleaning/types";

/**
 * Formulario reutilizavel de tarefa de limpeza.
 *
 * O formulario nao envia tenant/owner. Esses dados sao resolvidos nas actions
 * para impedir criacao ou edicao fora do tenant autenticado.
 */

export type CleaningTaskFormProps = {
  modo: "criar" | "editar";
  podeGerenciar: boolean;
  propriedades: PropertyRow[];
  reservas: ReservationRow[];
  responsaveis: ProfileRow[];
  tarefa?: TarefaLimpezaCompleta;
};

const campoClasse =
  "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
const areaClasse =
  "min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export function CleaningTaskForm({
  modo,
  podeGerenciar,
  propriedades,
  reservas,
  responsaveis,
  tarefa,
}: CleaningTaskFormProps) {
  const action = modo === "editar" ? atualizarTarefaLimpezaAction : criarTarefaLimpezaAction;
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
        <CampoStatus defaultValue={tarefa?.status ?? "awaiting_cleaning"} disabled={bloqueado} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <CampoPropriedade
          defaultValue={tarefa?.property_id ?? propriedades[0]?.id ?? ""}
          disabled={bloqueado}
          propriedades={propriedades}
        />
        <CampoTexto
          defaultValue={tarefa?.scheduled_for ?? ""}
          disabled={bloqueado}
          label="Data prevista"
          name="scheduledFor"
          type="date"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <CampoReserva
          defaultValue={tarefa?.reservation_id ?? ""}
          disabled={bloqueado}
          reservas={reservas}
        />
        <CampoResponsavel
          defaultValue={tarefa?.assigned_to ?? ""}
          disabled={bloqueado}
          responsaveis={responsaveis}
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
          {modo === "editar" ? "Salvar tarefa" : "Criar tarefa"}
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
  defaultValue?: string;
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

function CampoStatus({ defaultValue, disabled }: { defaultValue: string; disabled: boolean }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="status">Status</Label>
      <select className={campoClasse} defaultValue={defaultValue} disabled={disabled} id="status" name="status">
        {STATUS_TAREFA_LIMPEZA.map((status) => (
          <option key={status} value={status}>
            {LABEL_STATUS_TAREFA_LIMPEZA[status]}
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
    <div className="grid gap-2">
      <Label htmlFor="propertyId">Propriedade</Label>
      <select className={campoClasse} defaultValue={defaultValue} disabled={disabled} id="propertyId" name="propertyId">
        {propriedades.map((propriedade) => (
          <option key={propriedade.id} value={propriedade.id}>
            {propriedade.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function CampoReserva({
  defaultValue,
  disabled,
  reservas
}: {
  defaultValue: string;
  disabled: boolean;
  reservas: ReservationRow[];
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="reservationId">Reserva</Label>
      <select className={campoClasse} defaultValue={defaultValue} disabled={disabled} id="reservationId" name="reservationId">
        <option value="">Sem reserva vinculada</option>
        {reservas.map((reserva) => (
          <option key={reserva.id} value={reserva.id}>
            {reserva.code}
          </option>
        ))}
      </select>
    </div>
  );
}

function CampoResponsavel({
  defaultValue,
  disabled,
  responsaveis
}: {
  defaultValue: string;
  disabled: boolean;
  responsaveis: ProfileRow[];
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="assignedTo">Responsavel</Label>
      <select className={campoClasse} defaultValue={defaultValue} disabled={disabled} id="assignedTo" name="assignedTo">
        <option value="">Sem responsavel</option>
        {responsaveis.map((responsavel) => (
          <option key={responsavel.id} value={responsavel.id}>
            {responsavel.full_name ?? responsavel.email}
          </option>
        ))}
      </select>
    </div>
  );
}
