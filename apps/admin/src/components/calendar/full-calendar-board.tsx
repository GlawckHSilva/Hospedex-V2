"use client";

import ptBrLocale from "@fullcalendar/core/locales/pt-br";
import type {
  EventClickArg,
  EventContentArg,
  EventInput,
  MoreLinkArg,
} from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge, Card, CardContent, cn } from "@hospedex/ui";

import type {
  FiltrosCalendario,
  VisaoCalendario,
} from "../../lib/calendar/types";
import { AppModal } from "../management/entity-modal";

export type EventoFullCalendarHospedex = {
  allDay?: boolean;
  color: string;
  detalhe: string;
  end?: string;
  horario: string;
  id: string;
  start: string;
  tipo:
    | "reserva"
    | "checkin"
    | "checkout"
    | "bloqueio"
    | "manutencao"
    | "limpeza";
  title: string;
};

type FullCalendarBoardProps = {
  eventos: EventoFullCalendarHospedex[];
  filtros: FiltrosCalendario;
  hrefHoje: string;
  hrefPeriodoAnterior: string;
  hrefPeriodoProximo: string;
};

type ModalEventosDia = {
  data: string;
  eventos: EventoFullCalendarHospedex[];
};

const visualPorModo: Record<VisaoCalendario, string> = {
  agenda: "listMonth",
  mensal: "dayGridMonth",
  semanal: "timeGridWeek",
};

const modos: Array<{ label: string; value: VisaoCalendario }> = [
  { label: "Mes", value: "mensal" },
  { label: "Semana", value: "semanal" },
  { label: "Agenda", value: "agenda" },
];

/**
 * Wrapper client do FullCalendar.
 *
 * Mantem a agenda concentrada em uma biblioteca madura para evitar grids
 * manuais e preparar recursos futuros como drag/drop e selecao por intervalo.
 */
