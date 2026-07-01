import {
  CalendarCheck2,
  ChevronDown,
  LockKeyhole,
  Plus,
  Sparkles,
  Wrench
} from "lucide-react";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { Button, Card, CardContent, FadeIn, Input, Label, cn } from "@hospedex/ui";

import { bloquearPeriodoCalendarioAction } from "../../lib/calendar/actions";
import {
  LABEL_MOTIVO_BLOQUEIO,
  MOTIVOS_BLOQUEIO_CALENDARIO,
  type BlocoCalendario,
  type DadosModuloCalendario,
  type DiaCalendario,
  type LimpezaCalendario,
  type ManutencaoCalendario,
  type MotivoBloqueioCalendario,
  type ReservaCalendario,
  type SearchParamsCalendario
} from "../../lib/calendar/types";
import { ModuleToast } from "../admin/module-toast";
import { EntityModal } from "../management/entity-modal";
import {
  FullCalendarBoard,
  type EventoFullCalendarHospedex
} from "./full-calendar-board";

export type CalendarModuleProps = DadosModuloCalendario &
  SearchParamsCalendario & {
    tenantNome: string;
  };

const MENSAGENS_SUCESSO_CALENDARIO: Record<string, string> = {
  "bloqueio-atualizado": "Periodo atualizado com sucesso.",
  "bloqueio-criado": "Periodo bloqueado com sucesso.",
  "periodo-liberado": "Periodo liberado com sucesso.",
  "reserva-calendario-atualizada": "Reserva atualizada pelo calendario.",
  "reserva-calendario-cancelada": "Reserva cancelada e calendario liberado."
};

const campoClasse =
  "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
const areaClasse =
  "min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

/**
 * Modulo de Calendario do Gerenciamento.
 *
 * A experiencia usa FullCalendar para entregar interacao profissional e manter
 * a arquitetura pronta para drag/drop, selecao por intervalo e sincronizacoes.
 */
export function CalendarModule({
  dias,
  erro,
  filtros,
  podeGerenciar,
  propriedades,
  resumo,
  sucesso,
}: CalendarModuleProps) {
  const casaAtual =
    propriedades.find((propriedade) => propriedade.id === filtros.propriedadeId) ??
    propriedades[0] ??
    null;
  const bloqueado = !podeGerenciar || !casaAtual;
  const eventos = montarEventosFullCalendar(dias);
  const diaHoje = dias.find((dia) => dia.data === hojeIso());

  return (
    <FadeIn className="relative space-y-5 pb-8">
      <ModuleToast
        erro={erro}
        mensagensSucesso={MENSAGENS_SUCESSO_CALENDARIO}
        sucesso={sucesso}
      />

      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal">
            Calendário e disponibilidade
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Visualize reservas, bloqueios, limpezas e manutenções por casa.
          </p>
        </div>

        <NovoEventoCalendarioModal
          bloqueado={bloqueado}
          casaAtual={casaAtual}
          filtros={filtros}
          propriedades={propriedades}
        />
      </section>

      {propriedades.length === 0 ? (
        <EstadoVazio mensagem="Cadastre uma casa antes de visualizar o calendário." />
      ) : (
        <>
          <section className="grid items-stretch gap-3 xl:grid-cols-[220px_minmax(280px,1fr)_repeat(4,minmax(130px,1fr))]">
            <SeletorCasaCalendario
              casaAtual={casaAtual}
              filtros={filtros}
              propriedades={propriedades}
            />
            <LegendaHoje
              checkIns={diaHoje?.checkIns.length ?? 0}
              checkOuts={diaHoje?.checkOuts.length ?? 0}
              limpezas={diaHoje?.limpezas.length ?? 0}
              reservas={diaHoje?.reservas.length ?? 0}
            />
            <ResumoCompacto
              icon={<CalendarCheck2 />}
              label="Reservas"
              valor={String(resumo.reservasAtivas)}
            />
            <ResumoCompacto
              icon={<LockKeyhole />}
              label="Bloqueios"
              valor={String(resumo.bloqueiosAtivos)}
            />
            <ResumoCompacto
              icon={<Sparkles />}
              label="Limpezas"
              valor={String(resumo.limpezasPendentes)}
            />
            <ResumoCompacto
              icon={<Wrench />}
              label="Manutenções"
              valor={String(resumo.manutencoesPendentes)}
            />
          </section>

          <FullCalendarBoard
            eventos={eventos}
            filtros={filtros}
            hrefHoje={montarHref(filtros, obterPeriodoHoje())}
            hrefPeriodoAnterior={montarHref(filtros, navegarPeriodo(filtros, -1))}
            hrefPeriodoProximo={montarHref(filtros, navegarPeriodo(filtros, 1))}
            key={`${filtros.propriedadeId ?? "sem-casa"}-${filtros.visao}-${filtros.mes}-${filtros.semana}`}
            podeGerenciar={podeGerenciar}
          />
        </>
      )}
    </FadeIn>
  );
}

