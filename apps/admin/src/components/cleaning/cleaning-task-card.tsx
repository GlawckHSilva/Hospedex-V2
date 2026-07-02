import type {
  ProfileRow,
  PropertyRow,
  ReservationRow,
} from "@hospedex/types";
import {
  Calendar,
  Check,
  Eye,
  MoreHorizontal,
  Pencil,
  UserRound,
} from "lucide-react";
import type { ReactNode } from "react";

import { Badge, Card, CardContent, cn } from "@hospedex/ui";

import { alterarStatusTarefaLimpezaAction } from "../../lib/cleaning/actions";
import {
  LABEL_STATUS_TAREFA_LIMPEZA,
  type TarefaLimpezaCompleta,
} from "../../lib/cleaning/types";
import { ActionButton } from "../management/action-button";
import { EntityModal, EntityViewModal } from "../management/entity-modal";
import { CleaningTaskForm } from "./cleaning-task-form";

/**
 * Card compacto de tarefa operacional.
 *
 * A UI permite acao rapida de conclusao, mas a alteracao real de status segue
 * pela server action para manter tenant, permissao e historico da reserva.
 */
export type CleaningTaskCardProps = {
  hoje: string;
  podeGerenciar: boolean;
  propriedades: PropertyRow[];
  reservas: ReservationRow[];
  responsaveis: ProfileRow[];
  tarefa: TarefaLimpezaCompleta;
};

export function CleaningTaskCard({
  hoje,
  podeGerenciar,
  propriedades,
  reservas,
  responsaveis,
  tarefa,
}: CleaningTaskCardProps) {
  const responsavel =
    tarefa.responsavel?.full_name ??
    tarefa.responsavel?.email ??
    "Nao definido";
  const atrasada = tarefaEhAtrasada(tarefa, hoje);
  const concluida = tarefa.status === "completed";

  return (
    <Card className={cn("admin-glass-card overflow-hidden", obterClasseBorda(tarefa, atrasada))}>
      <CardContent className="flex h-full flex-col gap-4 p-4">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge variant={obterVariant(tarefa.status, atrasada)}>
                {atrasada ? "Atrasada" : LABEL_STATUS_TAREFA_LIMPEZA[tarefa.status]}
              </Badge>
              <Badge variant="outline">
                {tarefa.source === "checkout" ? "Apos check-out" : "Manual"}
              </Badge>
            </div>
            <h3 className="truncate text-base font-semibold">
              {tarefa.propriedade?.name ?? tarefa.title}
            </h3>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {tarefa.title}
            </p>
          </div>
          <EntityViewModal
            description="Detalhes da tarefa de limpeza."
            title={tarefa.title}
            triggerClassName="h-9 w-9 px-0"
            triggerIcon={<MoreHorizontal className="h-4 w-4" />}
            triggerLabel=""
          >
            <div className="grid gap-3 md:grid-cols-2">
              <Info label="Casa" valor={tarefa.propriedade?.name ?? "Casa nao informada"} />
              <Info label="Responsavel" valor={responsavel} />
              <Info label="Status" valor={LABEL_STATUS_TAREFA_LIMPEZA[tarefa.status]} />
              <Info label="Origem" valor={tarefa.source === "checkout" ? "Check-out" : "Manual"} />
              <Info label="Reserva" valor={tarefa.reserva?.code ?? "Nao vinculada"} />
              <Info
                label="Data prevista"
                valor={tarefa.scheduled_for ? formatarData(tarefa.scheduled_for) : "Sem data"}
              />
              <div className="md:col-span-2">
                <Info label="Observacoes" valor={tarefa.notes ?? "Sem observacoes"} />
              </div>
            </div>
          </EntityViewModal>
        </header>

        <div className="grid gap-1.5 text-sm text-muted-foreground">
          <LinhaIcone
            icon={<Calendar />}
            texto={
              tarefa.scheduled_for
                ? `${formatarData(tarefa.scheduled_for)} - ${formatarOrigem(tarefa)}`
                : `Sem data - ${formatarOrigem(tarefa)}`
            }
          />
          <LinhaIcone icon={<UserRound />} texto={`Responsavel: ${responsavel}`} />
          {tarefa.completed_at ? (
            <LinhaIcone
              icon={<Check />}
              texto={`Concluida em ${formatarDataHora(tarefa.completed_at)}`}
            />
          ) : null}
        </div>

        <div className="mt-auto grid gap-2 sm:grid-cols-3">
          {!concluida && tarefa.status !== "cancelled" ? (
            <form action={alterarStatusTarefaLimpezaAction}>
              <input name="tarefaId" type="hidden" value={tarefa.id} />
              <input name="status" type="hidden" value="completed" />
              <ActionButton
                className="w-full"
                disabled={!podeGerenciar}
                icon={<Check />}
                type="submit"
                variant="add"
              >
                Concluir
              </ActionButton>
            </form>
          ) : (
            <ActionButton className="w-full" disabled icon={<Check />} variant="settings">
              Concluida
            </ActionButton>
          )}

          <EntityModal
            description="Atualize data, responsavel, origem e vinculos da tarefa."
            disabled={!podeGerenciar}
            eyebrow="Limpeza"
            title="Editar tarefa"
            triggerAction="edit"
            triggerClassName="w-full"
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
            />
          </EntityModal>

          <EntityViewModal
            description="Resumo operacional da tarefa."
            title={tarefa.title}
            triggerClassName="w-full"
            triggerIcon={<Eye className="h-4 w-4" />}
            triggerLabel="Ver detalhes"
          >
            <div className="grid gap-3 md:grid-cols-2">
              <Info label="Casa" valor={tarefa.propriedade?.name ?? "Casa nao informada"} />
              <Info label="Reserva" valor={tarefa.reserva?.code ?? "Nao vinculada"} />
              <Info label="Status" valor={LABEL_STATUS_TAREFA_LIMPEZA[tarefa.status]} />
              <Info label="Responsavel" valor={responsavel} />
              <div className="md:col-span-2">
                <Info label="Observacoes" valor={tarefa.notes ?? "Sem observacoes"} />
              </div>
            </div>
          </EntityViewModal>
        </div>
      </CardContent>
    </Card>
  );
}