export function FullCalendarBoard({
  eventos,
  filtros,
  hrefHoje,
  hrefPeriodoAnterior,
  hrefPeriodoProximo,
}: FullCalendarBoardProps) {
  const [eventoSelecionado, setEventoSelecionado] =
    useState<EventoFullCalendarHospedex | null>(null);
  const [eventosDoDia, setEventosDoDia] = useState<ModalEventosDia | null>(
    null,
  );

  const eventosFullCalendar = useMemo<EventInput[]>(
    () =>
      eventos.map((evento) => {
        const entrada: EventInput = {
          backgroundColor: evento.color,
          borderColor: evento.color,
          extendedProps: {
            detalhe: evento.detalhe,
            horario: evento.horario,
            tipo: evento.tipo,
          },
          id: evento.id,
          start: evento.start,
          textColor: "#ffffff",
          title: evento.title,
        };

        if (evento.end) entrada.end = evento.end;
        if (evento.allDay !== undefined) entrada.allDay = evento.allDay;

        return entrada;
      }),
    [eventos],
  );

  const eventosPorId = useMemo(
    () => new Map(eventos.map((evento) => [evento.id, evento])),
    [eventos],
  );

  const dataInicial =
    filtros.visao === "semanal" ? filtros.semana : `${filtros.mes}-01`;

  function abrirEvento(info: EventClickArg) {
    const evento = eventosPorId.get(info.event.id);
    if (evento) setEventoSelecionado(evento);
  }

  function abrirEventosDoDia(info: MoreLinkArg) {
    const eventosVisiveis = info.allSegs
      .map((segmento) => eventosPorId.get(segmento.event.id))
      .filter((evento): evento is EventoFullCalendarHospedex => Boolean(evento));

    setEventosDoDia({
      data: info.date.toISOString().slice(0, 10),
      eventos: eventosVisiveis,
    });

    return info.view.type;
  }

  return (
    <Card className="admin-glass-card overflow-hidden">
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              aria-label="Periodo anterior"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border bg-background/70 text-sm shadow-sm transition hover:border-cyan-300 hover:text-cyan-600"
              href={hrefPeriodoAnterior}
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <Link
              className="inline-flex h-9 items-center rounded-full border bg-background/70 px-4 text-sm font-semibold shadow-sm transition hover:border-cyan-300 hover:text-cyan-600"
              href={hrefHoje}
            >
              Hoje
            </Link>
            <Link
              aria-label="Proximo periodo"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border bg-background/70 text-sm shadow-sm transition hover:border-cyan-300 hover:text-cyan-600"
              href={hrefPeriodoProximo}
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="inline-flex w-fit rounded-full border bg-background/65 p-1 shadow-sm">
            {modos.map((modo) => (
              <Link
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                  filtros.visao === modo.value
                    ? "bg-cyan-500 text-white shadow-sm shadow-cyan-500/25"
                    : "text-muted-foreground hover:text-cyan-600",
                )}
                href={montarHrefModo(filtros, modo.value)}
                key={modo.value}
              >
                {modo.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="hospedex-fullcalendar">
          <FullCalendar
            allDayText="Dia todo"
            dayMaxEvents={3}
            editable={false}
            eventClick={abrirEvento}
            eventContent={renderizarEvento}
            eventStartEditable={false}
            events={eventosFullCalendar}
            expandRows
            fixedWeekCount={false}
            headerToolbar={false}
            height="auto"
            initialDate={dataInicial}
            initialView={visualPorModo[filtros.visao]}
            locale={ptBrLocale}
            moreLinkClick={abrirEventosDoDia}
            moreLinkContent={(info) => `+${info.num} eventos`}
            nowIndicator
            plugins={[
              dayGridPlugin,
              timeGridPlugin,
              listPlugin,
              interactionPlugin,
            ]}
            selectable
            slotLabelFormat={{
              hour: "2-digit",
              minute: "2-digit",
              omitZeroMinute: false,
            }}
            slotMaxTime="22:00:00"
            slotMinTime="06:00:00"
            titleFormat={{ month: "long", year: "numeric" }}
          />
        </div>

        <ModalEvento
          evento={eventoSelecionado}
          onOpenChange={(aberto) => {
            if (!aberto) setEventoSelecionado(null);
          }}
        />

        <AppModal
          description="Eventos agrupados pelo FullCalendar quando o dia possui muitos compromissos."
          onOpenChange={(aberto) => {
            if (!aberto) setEventosDoDia(null);
          }}
          open={Boolean(eventosDoDia)}
          size="md"
          title={`Eventos de ${formatarData(eventosDoDia?.data)}`}
        >
          <div className="space-y-3">
            {eventosDoDia?.eventos.map((evento) => (
              <EventoResumo evento={evento} key={evento.id} />
            ))}
          </div>
        </AppModal>

        <EstilosFullCalendar />
      </CardContent>
    </Card>
  );
}

function renderizarEvento(info: EventContentArg) {
  const horario = String(info.event.extendedProps["horario"] ?? "");
  const tipo = String(info.event.extendedProps["tipo"] ?? "");

  return (
    <div className="min-w-0 px-1 py-0.5">
      <div className="flex min-w-0 items-center gap-1">
        {horario ? (
          <span className="shrink-0 text-[10px] font-bold opacity-90">
            {horario}
          </span>
        ) : null}
        <span className="truncate text-[11px] font-semibold">
          {info.event.title}
        </span>
      </div>
      <span className="block truncate text-[10px] capitalize opacity-85">
        {tipo}
      </span>
    </div>
  );
}

function ModalEvento({
  evento,
  onOpenChange,
}: {
  evento: EventoFullCalendarHospedex | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <AppModal
      description={evento?.detalhe}
      eyebrow={evento?.tipo}
      onOpenChange={onOpenChange}
      open={Boolean(evento)}
      size="md"
      title={evento?.title ?? "Evento"}
    >
      {evento ? <EventoResumo evento={evento} /> : null}
    </AppModal>
  );
}

function EventoResumo({ evento }: { evento: EventoFullCalendarHospedex }) {
  return (
    <div className="rounded-2xl border bg-background/70 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{evento.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {evento.detalhe}
          </p>
        </div>
        <Badge
          className="border text-xs font-semibold"
          style={{
            backgroundColor: `${evento.color}1A`,
            borderColor: `${evento.color}66`,
            color: evento.color,
          }}
          variant="outline"
        >
          {evento.horario || "Dia todo"}
        </Badge>
      </div>
    </div>
  );
}

function montarHrefModo(
  filtros: FiltrosCalendario,
  visao: VisaoCalendario,
) {
  const params = new URLSearchParams();
  params.set("visao", visao);
  params.set("mes", filtros.mes);
  params.set("semana", filtros.semana);
  if (filtros.propriedadeId) {
    params.set("propriedadeId", filtros.propriedadeId);
  }
  return `/calendario?${params.toString()}`;
}

function formatarData(data?: string) {
  if (!data) return "";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
  }).format(new Date(`${data}T12:00:00`));
}

