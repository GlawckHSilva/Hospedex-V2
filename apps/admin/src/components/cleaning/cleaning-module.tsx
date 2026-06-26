import { CalendarCheck2, LogIn, LogOut, Plus, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

import { Badge, Button, Card, CardContent, FadeIn, Label } from "@hospedex/ui";

import { ModuleToast } from "../admin/module-toast";
import { ConfirmDialog, EntityModal } from "../management/entity-modal";
import { EmptyState, EntityGrid } from "../management/entity-card";
import {
  confirmarCheckInAction,
  confirmarCheckOutAction,
} from "../../lib/cleaning/actions";
import type {
  DadosModuloLimpeza,
  ReservaOperacional,
  SearchParamsLimpeza,
} from "../../lib/cleaning/types";
import { CleaningTaskCard } from "./cleaning-task-card";
import { CleaningTaskForm } from "./cleaning-task-form";

/**
 * Modulo visual de operacao diaria.
 *
 * Centraliza check-in, check-out e limpeza sem implementar automacoes futuras
 * como QR Code, fotos, self check-in ou fechaduras inteligentes.
 */

export type CleaningModuleProps = DadosModuloLimpeza & SearchParamsLimpeza;

const MENSAGENS_SUCESSO_LIMPEZA: Record<string, string> = {
  "checkin-confirmado": "Check-in confirmado com sucesso.",
  "checkout-confirmado": "Check-out confirmado com sucesso.",
  "status-limpeza": "Status da limpeza atualizado.",
  "tarefa-atualizada": "Tarefa atualizada com sucesso.",
  "tarefa-criada": "Tarefa criada com sucesso.",
};

const areaClasse =
  "min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export function CleaningModule({
  checkInsHoje,
  checkOutsHoje,
  erro,
  hoje,
  limpezaAtiva,
  podeGerenciarLimpeza,
  podeGerenciarOperacao,
  propriedades,
  responsaveis,
  sucesso,
  tarefas,
  tenantNome,
}: CleaningModuleProps) {
  const reservasOperacionais = [...checkInsHoje, ...checkOutsHoje];

  return (
    <FadeIn className="space-y-5">
      <ModuleToast
        erro={erro}
        mensagensSucesso={MENSAGENS_SUCESSO_LIMPEZA}
        sucesso={sucesso}
      />

      <section className="admin-glass-panel p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Badge variant={limpezaAtiva ? "info" : "warning"}>
              {limpezaAtiva ? "Limpeza ativa" : "Limpeza desativada"}
            </Badge>
            <h1 className="mt-3 text-2xl font-semibold tracking-normal">
              Check-in, check-out e limpeza
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {tenantNome} · {formatarData(hoje)}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Resumo
              icon={<LogIn />}
              label="Check-ins hoje"
              valor={String(checkInsHoje.length)}
            />
            <Resumo
              icon={<LogOut />}
              label="Check-outs hoje"
              valor={String(checkOutsHoje.length)}
            />
            <Resumo
              icon={<Sparkles />}
              label="Tarefas"
              valor={String(tarefas.length)}
            />
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <SecaoOperacional
          action={confirmarCheckInAction}
          disabled={!podeGerenciarOperacao}
          icon={<LogIn />}
          reservas={checkInsHoje}
          titulo="Check-ins do dia"
          vazio="Nenhum check-in confirmado para hoje."
        />
        <SecaoOperacional
          action={confirmarCheckOutAction}
          disabled={!podeGerenciarOperacao}
          icon={<LogOut />}
          reservas={checkOutsHoje}
          titulo="Check-outs do dia"
          vazio="Nenhum check-out pendente para hoje."
        />
      </div>

      <Card className="admin-glass-card">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">Tarefas de limpeza</h2>
            <p className="text-sm text-muted-foreground">
              Cadastre tarefas manuais em modal central, sem expandir a lista.
            </p>
          </div>
          <EntityModal
            description="Informe casa, reserva vinculada e responsavel pela limpeza."
            disabled={!podeGerenciarLimpeza}
            eyebrow="Limpeza"
            title="Nova tarefa de limpeza"
            triggerIcon={<Plus className="h-4 w-4" />}
            triggerLabel="Nova tarefa"
            triggerVariant="default"
          >
            <CleaningTaskForm
              modo="criar"
              podeGerenciar={podeGerenciarLimpeza}
              propriedades={propriedades}
              reservas={reservasOperacionais}
              responsaveis={responsaveis}
            />
          </EntityModal>
        </CardContent>
      </Card>

      {tarefas.length > 0 ? (
        <EntityGrid>
          {tarefas.map((tarefa) => (
            <CleaningTaskCard
              key={tarefa.id}
              podeGerenciar={podeGerenciarLimpeza}
              propriedades={propriedades}
              reservas={reservasOperacionais}
              responsaveis={responsaveis}
              tarefa={tarefa}
            />
          ))}
        </EntityGrid>
      ) : (
        <EmptyState
          description="Quando houver tarefas manuais ou geradas por check-out, elas aparecem aqui."
          icon={<Sparkles className="h-5 w-5" />}
          title="Nenhuma tarefa de limpeza encontrada"
        />
      )}
    </FadeIn>
  );
}

