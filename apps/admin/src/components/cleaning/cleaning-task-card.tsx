import type {
  ProfileRow,
  PropertyRow,
  ReservationRow,
  UnitRow,
} from "@hospedex/types";
import { ClipboardCheck, Eye, Pencil } from "lucide-react";

import { Badge } from "@hospedex/ui";

import {
  EntityCard,
  EntityCardActions,
  EntityCardHeader,
} from "../management/entity-card";
import { EntityModal, EntityViewModal } from "../management/entity-modal";
import {
  LABEL_STATUS_TAREFA_LIMPEZA,
  type TarefaLimpezaCompleta,
} from "../../lib/cleaning/types";
import { CleaningTaskForm } from "./cleaning-task-form";

/**
 * Card compacto de limpeza.
 */
export type CleaningTaskCardProps = {
  podeGerenciar: boolean;
  propriedades: PropertyRow[];
  reservas: ReservationRow[];
  responsaveis: ProfileRow[];
  tarefa: TarefaLimpezaCompleta;
  unidades: UnitRow[];
};

export function CleaningTaskCard({
  podeGerenciar,
  propriedades,
  reservas,
  responsaveis,
  tarefa,
  unidades,
}: CleaningTaskCardProps) {
  const responsavel =
    tarefa.responsavel?.full_name ?? tarefa.responsavel?.email ?? "Sem responsavel";

  return (
    <EntityCard>
      <EntityCardHeader
        badges={
          <Badge variant={obterVariant(tarefa.status)}>
            {LABEL_STATUS_TAREFA_LIMPEZA[tarefa.status]}
          </Badge>
        }
        icon={<ClipboardCheck />}
        subtitle={responsavel}
        title={tarefa.propriedade?.name ?? tarefa.title}
      />

      <div className="grid gap-3 text-sm">
        <Info label="Unidade" valor={tarefa.unidade?.name ?? "Unidade"} />
        <Info
          label="Data prevista"
          valor={tarefa.scheduled_for ? formatarData(tarefa.scheduled_for) : "Sem data"}
        />
      </div>

      <EntityCardActions>
        <EntityViewModal
          description="Detalhes da tarefa de limpeza."
          title={tarefa.title}
          triggerClassName="h-9 justify-center"
          triggerIcon={<Eye className="h-4 w-4" />}
          triggerLabel="Visualizar"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <Info label="Casa" valor={tarefa.propriedade?.name ?? "Propriedade"} />
            <Info label="Unidade" valor={tarefa.unidade?.name ?? "Unidade"} />
            <Info label="Responsavel" valor={responsavel} />
            <Info label="Status" valor={LABEL_STATUS_TAREFA_LIMPEZA[tarefa.status]} />
            <Info label="Origem" valor={tarefa.source === "checkout" ? "Check-out" : "Manual"} />
            <Info label="Reserva" valor={tarefa.reserva?.code ?? "Nao vinculada"} />
            <div className="md:col-span-2">
              <Info label="Observacoes" valor={tarefa.notes ?? "Sem observacoes"} />
            </div>
          </div>
        </EntityViewModal>

        <EntityModal
          description="Atualize data, responsavel, origem e vinculos da tarefa."
          disabled={!podeGerenciar}
          eyebrow="Limpeza"
          title="Editar tarefa"
          triggerClassName="h-9 justify-center"
          triggerIcon={<Pencil className="h-4 w-4" />}
          triggerLabel="Editar"
        >
          <CleaningTaskForm
            modo="editar"
            podeGerenciar={podeGerenciar}
            propriedades={propriedades}
            reservas={reservas}
            responsaveis={responsaveis}
            tarefa={tarefa}
            unidades={unidades}
          />
        </EntityModal>
      </EntityCardActions>
    </EntityCard>
  );
}

function Info({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-lg border bg-background/45 p-3 text-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-medium">{valor}</p>
    </div>
  );
}

function obterVariant(status: TarefaLimpezaCompleta["status"]) {
  if (status === "completed") return "success";
  if (status === "in_cleaning") return "info";
  if (status === "cancelled") return "warning";
  return "secondary";
}

function formatarData(valor: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: "UTC",
  }).format(new Date(`${valor}T00:00:00Z`));
}