function EstilosFullCalendar() {
  return (
    <style jsx global>{`
      .hospedex-fullcalendar .fc {
        --fc-border-color: hsl(var(--border));
        --fc-neutral-bg-color: rgba(34, 211, 238, 0.07);
        --fc-today-bg-color: rgba(34, 211, 238, 0.08);
        color: hsl(var(--foreground));
        font-family: inherit;
      }

      .hospedex-fullcalendar .fc-theme-standard .fc-scrollgrid {
        overflow: hidden;
        border-radius: 1.35rem;
        border: 1px solid hsl(var(--border));
        background: color-mix(
          in srgb,
          hsl(var(--background)) 82%,
          transparent
        );
        box-shadow: 0 24px 70px rgba(15, 23, 42, 0.08);
      }

      .hospedex-fullcalendar .fc-theme-standard td,
      .hospedex-fullcalendar .fc-theme-standard th {
        border-color: hsl(var(--border));
      }

      .hospedex-fullcalendar .fc .fc-col-header-cell {
        padding: 0.55rem 0;
        background: rgba(34, 211, 238, 0.06);
      }

      .hospedex-fullcalendar .fc .fc-col-header-cell-cushion,
      .hospedex-fullcalendar .fc .fc-daygrid-day-number {
        color: hsl(var(--muted-foreground));
        font-size: 0.72rem;
        font-weight: 700;
        text-decoration: none;
        text-transform: uppercase;
      }

      .hospedex-fullcalendar .fc .fc-daygrid-day {
        background: rgba(255, 255, 255, 0.02);
      }

      .hospedex-fullcalendar .fc .fc-daygrid-day.fc-day-today {
        background: rgba(34, 211, 238, 0.08);
        box-shadow:
          inset 0 0 0 1px rgba(34, 211, 238, 0.7),
          0 0 26px rgba(34, 211, 238, 0.16);
      }

      .hospedex-fullcalendar
        .fc
        .fc-daygrid-day.fc-day-today
        .fc-daygrid-day-number {
        margin: 0.25rem;
        min-width: 1.7rem;
        border-radius: 999px;
        background: linear-gradient(135deg, #0891b2, #22d3ee);
        color: white;
        text-align: center;
      }

      .hospedex-fullcalendar .fc .fc-event {
        cursor: pointer;
        border-radius: 0.65rem;
        border-width: 1px;
        box-shadow: 0 10px 22px rgba(15, 23, 42, 0.08);
      }

      .hospedex-fullcalendar .fc .fc-daygrid-event {
        margin-top: 0.18rem;
        padding: 0.05rem 0.25rem;
      }

      .hospedex-fullcalendar .fc .fc-timegrid-event {
        padding: 0.2rem;
      }

      .hospedex-fullcalendar .fc .fc-more-link {
        color: #0891b2;
        font-size: 0.72rem;
        font-weight: 800;
      }

      .hospedex-fullcalendar .fc .fc-list {
        overflow: hidden;
        border-radius: 1.35rem;
      }

      .hospedex-fullcalendar .fc .fc-list-day-cushion {
        background: rgba(34, 211, 238, 0.08);
      }

      .hospedex-fullcalendar .fc .fc-list-event:hover td {
        background: rgba(34, 211, 238, 0.08);
      }

      .hospedex-fullcalendar .fc .fc-timegrid-now-indicator-line {
        border-color: #22d3ee;
      }

      .hospedex-fullcalendar .fc .fc-timegrid-now-indicator-arrow {
        border-color: #22d3ee;
        border-top-color: transparent;
        border-bottom-color: transparent;
      }
    `}</style>
  );
}