function SecaoOperacional({
  action,
  disabled,
  icon,
  reservas,
  titulo,
  vazio,
}: {
  action: (formData: FormData) => Promise<void>;
  disabled: boolean;
  icon: ReactNode;
  reservas: ReservaOperacional[];
  titulo: string;
  vazio: string;
}) {
  return (
    <Card className="admin-glass-card">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center gap-2">
          <span className="text-primary [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
          <h2 className="text-lg font-semibold">{titulo}</h2>
        </div>

        {reservas.length > 0 ? (
          reservas.map((reserva) => (
            <div
              className="rounded-lg border bg-background/45 p-3"
              key={reserva.id}
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="font-semibold">{reserva.code}</p>
                  <p className="text-sm text-muted-foreground">
                    {reserva.propriedade?.name ?? "Propriedade"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {reserva.hospedePrincipal?.full_name ??
                      "Hospede nao informado"}
                  </p>
                </div>
                <Badge variant="outline">
                  <CalendarCheck2 className="h-3.5 w-3.5" />
                  {formatarPeriodo(reserva.check_in, reserva.check_out)}
                </Badge>
              </div>
              <ConfirmDialog
                description="Confirme a operacao e registre uma observacao opcional."
                disabled={disabled}
                title={titulo}
                triggerClassName="mt-3"
                triggerIcon={<CalendarCheck2 className="h-4 w-4" />}
                triggerLabel="Confirmar"
                triggerVariant="default"
              >
                <form action={action} className="grid gap-3">
                  <input name="reservaId" type="hidden" value={reserva.id} />
                  <div className="grid gap-2">
                    <Label htmlFor={`observacao-${reserva.id}`}>
                      Observacao
                    </Label>
                    <textarea
                      className={areaClasse}
                      disabled={disabled}
                      id={`observacao-${reserva.id}`}
                      name="observacao"
                    />
                  </div>
                  <Button disabled={disabled} type="submit">
                    Confirmar
                  </Button>
                </form>
              </ConfirmDialog>
            </div>
          ))
        ) : (
          <p className="rounded-lg border border-dashed bg-background/45 p-4 text-sm text-muted-foreground">
            {vazio}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Resumo({
  icon,
  label,
  valor,
}: {
  icon: ReactNode;
  label: string;
  valor: string;
}) {
  return (
    <div className="min-w-36 rounded-lg border bg-background/55 p-3 text-sm">
      <div className="mb-2 text-primary [&_svg]:h-4 [&_svg]:w-4">{icon}</div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate font-semibold">{valor}</p>
    </div>
  );
}

function formatarPeriodo(inicio: string, fim: string) {
  return `${formatarData(inicio)} - ${formatarData(fim)}`;
}

function formatarData(valor: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: "UTC",
  }).format(new Date(`${valor}T00:00:00Z`));
}
