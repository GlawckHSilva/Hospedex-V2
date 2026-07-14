"use client";

import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { useMemo, useState } from "react";

import { Button, cn } from "@hospedex/ui";

import type {
  PeriodoDisponibilidadePublica,
  StatusDisponibilidadePublica,
} from "../../lib/marketplace/data";

type PropertyAvailabilityCalendarProps = {
  availability: PeriodoDisponibilidadePublica[];
  error?: string | null;
};

type DiaCalendario = {
  diaMes: number;
  foraDoMes: boolean;
  iso: string;
  status: StatusCalendarioPublico;
};

type StatusCalendarioPublico = StatusDisponibilidadePublica | "available";

const DIAS_SEMANA = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];

const STATUS_VISUAL: Record<
  StatusCalendarioPublico,
  { label: string; className: string; dot: string }
> = {
  available: {
    className:
      "border-emerald-400/25 bg-emerald-400/10 text-emerald-700 dark:text-emerald-100",
    dot: "bg-emerald-400",
    label: "Disponível",
  },
  reserved: {
    className:
      "border-blue-300/30 bg-blue-500/12 text-blue-700 dark:text-blue-100",
    dot: "bg-blue-300",
    label: "Reservado",
  },
  unavailable: {
    className:
      "border-slate-400/30 bg-slate-500/12 text-slate-700 dark:text-slate-100",
    dot: "bg-slate-400",
    label: "Indisponível",
  },
};

/**
 * Calendário público da Casa.
 *
 * Mostra apenas estados agregados de disponibilidade. Detalhes internos,
 * motivos e observações administrativas não são expostos ao hóspede.
 */
export function PropertyAvailabilityCalendar({
  availability,
  error,
}: PropertyAvailabilityCalendarProps) {
  const [mesReferencia, setMesReferencia] = useState(() =>
    inicioDoMes(new Date()),
  );
  const dias = useMemo(
    () => montarDiasCalendario(mesReferencia, availability),
    [availability, mesReferencia],
  );

  return (
    <div className="overflow-hidden rounded-lg border bg-background/70">
      <div className="flex flex-col gap-3 border-b bg-background/80 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-primary">
            <CalendarDays className="h-4 w-4 text-primary" />
            Disponibilidade
          </p>
          <h3 className="mt-1 text-lg font-semibold">
            {formatarMesAno(mesReferencia)}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            aria-label="Mês anterior"
            onClick={() => setMesReferencia(adicionarMeses(mesReferencia, -1))}
            size="icon"
            type="button"
            variant="outline"
          >
            <ChevronLeft className="h-4 w-4 text-primary" />
          </Button>
          <Button
            onClick={() => setMesReferencia(inicioDoMes(new Date()))}
            type="button"
            variant="outline"
          >
            Hoje
          </Button>
          <Button
            aria-label="Próximo mês"
            onClick={() => setMesReferencia(adicionarMeses(mesReferencia, 1))}
            size="icon"
            type="button"
            variant="outline"
          >
            <ChevronRight className="h-4 w-4 text-primary" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b bg-secondary/45 text-center text-xs font-semibold text-muted-foreground">
        {DIAS_SEMANA.map((dia) => (
          <div className="px-2 py-3" key={dia}>
            {dia}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {dias.map((dia) => {
          const visual = STATUS_VISUAL[dia.status];

          return (
            <div
              className={cn(
                "min-h-20 border-b border-r p-2 transition last:border-r-0 hover:bg-primary/5 sm:min-h-24",
                dia.foraDoMes && "bg-secondary/25 text-muted-foreground/55",
                dia.iso === formatarIsoLocal(new Date()) &&
                  "relative bg-accent-soft ring-1 ring-inset ring-border-active/45 dark:bg-cyan-400/10 dark:ring-cyan-300/45",
              )}
              key={dia.iso}
            >
              <span
                className={cn(
                  "grid h-7 w-7 place-items-center rounded-full text-xs font-semibold",
                  dia.iso === formatarIsoLocal(new Date()) &&
                    "bg-primary text-primary-foreground",
                )}
              >
                {dia.diaMes}
              </span>

              <span
                className={cn(
                  "mt-2 flex max-w-full items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium",
                  visual.className,
                )}
                title={visual.label}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 shrink-0 rounded-full",
                    visual.dot,
                  )}
                />
                <span className="truncate">{visual.label}</span>
              </span>
            </div>
          );
        })}
      </div>

      {error ? (
        <div className="border-t border-warning/30 bg-warning/10 p-4 text-sm leading-6 text-warning dark:border-amber-400/25 dark:bg-amber-500/10 dark:text-amber-100">
          Não foi possível carregar a disponibilidade agora. A casa continua
          visível, mas confirme as datas antes de enviar a solicitação.
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 p-3 sm:p-4">
        {Object.entries(STATUS_VISUAL).map(([status, visual]) => (
          <span
            className="inline-flex items-center gap-1.5 rounded-full border bg-background/70 px-3 py-1 text-xs text-muted-foreground"
            key={status}
          >
            <span className={cn("h-2 w-2 rounded-full", visual.dot)} />
            {visual.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function montarDiasCalendario(
  mesReferencia: Date,
  periodos: PeriodoDisponibilidadePublica[],
): DiaCalendario[] {
  const primeiroDia = inicioDoMes(mesReferencia);
  const inicioGrade = new Date(primeiroDia);
  const deslocamentoSegunda = (primeiroDia.getDay() + 6) % 7;
  inicioGrade.setDate(primeiroDia.getDate() - deslocamentoSegunda);

  return Array.from({ length: 42 }, (_, indice) => {
    const data = new Date(inicioGrade);
    data.setDate(inicioGrade.getDate() + indice);
    const iso = formatarIsoLocal(data);

    return {
      diaMes: data.getDate(),
      foraDoMes: data.getMonth() !== mesReferencia.getMonth(),
      iso,
      status: obterStatusDia(iso, periodos),
    };
  });
}

function obterStatusDia(
  iso: string,
  periodos: PeriodoDisponibilidadePublica[],
): StatusCalendarioPublico {
  const periodo = periodos.find(
    (item) => item.startsOn <= iso && iso < item.endsOn,
  );

  return periodo?.status ?? "available";
}

function inicioDoMes(data: Date) {
  return new Date(data.getFullYear(), data.getMonth(), 1);
}

function adicionarMeses(data: Date, meses: number) {
  return new Date(data.getFullYear(), data.getMonth() + meses, 1);
}

function formatarMesAno(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(data);
}

function formatarIsoLocal(data: Date) {
  return [
    data.getFullYear(),
    String(data.getMonth() + 1).padStart(2, "0"),
    String(data.getDate()).padStart(2, "0"),
  ].join("-");
}
