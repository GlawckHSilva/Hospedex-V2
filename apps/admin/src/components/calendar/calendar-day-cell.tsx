import {
  CalendarCheck2,
  Eye,
  LogIn,
  LogOut,
  LockKeyhole,
  Unlock,
} from "lucide-react";
import type { ReactNode } from "react";

import { Badge, Button, cn } from "@hospedex/ui";

import { ConfirmDialog, EntityViewModal } from "../management/entity-modal";
import { liberarPeriodoCalendarioAction } from "../../lib/calendar/actions";
import {
  CLASSE_STATUS_RESERVA_CALENDARIO,
  LABEL_STATUS_BLOQUEIO,
  LABEL_STATUS_RESERVA_CALENDARIO,
  statusBloqueiaDisponibilidade,
  type DiaCalendario,
} from "../../lib/calendar/types";

export type CalendarDayCellProps = {
  dia: DiaCalendario;
  podeGerenciar: boolean;
  mes: string;
  propriedadeId?: string | undefined;
  unidadeId?: string | undefined;
};

/**
 * Celula do calendario mensal.
 *
 * Reservas e bloqueios usam o mesmo intervalo de diaria: a data final e
 * exclusiva para representar check-out sem ocupar a proxima noite.
 */
export function CalendarDayCell({
  dia,
  mes,
  podeGerenciar,
  propriedadeId,
  unidadeId,
}: CalendarDayCellProps) {
  const bloqueiosAtivos = dia.blocos.filter((bloco) =>
    statusBloqueiaDisponibilidade(bloco.status),
  );
  const liberados = dia.blocos.filter((bloco) => bloco.status === "released");

  return (
    <div
      className={cn(
        "min-h-36 rounded-lg border bg-background/55 p-2 text-sm transition-colors",
        dia.foraDoMes && "bg-background/25 text-muted-foreground",
        bloqueiosAtivos.length > 0 && "border-zinc-500/35 bg-zinc-500/10",
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-semibold">{dia.numero}</span>
        {bloqueiosAtivos.length > 0 ? (
          <LockKeyhole className="h-3.5 w-3.5 text-zinc-700 dark:text-zinc-200" />
        ) : null}
      </div>

      <div className="space-y-1.5">
        {dia.checkIns.map((reserva) => (
          <MarcadorOperacional
            icone={<LogIn className="h-3.5 w-3.5 shrink-0" />}
            key={`checkin-${reserva.id}`}
            texto={`Check-in ${reserva.code}`}
            tipo="entrada"
          />
        ))}

        {dia.checkOuts.map((reserva) => (
          <MarcadorOperacional
            icone={<LogOut className="h-3.5 w-3.5 shrink-0" />}
            key={`checkout-${reserva.id}`}
            texto={`Check-out ${reserva.code}`}
            tipo="saida"
          />
        ))}

        {dia.reservas.map((reserva) => (
          <div
            className={cn(
              "rounded-md border px-2 py-1",
              CLASSE_STATUS_RESERVA_CALENDARIO[reserva.status],
            )}
            key={reserva.id}
          >
            <div>
              <div className="flex items-center gap-1.5">
                <CalendarCheck2 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate text-xs font-semibold">
                  {reserva.code}
                </span>
              </div>
              <span className="text-[10px] font-medium uppercase tracking-normal opacity-75">
                {LABEL_STATUS_RESERVA_CALENDARIO[reserva.status]}
              </span>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                {reserva.hospedePrincipal?.full_name ?? "Hospede nao informado"}
              </p>
            </div>
            <EntityViewModal
              description="Dados resumidos da reserva neste dia."
              title={`Reserva ${reserva.code}`}
              triggerClassName="mt-2 h-7 w-full justify-center text-[11px]"
              triggerIcon={<Eye className="h-3.5 w-3.5" />}
              triggerLabel="Detalhes"
            >
              <div className="grid gap-3 text-sm">
                <InfoModal
                  label="Periodo"
                  valor={formatarPeriodo(reserva.check_in, reserva.check_out)}
                />
                <InfoModal
                  label="Valor"
                  valor={formatarMoeda(Number(reserva.total_amount))}
                />
                <InfoModal
                  label="Hospede"
                  valor={
                    reserva.hospedePrincipal?.full_name ??
                    "Hospede nao informado"
                  }
                />
                <InfoModal
                  label="Status"
                  valor={LABEL_STATUS_RESERVA_CALENDARIO[reserva.status]}
                />
              </div>
            </EntityViewModal>
          </div>
        ))}

        {bloqueiosAtivos.map((bloco) => (
          <div
            className="rounded-md border border-zinc-500/30 bg-zinc-500/10 px-2 py-1"
            key={bloco.id}
          >
            <div>
              <Badge
                className="mb-1"
                variant={bloco.status === "reserved" ? "success" : "outline"}
              >
                {LABEL_STATUS_BLOQUEIO[bloco.status]}
              </Badge>
              <p className="truncate text-xs font-medium">
                {bloco.reason ?? "Periodo bloqueado"}
              </p>
            </div>
            {podeGerenciar && bloco.source !== "reservation" ? (
              <ConfirmDialog
                description="Confirme a liberacao do periodo bloqueado no calendario."
                title="Liberar periodo"
                triggerClassName="mt-2 h-7 w-full justify-center text-[11px]"
                triggerIcon={<Unlock className="h-3.5 w-3.5" />}
                triggerLabel="Liberar"
                triggerVariant="outline"
              >
                <div className="mb-4 grid gap-3 text-sm">
                  <InfoModal
                    label="Periodo"
                    valor={formatarPeriodo(bloco.starts_on, bloco.ends_on)}
                  />
                  <InfoModal
                    label="Observacoes"
                    valor={bloco.notes ?? "Bloqueio manual do calendario."}
                  />
                </div>
                <form
                  action={liberarPeriodoCalendarioAction}
                  className="flex justify-end"
                >
                  <input name="bloqueioId" type="hidden" value={bloco.id} />
                  <input name="mes" type="hidden" value={mes} />
                  <input
                    name="filtroPropriedadeId"
                    type="hidden"
                    value={propriedadeId ?? ""}
                  />
                  <input
                    name="filtroUnidadeId"
                    type="hidden"
                    value={unidadeId ?? ""}
                  />
                  <Button type="submit" variant="default">
                    <Unlock />
                    Liberar periodo
                  </Button>
                </form>
              </ConfirmDialog>
            ) : (
              <EntityViewModal
                description="Dados resumidos da indisponibilidade neste dia."
                title="Periodo bloqueado"
                triggerClassName="mt-2 h-7 w-full justify-center text-[11px]"
                triggerIcon={<Eye className="h-3.5 w-3.5" />}
                triggerLabel="Detalhes"
              >
                <div className="grid gap-3 text-sm">
                  <InfoModal
                    label="Periodo"
                    valor={formatarPeriodo(bloco.starts_on, bloco.ends_on)}
                  />
                  <InfoModal
                    label="Status"
                    valor={LABEL_STATUS_BLOQUEIO[bloco.status]}
                  />
                  <InfoModal
                    label="Observacoes"
                    valor={bloco.notes ?? "Bloqueio manual do calendario."}
                  />
                </div>
              </EntityViewModal>
            )}
          </div>
        ))}

        {liberados.length > 0 ? (
          <p className="text-[11px] text-muted-foreground">
            {liberados.length} periodo(s) liberado(s)
          </p>
        ) : null}

        {dia.reservas.length === 0 &&
        bloqueiosAtivos.length === 0 &&
        dia.checkOuts.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">Disponivel</p>
        ) : null}
      </div>
    </div>
  );
}

function InfoModal({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-lg border bg-background/45 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{valor}</p>
    </div>
  );
}

function MarcadorOperacional({
  icone,
  texto,
  tipo,
}: {
  icone: ReactNode;
  texto: string;
  tipo: "entrada" | "saida";
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-semibold",
        tipo === "entrada"
          ? "border-cyan-400/35 bg-cyan-400/12 text-cyan-950 dark:text-cyan-100"
          : "border-violet-400/35 bg-violet-400/12 text-violet-950 dark:text-violet-100",
      )}
    >
      {icone}
      <span className="truncate">{texto}</span>
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

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(valor);
}
