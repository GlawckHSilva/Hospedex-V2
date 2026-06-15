import { CalendarCheck2, LockKeyhole, Unlock } from "lucide-react";

import { Badge, Button, cn } from "@hospedex/ui";

import { liberarPeriodoCalendarioAction } from "../../lib/calendar/actions";
import {
  LABEL_STATUS_BLOQUEIO,
  statusBloqueiaDisponibilidade,
  type DiaCalendario
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
  unidadeId
}: CalendarDayCellProps) {
  const bloqueiosAtivos = dia.blocos.filter((bloco) =>
    statusBloqueiaDisponibilidade(bloco.status)
  );
  const liberados = dia.blocos.filter((bloco) => bloco.status === "released");

  return (
    <div
      className={cn(
        "min-h-36 rounded-lg border bg-background/55 p-2 text-sm transition-colors",
        dia.foraDoMes && "bg-background/25 text-muted-foreground",
        bloqueiosAtivos.length > 0 && "border-cyan-500/35 bg-cyan-500/10"
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-semibold">{dia.numero}</span>
        {bloqueiosAtivos.length > 0 ? (
          <LockKeyhole className="h-3.5 w-3.5 text-cyan-700 dark:text-cyan-200" />
        ) : null}
      </div>

      <div className="space-y-1.5">
        {dia.reservas.map((reserva) => (
          <div
            className="rounded-md border border-success/25 bg-success/10 px-2 py-1"
            key={reserva.id}
          >
            <div className="flex items-center gap-1.5">
              <CalendarCheck2 className="h-3.5 w-3.5 text-success" />
              <span className="truncate text-xs font-semibold">{reserva.code}</span>
            </div>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {reserva.hospedePrincipal?.full_name ?? "Hospede nao informado"}
            </p>
          </div>
        ))}

        {bloqueiosAtivos.map((bloco) => (
          <div
            className="rounded-md border border-cyan-500/25 bg-cyan-500/10 px-2 py-1"
            key={bloco.id}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Badge className="mb-1" variant={bloco.status === "reserved" ? "success" : "info"}>
                  {LABEL_STATUS_BLOQUEIO[bloco.status]}
                </Badge>
                <p className="truncate text-xs font-medium">{bloco.reason ?? "Periodo bloqueado"}</p>
              </div>

              {podeGerenciar && bloco.source !== "reservation" ? (
                <form action={liberarPeriodoCalendarioAction}>
                  <input name="bloqueioId" type="hidden" value={bloco.id} />
                  <input name="mes" type="hidden" value={mes} />
                  <input name="filtroPropriedadeId" type="hidden" value={propriedadeId ?? ""} />
                  <input name="filtroUnidadeId" type="hidden" value={unidadeId ?? ""} />
                  <Button
                    aria-label="Liberar periodo"
                    className="h-7 w-7"
                    size="icon"
                    type="submit"
                    variant="ghost"
                  >
                    <Unlock className="h-3.5 w-3.5" />
                  </Button>
                </form>
              ) : null}
            </div>
          </div>
        ))}

        {liberados.length > 0 ? (
          <p className="text-[11px] text-muted-foreground">
            {liberados.length} periodo(s) liberado(s)
          </p>
        ) : null}

        {dia.reservas.length === 0 && bloqueiosAtivos.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">Disponivel</p>
        ) : null}
      </div>
    </div>
  );
}