type NovoEventoCalendarioModalProps = {
  bloqueado: boolean;
  casaAtual: DadosModuloCalendario["propriedades"][number] | null;
  filtros: DadosModuloCalendario["filtros"];
  propriedades: DadosModuloCalendario["propriedades"];
};

function NovoEventoCalendarioModal({
  bloqueado,
  casaAtual,
  filtros,
  propriedades,
}: NovoEventoCalendarioModalProps) {
  return (
    <EntityModal
      description="Crie bloqueio, manutenção ou indisponibilidade sem sair do calendário."
      disabled={bloqueado}
      eyebrow="Disponibilidade"
      size="lg"
      title="Novo evento operacional"
      triggerClassName="h-11 px-5 text-sm"
      triggerIcon={<Plus className="h-4 w-4" />}
      triggerLabel="Novo evento"
      triggerVariant="default"
    >
      <form action={bloquearPeriodoCalendarioAction} className="grid gap-4">
        <input name="mes" type="hidden" value={filtros.mes} />
        <input name="semana" type="hidden" value={filtros.semana} />
        <input name="visao" type="hidden" value={filtros.visao} />
        <input name="filtroPropriedadeId" type="hidden" value={filtros.propriedadeId ?? ""} />

        <CampoPropriedade
          defaultValue={filtros.propriedadeId ?? casaAtual?.id ?? ""}
          disabled={bloqueado}
          propriedades={propriedades}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <CampoTexto disabled={bloqueado} label="Início" name="inicio" required type="date" />
          <CampoTexto disabled={bloqueado} label="Fim" name="fim" required type="date" />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <CampoMotivoBloqueio disabled={bloqueado} />
          <CampoTexto
            disabled={bloqueado}
            label="Detalhe"
            name="motivoDetalhe"
            placeholder="Ex.: manutenção preventiva"
          />
        </div>

        <CampoArea disabled={bloqueado} label="Observações internas" name="observacoes" />
        <label className="flex items-center gap-2 rounded-xl border bg-background/45 px-3 py-2 text-sm">
          <input
            defaultChecked
            disabled={bloqueado}
            name="bloqueiaDisponibilidade"
            type="checkbox"
          />
          Bloquear disponibilidade da casa
        </label>

        <div className="flex justify-end">
          <Button disabled={bloqueado} type="submit">
            <LockKeyhole />
            Salvar indisponibilidade
          </Button>
        </div>
      </form>
    </EntityModal>
  );
}

function montarEventosFullCalendar(dias: DiaCalendario[]): EventoFullCalendarHospedex[] {
  const eventos = dias.flatMap((dia) => [
    ...dia.reservas
      .filter((reserva) => reserva.status !== "cancelled")
      .map((reserva) => criarEventoReserva(reserva)),
    ...dia.checkIns
      .filter((reserva) => reserva.status !== "cancelled")
      .map((reserva) => criarEventoOperacional(reserva, "checkin")),
    ...dia.checkOuts
      .filter((reserva) => reserva.status !== "cancelled")
      .map((reserva) => criarEventoOperacional(reserva, "checkout")),
    ...dia.blocos.map((bloco) => criarEventoBloqueio(bloco)),
    ...dia.manutencoes.map((manutencao) => criarEventoManutencao(manutencao)),
    ...dia.limpezas.map((limpeza) => criarEventoLimpeza(limpeza))
  ]);

  return eventos.filter(
    (evento, indice, todos) => todos.findIndex((item) => item.id === evento.id) === indice
  );
}

