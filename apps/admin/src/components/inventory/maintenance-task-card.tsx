import type { ProfileRow, PropertyRow } from "@hospedex/types";
import { ListChecks, Pencil, Wrench } from "lucide-react";

import { Badge, Button, Card, CardContent, Label } from "@hospedex/ui";

import { EntityModal } from "../management/entity-modal";
import { alterarStatusManutencaoAction } from "../../lib/inventory/actions";
import {
  LABEL_PRIORIDADE_MANUTENCAO,
  LABEL_STATUS_MANUTENCAO,
  LABEL_TIPO_MANUTENCAO,
  STATUS_MANUTENCAO,
  type ItemInventarioCompleto,
  type TarefaManutencaoCompleta,
} from "../../lib/inventory/types";
import { MaintenanceTaskForm } from "./maintenance-task-form";

/**
 * Card de agenda de manutencao.
 *
 * Concluir/cancelar altera apenas a tarefa; custos e financeiro ficam para uma
 * etapa futura conforme planejado no metadata.
 */

export type MaintenanceTaskCardProps = {
  itens: ItemInventarioCompleto[];
  podeGerenciar: boolean;
  propriedades: PropertyRow[];
  responsaveis: ProfileRow[];
  tarefa: TarefaManutencaoCompleta;
};

const campoClasse =
  "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export function MaintenanceTaskCard({
  itens,
  podeGerenciar,
  propriedades,
  responsaveis,
  tarefa,
}: MaintenanceTaskCardProps) {
  return (
    <Card className="admin-glass-card">
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Wrench className="h-4 w-4 text-primary" />
              <h2 className="truncate text-lg font-semibold">{tarefa.title}</h2>
              <Badge variant={obterVariantPrioridade(tarefa.priority)}>
                {LABEL_PRIORIDADE_MANUTENCAO[tarefa.priority]}
              </Badge>
              <Badge
                variant={
                  tarefa.status === "completed"
                    ? "success"
                    : tarefa.status === "cancelled"
                      ? "warning"
                      : "info"
                }
              >
                {LABEL_STATUS_MANUTENCAO[tarefa.status]}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {tarefa.propriedade?.name ?? "Propriedade"}
            </p>
          </div>
        </div>

        <section className="grid gap-3 md:grid-cols-4">
          <Info
            label="Tipo"
            valor={LABEL_TIPO_MANUTENCAO[tarefa.maintenance_type]}
          />
          <Info
            label="Data prevista"
            valor={
              tarefa.scheduled_for
                ? formatarData(tarefa.scheduled_for)
                : "Sem data"
            }
          />
          <Info label="Item" valor={tarefa.item?.name ?? "Sem item"} />
          <Info
            label="Responsavel"
            valor={
              tarefa.responsavel?.full_name ??
              tarefa.responsavel?.email ??
              "Sem responsavel"
            }
          />
        </section>

        {tarefa.notes ? (
          <p className="rounded-lg border bg-background/45 p-3 text-sm text-muted-foreground">
            {tarefa.notes}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <EntityModal
            description="Atualize prioridade, responsável, item e data prevista."
            disabled={!podeGerenciar}
            eyebrow="Edição"
            title="Editar manutenção"
            triggerIcon={<Pencil className="h-4 w-4" />}
            triggerLabel="Editar"
          >
            <MaintenanceTaskForm
              itens={itens}
              modo="editar"
              podeGerenciar={podeGerenciar}
              propriedades={propriedades}
              responsaveis={responsaveis}
              tarefa={tarefa}
            />
          </EntityModal>

          <EntityModal
            description="Conclua ou cancele a manutenção sem abrir a lista."
            disabled={!podeGerenciar}
            eyebrow="Status"
            title="Concluir ou cancelar"
            triggerIcon={<ListChecks className="h-4 w-4" />}
            triggerLabel="Status"
          >
            <form action={alterarStatusManutencaoAction} className="grid gap-3">
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
                  {STATUS_MANUTENCAO.map((status) => (
                    <option key={status} value={status}>
                      {LABEL_STATUS_MANUTENCAO[status]}
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

function obterVariantPrioridade(
  prioridade: TarefaManutencaoCompleta["priority"],
) {
  if (prioridade === "urgent" || prioridade === "high") return "warning";
  if (prioridade === "medium") return "info";
  return "outline";
}

function formatarData(valor: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: "UTC",
  }).format(new Date(`${valor}T00:00:00Z`));
}
