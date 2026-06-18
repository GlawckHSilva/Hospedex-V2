import type {
  ProfileRow,
  PropertyRow,
  ReservationRow,
  UnitRow,
} from "@hospedex/types";
import { ClipboardCheck, ListChecks, Pencil, UserRound } from "lucide-react";

import { Badge, Button, Card, CardContent, Label } from "@hospedex/ui";

import { EntityModal } from "../management/entity-modal";
import { alterarStatusTarefaLimpezaAction } from "../../lib/cleaning/actions";
import {
  LABEL_STATUS_TAREFA_LIMPEZA,
  STATUS_TAREFA_LIMPEZA,
  type TarefaLimpezaCompleta,
} from "../../lib/cleaning/types";
import { CleaningTaskForm } from "./cleaning-task-form";

/**
 * Card operacional de limpeza.
 *
 * Exibe dados essenciais e mantem mudancas de status no servidor para registrar
 * efeitos operacionais na unidade e timeline da reserva vinculada.
 */

export type CleaningTaskCardProps = {
  podeGerenciar: boolean;
  propriedades: PropertyRow[];
  reservas: ReservationRow[];
  responsaveis: ProfileRow[];
  tarefa: TarefaLimpezaCompleta;
  unidades: UnitRow[];
};

const campoClasse =
  "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export function CleaningTaskCard({
  podeGerenciar,
  propriedades,
  reservas,
  responsaveis,
  tarefa,
  unidades,
}: CleaningTaskCardProps) {
  return (
    <Card className="admin-glass-card">
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-primary" />
              <h2 className="truncate text-lg font-semibold">{tarefa.title}</h2>
              <Badge variant={obterVariant(tarefa.status)}>
                {LABEL_STATUS_TAREFA_LIMPEZA[tarefa.status]}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {tarefa.propriedade?.name ?? "Propriedade"} ·{" "}
              {tarefa.unidade?.name ?? "Unidade"}
            </p>
          </div>

          <div className="rounded-lg border bg-background/55 p-3 text-sm">
            <div className="mb-2 text-primary">
              <UserRound className="h-4 w-4" />
            </div>
            <p className="text-xs text-muted-foreground">Responsavel</p>
            <p className="truncate font-semibold">
              {tarefa.responsavel?.full_name ??
                tarefa.responsavel?.email ??
                "Sem responsavel"}
            </p>
          </div>
        </div>

        <section className="grid gap-3 md:grid-cols-3">
          <Info
            label="Data prevista"
            valor={
              tarefa.scheduled_for
                ? formatarData(tarefa.scheduled_for)
                : "Sem data"
            }
          />
          <Info
            label="Origem"
            valor={tarefa.source === "checkout" ? "Check-out" : "Manual"}
          />
          <Info
            label="Reserva"
            valor={tarefa.reserva?.code ?? "Nao vinculada"}
          />
        </section>

        {tarefa.notes ? (
          <p className="rounded-lg border bg-background/45 p-3 text-sm text-muted-foreground">
            {tarefa.notes}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <EntityModal
            description="Atualize data, responsavel, origem e vinculos da tarefa."
            disabled={!podeGerenciar}
            eyebrow="Limpeza"
            title="Editar tarefa"
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

          <EntityModal
            description="Atualize o status operacional da limpeza sem expandir o card."
            disabled={!podeGerenciar}
            eyebrow="Status"
            size="sm"
            title="Alterar status"
            triggerIcon={<ListChecks className="h-4 w-4" />}
            triggerLabel="Status"
          >
            <form
              action={alterarStatusTarefaLimpezaAction}
              className="grid gap-3"
            >
              <input name="tarefaId" type="hidden" value={tarefa.id} />
              <div className="grid gap-2">
                <Label htmlFor={`status-${tarefa.id}`}>Status</Label>
                <select
                  className={campoClasse}
                  defaultValue={tarefa.status}
                  disabled={!podeGerenciar}
                  id={`status-${tarefa.id}`}
                  name="status"
                >
                  {STATUS_TAREFA_LIMPEZA.map((status) => (
                    <option key={status} value={status}>
                      {LABEL_STATUS_TAREFA_LIMPEZA[status]}
                    </option>
                  ))}
                </select>
              </div>
              <Button disabled={!podeGerenciar} type="submit" variant="outline">
                Atualizar status
              </Button>
            </form>
          </EntityModal>
        </div>
      </CardContent>
    </Card>
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