function criarEventoReserva(reserva: ReservaCalendario): EventoFullCalendarHospedex {
  const hospede = reserva.hospedePrincipal?.full_name ?? "Hospede nao informado";

  return {
    allDay: true,
    color: "#10b981",
    dataFim: reserva.check_out,
    dataInicio: reserva.check_in,
    detalhe: hospede,
    end: reserva.check_out,
    horario: "Diaria",
    id: `reserva-${reserva.id}`,
    origem: "reserva",
    propriedadeId: reserva.property_id,
    registroId: reserva.id,
    start: reserva.check_in,
    status: reserva.status,
    tipo: "reserva",
    title: hospede,
    valorTotal: Number(reserva.total_amount)
  };
}

function criarEventoOperacional(
  reserva: ReservaCalendario,
  tipo: "checkin" | "checkout"
): EventoFullCalendarHospedex {
  const entrada = tipo === "checkin";
  const data = entrada ? reserva.check_in : reserva.check_out;

  return {
    color: entrada ? "#f97316" : "#0ea5e9",
    dataFim: reserva.check_out,
    dataInicio: reserva.check_in,
    detalhe: reserva.hospedePrincipal?.full_name ?? "Hospede nao informado",
    horario: entrada ? "14h" : "10h",
    id: `${tipo}-${reserva.id}`,
    origem: "reserva",
    propriedadeId: reserva.property_id,
    registroId: reserva.id,
    start: `${data}T${entrada ? "14:00:00" : "10:00:00"}`,
    status: reserva.status,
    tipo,
    title: entrada ? "Check-in" : "Check-out",
    valorTotal: Number(reserva.total_amount)
  };
}

function criarEventoBloqueio(bloco: BlocoCalendario): EventoFullCalendarHospedex {
  const configuracao = {
    cleaning: { color: "#22d3ee", tipo: "limpeza" as const, title: "Limpeza" },
    maintenance: { color: "#8b5cf6", tipo: "manutencao" as const, title: "Manutencao" },
    default: { color: "#ef4444", tipo: "bloqueio" as const, title: "Bloqueio" }
  };
  const visual =
    bloco.block_type === "maintenance"
      ? configuracao.maintenance
      : bloco.block_type === "cleaning"
        ? configuracao.cleaning
        : configuracao.default;

  return {
    allDay: true,
    bloqueiaDisponibilidade: bloco.blocks_availability,
    color: visual.color,
    dataFim: bloco.ends_on,
    dataInicio: bloco.starts_on,
    detalhe: bloco.reason ?? "Bloqueio manual",
    // FullCalendar trata o fim de eventos dia-todo como exclusivo. Como o
    // bloqueio operacional e inclusivo no negocio, somamos um dia apenas na UI.
    end: formatDate(addDays(parseDate(bloco.ends_on), 1)),
    horario: "Dia todo",
    id: `bloqueio-${bloco.id}`,
    motivoCodigo: obterMotivoCodigoBloco(bloco),
    motivoDetalhe: obterDetalheMotivoBloco(bloco),
    observacoes: bloco.notes,
    origem: "bloqueio",
    propriedadeId: bloco.property_id,
    registroId: bloco.id,
    start: bloco.starts_on,
    status: bloco.status,
    tipo: visual.tipo,
    title: visual.title
  };
}

function criarEventoManutencao(manutencao: ManutencaoCalendario): EventoFullCalendarHospedex {
  const data = manutencao.scheduled_for ?? hojeIso();

  return {
    color: "#8b5cf6",
    dataFim: data,
    dataInicio: data,
    detalhe: manutencao.notes ?? manutencao.priority,
    horario: "08h",
    id: `manutencao-${manutencao.id}`,
    origem: "manutencao",
    propriedadeId: manutencao.property_id,
    registroId: manutencao.id,
    start: `${data}T08:00:00`,
    status: manutencao.status,
    tipo: "manutencao",
    title: manutencao.title
  };
}