function LinhaIcone({ icon, texto }: { icon: ReactNode; texto: string }) {
  return (
    <p className="flex min-w-0 items-center gap-2">
      <span className="text-cyan-300 [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
      <span className="min-w-0 truncate">{texto}</span>
    </p>
  );
}

function Info({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-lg border border-border/80 bg-background/45 p-3 text-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{valor}</p>
    </div>
  );
}

function obterVariant(status: TarefaLimpezaCompleta["status"], atrasada: boolean) {
  if (atrasada) return "danger";
  if (status === "completed") return "success";
  if (status === "in_cleaning") return "info";
  if (status === "cancelled") return "warning";
  return "secondary";
}

function obterClasseBorda(tarefa: TarefaLimpezaCompleta, atrasada: boolean) {
  if (atrasada) return "border-red-400/35";
  if (tarefa.status === "completed") return "border-emerald-400/30";
  if (tarefa.status === "in_cleaning") return "border-cyan-400/30";
  return "border-border/80";
}

function tarefaEhAtrasada(tarefa: TarefaLimpezaCompleta, hoje: string) {
  return (
    tarefa.status !== "completed" &&
    tarefa.status !== "cancelled" &&
    Boolean(tarefa.scheduled_for) &&
    tarefa.scheduled_for! < hoje
  );
}

function formatarOrigem(tarefa: TarefaLimpezaCompleta) {
  return tarefa.source === "checkout" ? "apos check-out" : "tarefa manual";
}

function formatarData(valor: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${valor}T00:00:00Z`));
}

function formatarDataHora(valor: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(valor));
}
