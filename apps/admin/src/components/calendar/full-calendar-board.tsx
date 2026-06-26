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
  const periodoLabel = obterPeriodoLabel(filtros);

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
    <Card className="overflow-hidden border-cyan-300/20 bg-slate-950/90 text-slate-100 shadow-2xl shadow-cyan-950/20">
      <CardContent className="space-y-4 p-3 sm:p-4 lg:p-5">
        <div className="rounded-2xl border border-cyan-300/20 bg-slate-900/80 p-3 shadow-inner shadow-white/5 ring-1 ring-white/5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                aria-label="Periodo anterior"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.07] text-sm shadow-sm transition hover:border-cyan-300/50 hover:bg-cyan-400/20 hover:text-cyan-100"
                href={hrefPeriodoAnterior}
              >
                <ChevronLeft className="h-4 w-4" />
              </Link>
              <Link
                className="inline-flex h-9 items-center rounded-full border border-cyan-300/20 bg-cyan-400/20 px-4 text-sm font-semibold text-cyan-100 shadow-sm transition hover:border-cyan-200/60 hover:bg-cyan-400/25"
                href={hrefHoje}
              >
                Hoje
              </Link>
              <Link
                aria-label="Proximo periodo"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.07] text-sm shadow-sm transition hover:border-cyan-300/50 hover:bg-cyan-400/20 hover:text-cyan-100"
                href={hrefPeriodoProximo}
              >
                <ChevronRight className="h-4 w-4" />
              </Link>
              <div className="ml-0 min-w-0 sm:ml-2">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-cyan-200/70">
                  Calendario
                </p>
                <h2 className="truncate text-xl font-semibold capitalize tracking-normal text-white sm:text-2xl">
                  {periodoLabel}
                </h2>
              </div>
          </div>

            <div className="inline-flex w-fit rounded-full border border-white/10 bg-slate-950/60 p-1 shadow-sm">
            {modos.map((modo) => (
              <Link
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                  filtros.visao === modo.value
                    ? "bg-cyan-400 text-slate-950 shadow-sm shadow-cyan-400/25"
                    : "text-slate-300 hover:bg-white/[0.08] hover:text-cyan-100",
                )}
                href={montarHrefModo(filtros, modo.value)}
                key={modo.value}
              >
                {modo.label}
              </Link>
            ))}
            </div>
          </div>
        </div>

        <div className="hospedex-fullcalendar">
          <FullCalendar
            allDayText="Dia todo"
            dayMaxEvents={2}
            editable={false}
            eventClick={abrirEvento}
            eventContent={renderizarEvento}
            eventDisplay="block"
            eventMaxStack={2}
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
  const detalhe = String(info.event.extendedProps["detalhe"] ?? "");

  return (
    <div className="min-w-0 px-1.5 py-0.5" title={`${tipo} - ${detalhe}`}>
      <div className="flex min-w-0 items-center gap-1.5">
        {horario ? (
          <span className="shrink-0 text-[10px] font-black opacity-95">
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

function obterPeriodoLabel(filtros: FiltrosCalendario) {
  if (filtros.visao === "semanal") {
    return `Semana de ${formatarData(filtros.semana)}`;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${filtros.mes}-01T12:00:00`));
}

function EstilosFullCalendar() {
  return (
    <style jsx global>{`
      .hospedex-fullcalendar .fc {
        --fc-border-color: rgba(148, 163, 184, 0.18);
        --fc-neutral-bg-color: rgba(15, 23, 42, 0.92);
        --fc-page-bg-color: transparent;
        --fc-today-bg-color: rgba(34, 211, 238, 0.09);
        --fc-event-border-color: transparent;
        --fc-list-event-hover-bg-color: rgba(34, 211, 238, 0.08);
        color: #e2e8f0;
        font-family: inherit;
      }

      .hospedex-fullcalendar .fc-theme-standard .fc-scrollgrid {
        overflow: hidden;
        border-radius: 1.25rem;
        border: 1px solid rgba(34, 211, 238, 0.14);
        background:
          radial-gradient(circle at top left, rgba(34, 211, 238, 0.1), transparent 28%),
          linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(2, 6, 23, 0.94));
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.06),
          0 28px 80px rgba(2, 6, 23, 0.38);
      }

      .hospedex-fullcalendar .fc-theme-standard td,
      .hospedex-fullcalendar .fc-theme-standard th {
        border-color: rgba(148, 163, 184, 0.16);
      }

      .hospedex-fullcalendar .fc .fc-col-header-cell {
        padding: 0.5rem 0;
        background: rgba(15, 23, 42, 0.92);
        border-bottom: 1px solid rgba(34, 211, 238, 0.18);
      }

      .hospedex-fullcalendar .fc .fc-col-header-cell-cushion,
      .hospedex-fullcalendar .fc .fc-daygrid-day-number {
        color: rgba(203, 213, 225, 0.8);
        font-size: 0.7rem;
        font-weight: 800;
        letter-spacing: 0.02em;
        text-decoration: none;
        text-transform: uppercase;
      }

      .hospedex-fullcalendar .fc .fc-daygrid-day {
        background: rgba(15, 23, 42, 0.56);
        transition:
          background-color 0.16s ease,
          box-shadow 0.16s ease;
      }

      .hospedex-fullcalendar .fc .fc-daygrid-day:hover {
        background: rgba(30, 41, 59, 0.78);
        box-shadow: inset 0 0 0 1px rgba(34, 211, 238, 0.16);
      }

      .hospedex-fullcalendar .fc .fc-day-other {
        background: rgba(2, 6, 23, 0.58);
      }

      .hospedex-fullcalendar .fc .fc-daygrid-day-frame {
        min-height: 5.75rem;
        padding: 0.25rem;
      }

      .hospedex-fullcalendar .fc .fc-daygrid-day-top {
        padding: 0.1rem 0.12rem;
      }

      .hospedex-fullcalendar .fc .fc-daygrid-day-events {
        margin: 0 0.05rem 0.25rem;
      }

      .hospedex-fullcalendar .fc .fc-daygrid-day.fc-day-today {
        background:
          radial-gradient(circle at top right, rgba(34, 211, 238, 0.16), transparent 42%),
          rgba(8, 47, 73, 0.36);
        box-shadow:
          inset 0 0 0 1px rgba(34, 211, 238, 0.72),
          0 0 28px rgba(34, 211, 238, 0.2);
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
        box-shadow: 0 0 18px rgba(34, 211, 238, 0.35);
      }

      .hospedex-fullcalendar .fc .fc-event {
        cursor: pointer;
        overflow: hidden;
        border-radius: 0.55rem;
        border: 1px solid rgba(255, 255, 255, 0.18);
        box-shadow: 0 9px 22px rgba(2, 6, 23, 0.22);
        transition:
          filter 0.16s ease,
          transform 0.16s ease,
          box-shadow 0.16s ease;
      }

      .hospedex-fullcalendar .fc .fc-event:hover {
        filter: saturate(1.08) brightness(1.08);
        transform: translateY(-1px);
        box-shadow: 0 14px 28px rgba(2, 6, 23, 0.32);
      }

      .hospedex-fullcalendar .fc .fc-daygrid-event {
        margin-top: 0.14rem;
        padding: 0;
      }

      .hospedex-fullcalendar .fc .fc-timegrid-event {
        padding: 0;
      }

      .hospedex-fullcalendar .fc .fc-timegrid-slot {
        height: 2.6rem;
        background: rgba(15, 23, 42, 0.45);
      }

      .hospedex-fullcalendar .fc .fc-timegrid-axis,
      .hospedex-fullcalendar .fc .fc-timegrid-slot-label {
        color: rgba(203, 213, 225, 0.62);
        font-size: 0.7rem;
      }

      .hospedex-fullcalendar .fc .fc-more-link {
        display: inline-flex;
        margin-top: 0.12rem;
        border-radius: 999px;
        background: rgba(34, 211, 238, 0.12);
        padding: 0.05rem 0.4rem;
        color: #67e8f9;
        font-size: 0.72rem;
        font-weight: 800;
        text-decoration: none;
      }

      .hospedex-fullcalendar .fc .fc-list {
        overflow: hidden;
        border-radius: 1.25rem;
        background: rgba(15, 23, 42, 0.84);
      }

      .hospedex-fullcalendar .fc .fc-list-table td,
      .hospedex-fullcalendar .fc .fc-list-event-title,
      .hospedex-fullcalendar .fc .fc-list-event-time {
        color: #dbeafe;
      }

      .hospedex-fullcalendar .fc .fc-list-day-cushion {
        background: rgba(8, 47, 73, 0.72);
        color: #cffafe;
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

      @media (max-width: 768px) {
        .hospedex-fullcalendar .fc .fc-daygrid-day-frame {
          min-height: 4.8rem;
          padding: 0.18rem;
        }

        .hospedex-fullcalendar .fc .fc-col-header-cell-cushion,
        .hospedex-fullcalendar .fc .fc-daygrid-day-number {
          font-size: 0.64rem;
        }

        .hospedex-fullcalendar .fc .fc-daygrid-event {
          border-radius: 0.45rem;
        }
      }
    `}</style>
  );
}