function criarEventoLimpeza(limpeza: LimpezaCalendario): EventoFullCalendarHospedex {
  const data = limpeza.scheduled_for ?? hojeIso();

  return {
    color: "#22d3ee",
    dataFim: data,
    dataInicio: data,
    detalhe: limpeza.status,
    horario: "11h",
    id: `limpeza-${limpeza.id}`,
    origem: "limpeza",
    propriedadeId: limpeza.property_id,
    registroId: limpeza.id,
    start: `${data}T11:00:00`,
    status: limpeza.status,
    tipo: "limpeza",
    title: limpeza.title
  };
}

function obterMotivoCodigoBloco(bloco: BlocoCalendario): MotivoBloqueioCalendario {
  const metadata = bloco.metadata;

  // O codigo em metadata preserva filtros e edicao futura mesmo quando o texto
  // humano do motivo muda por ajustes de produto.
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    const motivo = metadata["motivoCodigo"];
    if (
      typeof motivo === "string" &&
      MOTIVOS_BLOQUEIO_CALENDARIO.includes(motivo as MotivoBloqueioCalendario)
    ) {
      return motivo as MotivoBloqueioCalendario;
    }
  }

  if (bloco.block_type === "maintenance") return "maintenance";
  if (bloco.block_type === "interdicted") return "interdicted";
  if (bloco.block_type === "cleaning") return "cleaning";
  if (bloco.block_type === "temporary_unavailable") return "unavailable";
  return "other";
}

function obterDetalheMotivoBloco(bloco: BlocoCalendario) {
  const motivo = obterMotivoCodigoBloco(bloco);
  const label = LABEL_MOTIVO_BLOQUEIO[motivo];
  const reason = bloco.reason ?? "";

  return reason.startsWith(`${label}: `) ? reason.slice(label.length + 2) : reason;
}

function CampoPropriedade({
  defaultValue,
  disabled,
  propriedades
}: {
  defaultValue: string;
  disabled?: boolean;
  propriedades: Array<{ id: string; name: string }>;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="propriedadeId">Casa</Label>
      <select className={campoClasse} defaultValue={defaultValue} disabled={disabled} id="propriedadeId" name="propriedadeId">
        {propriedades.map((propriedade) => (
          <option key={propriedade.id} value={propriedade.id}>{propriedade.name}</option>
        ))}
      </select>
    </div>
  );
}

function CampoTexto({
  label,
  name,
  ...props
}: {
  label: string;
  name: string;
} & ComponentProps<typeof Input>) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} {...props} />
    </div>
  );
}

function CampoArea({ disabled, label, name }: { disabled: boolean; label: string; name: string }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <textarea className={areaClasse} disabled={disabled} id={name} name={name} />
    </div>
  );
}

function CampoMotivoBloqueio({ disabled }: { disabled: boolean }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="motivoTipo">Tipo</Label>
      <select className={campoClasse} disabled={disabled} id="motivoTipo" name="motivoTipo">
        {MOTIVOS_BLOQUEIO_CALENDARIO.map((motivo) => (
          <option key={motivo} value={motivo}>{LABEL_MOTIVO_BLOQUEIO[motivo]}</option>
        ))}
      </select>
    </div>
  );
}

function SeletorCasaCalendario({
  casaAtual,
  filtros,
  propriedades
}: {
  casaAtual: DadosModuloCalendario["propriedades"][number] | null;
  filtros: DadosModuloCalendario["filtros"];
  propriedades: DadosModuloCalendario["propriedades"];
}) {
  return (
    <Card className="admin-glass-card">
      <CardContent className="p-3">
        <p className="mb-2 text-xs font-semibold text-muted-foreground">Casa</p>
        <details className="group relative">
          <summary className="flex h-10 cursor-pointer list-none items-center justify-between gap-3 rounded-lg border border-cyan-300/20 bg-background/45 px-3 text-sm font-semibold transition hover:border-cyan-300/45 hover:bg-cyan-500/10 [&::-webkit-details-marker]:hidden">
            <span className="truncate">{casaAtual?.name ?? "Nenhuma casa"}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-cyan-400 transition group-open:rotate-180" />
          </summary>
          <div className="absolute left-0 top-full z-30 mt-2 grid max-h-72 w-full gap-1 overflow-auto rounded-xl border border-cyan-300/20 bg-slate-950/95 p-2 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl">
            {propriedades.map((propriedade) => (
              <Link
                className={cn(
                  "rounded-lg px-3 py-2 text-sm transition hover:bg-cyan-500/10 hover:text-cyan-100",
                  propriedade.id === filtros.propriedadeId
                    ? "bg-cyan-500/15 text-cyan-100"
                    : "text-slate-300"
                )}
                href={montarHref(filtros, { propriedadeId: propriedade.id })}
                key={propriedade.id}
              >
                {propriedade.name}
              </Link>
            ))}
          </div>
        </details>
      </CardContent>
    </Card>
  );
}

function LegendaHoje({
  checkIns,
  checkOuts,
  limpezas,
  reservas
}: {
  checkIns: number;
  checkOuts: number;
  limpezas: number;
  reservas: number;
}) {
  return (
    <Card className="admin-glass-card">
      <CardContent className="flex h-full flex-wrap items-center gap-3 p-4 text-sm">
        <span className="font-semibold text-foreground">Hoje:</span>
        <IndicadorLegenda cor="bg-orange-400" texto={`${checkIns} check-in`} />
        <IndicadorLegenda cor="bg-rose-400" texto={`${checkOuts} check-out`} />
        <IndicadorLegenda cor="bg-cyan-400" texto={`${limpezas} limpezas`} />
        <IndicadorLegenda cor="bg-emerald-400" texto={`${reservas} reserva futura`} />
      </CardContent>
    </Card>
  );
}

function IndicadorLegenda({ cor, texto }: { cor: string; texto: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <span className={cn("h-2 w-2 rounded-full", cor)} />
      {texto}
    </span>
  );
}

function ResumoCompacto({
  icon,
  label,
  valor
}: {
  icon: ReactNode;
  label: string;
  valor: string;
}) {
  return (
    <Card className="admin-glass-card overflow-hidden">
      <CardContent className="flex min-h-20 items-center gap-3 p-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/12 text-cyan-400 [&_svg]:h-5 [&_svg]:w-5">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold leading-none">{valor}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function EstadoVazio({ mensagem }: { mensagem: string }) {
  return (
    <Card className="admin-glass-card">
      <CardContent className="p-5 text-sm text-muted-foreground">{mensagem}</CardContent>
    </Card>
  );
}

function montarHref(
  filtros: DadosModuloCalendario["filtros"],
  ajustes: Partial<DadosModuloCalendario["filtros"]>
) {
  const params = new URLSearchParams();
  const proximo = { ...filtros, ...ajustes };
  params.set("visao", proximo.visao);
  params.set("mes", proximo.mes);
  params.set("semana", proximo.semana);
  if (proximo.propriedadeId) params.set("propriedadeId", proximo.propriedadeId);
  return `/calendario?${params.toString()}`;
}

function navegarPeriodo(
  filtros: DadosModuloCalendario["filtros"],
  direcao: -1 | 1
): Partial<DadosModuloCalendario["filtros"]> {
  if (filtros.visao === "semanal") {
    const data = addDays(parseDate(filtros.semana), direcao * 7);
    return { semana: formatDate(data), mes: formatDate(data).slice(0, 7) };
  }

  const [ano = "2026", mes = "01"] = filtros.mes.split("-");
  const data = new Date(Date.UTC(Number(ano), Number(mes) - 1 + direcao, 1));
  const proximoMes = formatDate(data).slice(0, 7);
  return { mes: proximoMes, semana: `${proximoMes}-01` };
}

function obterPeriodoHoje(): Partial<DadosModuloCalendario["filtros"]> {
  const hoje = hojeIso();
  return {
    mes: hoje.slice(0, 7),
    semana: hoje
  };
}

function hojeIso() {
  return new Date().toISOString().slice(0, 10);
}

function parseDate(data: string) {
  const [ano = 1970, mes = 1, dia = 1] = data.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia));
}

function addDays(data: Date, dias: number) {
  return new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate() + dias));
}

function formatDate(data: Date) {
  return data.toISOString().slice(0, 10);
}
