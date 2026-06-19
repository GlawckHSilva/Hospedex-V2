import { CalendarDays, LockKeyhole, Plus, Sparkles, Wrench } from "lucide-react";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { Badge, Button, Card, CardContent, FadeIn, Input, Label, cn } from "@hospedex/ui";

import { bloquearPeriodoCalendarioAction } from "../../lib/calendar/actions";
import {
  LABEL_MOTIVO_BLOQUEIO,
  MOTIVOS_BLOQUEIO_CALENDARIO,
  type BlocoCalendario,
  type DadosModuloCalendario,
  type DiaCalendario,
  type LimpezaCalendario,
  type ManutencaoCalendario,
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
  "bloqueio-criado": "Periodo bloqueado com sucesso.",
  "periodo-liberado": "Periodo liberado com sucesso."
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
  reservas,
  resumo,
  sucesso,
  tenantNome,
  unidades
}: CalendarModuleProps) {
  const casaAtual =
    propriedades.find((propriedade) => propriedade.id === filtros.propriedadeId) ??
    propriedades[0] ??
    null;
  const bloqueado = !podeGerenciar || !casaAtual || unidades.length === 0;
  const eventos = montarEventosFullCalendar(dias);

  return (
    <FadeIn className="relative space-y-5 pb-24">
      <ModuleToast
        erro={erro}
        mensagensSucesso={MENSAGENS_SUCESSO_CALENDARIO}
        sucesso={sucesso}
      />

      <section className="admin-glass-panel p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <Badge variant={podeGerenciar ? "info" : "warning"}>
              {podeGerenciar ? "Calendario editavel" : "Somente leitura"}
            </Badge>
            <h1 className="mt-3 text-2xl font-semibold tracking-normal">
              Calendario e disponibilidade
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {tenantNome} - agenda visual por casa, reservas e operacao.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Resumo icon={<CalendarDays />} label="Reservas" valor={String(resumo.reservasAtivas)} />
            <Resumo icon={<LockKeyhole />} label="Bloqueios" valor={String(resumo.bloqueiosAtivos)} />
            <Resumo icon={<Sparkles />} label="Limpezas" valor={String(resumo.limpezasPendentes)} />
            <Resumo icon={<Wrench />} label="Manutencoes" valor={String(resumo.manutencoesPendentes)} />
          </div>
        </div>
      </section>

      <Card className="admin-glass-card">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-200">
                Selecionar casa
              </p>
              <h2 className="mt-1 text-lg font-semibold">
                {casaAtual?.name ?? "Nenhuma casa cadastrada"}
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {propriedades.map((propriedade) => (
                <Link
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5 hover:bg-cyan-500/10",
                    propriedade.id === filtros.propriedadeId
                      ? "border-cyan-400/50 bg-cyan-500/20 text-cyan-800 dark:text-cyan-100"
                      : "text-muted-foreground"
                  )}
                  href={montarHref(filtros, { propriedadeId: propriedade.id })}
                  key={propriedade.id}
                >
                  {propriedade.name}
                </Link>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {propriedades.length === 0 ? (
        <EstadoVazio mensagem="Cadastre uma casa antes de visualizar o calendario." />
      ) : (
        <>
          <section className="grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <ResumoCompacto label="Proximos check-ins" valor={String(resumo.checkInsProximos)} />
            <ResumoCompacto label="Proximos check-outs" valor={String(resumo.checkOutsProximos)} />
            <ResumoCompacto label="Limpezas pendentes" valor={String(resumo.limpezasPendentes)} />
            <ResumoCompacto label="Bloqueios ativos" valor={String(resumo.bloqueiosAtivos)} />
            <ResumoCompacto
              label="Reservas futuras"
              valor={String(reservas.filter((reserva) => reserva.check_in >= hojeIso()).length)}
            />
          </section>

          <FullCalendarBoard
            eventos={eventos}
            filtros={filtros}
            hrefHoje={montarHref(filtros, obterPeriodoHoje())}
            hrefPeriodoAnterior={montarHref(filtros, navegarPeriodo(filtros, -1))}
            hrefPeriodoProximo={montarHref(filtros, navegarPeriodo(filtros, 1))}
            key={`${filtros.propriedadeId ?? "sem-casa"}-${filtros.visao}-${filtros.mes}-${filtros.semana}`}
          />
        </>
      )}

      <EntityModal
        description="Crie bloqueio, manutencao ou indisponibilidade sem sair do calendario."
        disabled={bloqueado}
        eyebrow="Disponibilidade"
        size="lg"
        title="Novo evento operacional"
        triggerClassName="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-xl shadow-cyan-950/25"
        triggerIcon={<Plus className="h-5 w-5" />}
        triggerLabel="+"
        triggerSize="icon"
        triggerVariant="default"
      >
        <form action={bloquearPeriodoCalendarioAction} className="grid gap-4">
          <input name="mes" type="hidden" value={filtros.mes} />
          <input name="semana" type="hidden" value={filtros.semana} />
          <input name="visao" type="hidden" value={filtros.visao} />
          <input name="filtroPropriedadeId" type="hidden" value={filtros.propriedadeId ?? ""} />

          <div className="grid gap-4 lg:grid-cols-2">
            <CampoPropriedade
              defaultValue={filtros.propriedadeId ?? casaAtual?.id ?? ""}
              disabled={bloqueado}
              propriedades={propriedades}
            />
            <CampoUnidade defaultValue={unidades[0]?.id ?? ""} disabled={bloqueado} unidades={unidades} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <CampoTexto disabled={bloqueado} label="Inicio" name="inicio" required type="date" />
            <CampoTexto disabled={bloqueado} label="Fim" name="fim" required type="date" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <CampoMotivoBloqueio disabled={bloqueado} />
            <CampoTexto
              disabled={bloqueado}
              label="Detalhe"
              name="motivoDetalhe"
              placeholder="Ex.: manutencao preventiva"
            />
          </div>

          <CampoArea disabled={bloqueado} label="Observacoes" name="observacoes" />

          <div className="flex justify-end">
            <Button disabled={bloqueado} type="submit">
              <LockKeyhole />
              Salvar indisponibilidade
            </Button>
          </div>
        </form>
      </EntityModal>
    </FadeIn>
  );
}

function montarEventosFullCalendar(dias: DiaCalendario[]): EventoFullCalendarHospedex[] {
  const eventos = dias.flatMap((dia) => [
    ...dia.reservas
      .filter((reserva) => reserva.status !== "cancelled")
      .map((reserva) => criarEventoReserva(reserva, dia.data)),
    ...dia.checkIns.map((reserva) => criarEventoOperacional(reserva, "checkin")),
    ...dia.checkOuts.map((reserva) => criarEventoOperacional(reserva, "checkout")),
    ...dia.blocos.map((bloco) => criarEventoBloqueio(bloco, dia.data)),
    ...dia.manutencoes.map((manutencao) => criarEventoManutencao(manutencao)),
    ...dia.limpezas.map((limpeza) => criarEventoLimpeza(limpeza))
  ]);

  return eventos.filter(
    (evento, indice, todos) => todos.findIndex((item) => item.id === evento.id) === indice
  );
}

function criarEventoReserva(reserva: ReservaCalendario, data: string): EventoFullCalendarHospedex {
  const hospede = reserva.hospedePrincipal?.full_name ?? "Hospede nao informado";

  return {
    allDay: true,
    color: "#10b981",
    detalhe: hospede,
    end: reserva.check_out,
    horario: "Diaria",
    id: `reserva-${reserva.id}-${data}`,
    start: data,
    tipo: "reserva",
    title: hospede
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
    detalhe: reserva.hospedePrincipal?.full_name ?? "Hospede nao informado",
    horario: entrada ? "14h" : "10h",
    id: `${tipo}-${reserva.id}`,
    start: `${data}T${entrada ? "14:00:00" : "10:00:00"}`,
    tipo,
    title: entrada ? "Check-in" : "Check-out"
  };
}

function criarEventoBloqueio(bloco: BlocoCalendario, data: string): EventoFullCalendarHospedex {
  const manutencao = bloco.reason?.toLowerCase().includes("manutenc");

  return {
    allDay: true,
    color: manutencao ? "#8b5cf6" : "#ef4444",
    detalhe: bloco.reason ?? "Bloqueio manual",
    end: bloco.ends_on,
    horario: "Dia todo",
    id: `bloqueio-${bloco.id}-${data}`,
    start: data,
    tipo: manutencao ? "manutencao" : "bloqueio",
    title: manutencao ? "Manutencao" : "Bloqueio"
  };
}

function criarEventoManutencao(manutencao: ManutencaoCalendario): EventoFullCalendarHospedex {
  const data = manutencao.scheduled_for ?? hojeIso();

  return {
    color: "#8b5cf6",
    detalhe: manutencao.notes ?? manutencao.priority,
    horario: "08h",
    id: `manutencao-${manutencao.id}`,
    start: `${data}T08:00:00`,
    tipo: "manutencao",
    title: manutencao.title
  };
}

function criarEventoLimpeza(limpeza: LimpezaCalendario): EventoFullCalendarHospedex {
  const data = limpeza.scheduled_for ?? hojeIso();

  return {
    color: "#22d3ee",
    detalhe: limpeza.status,
    horario: "11h",
    id: `limpeza-${limpeza.id}`,
    start: `${data}T11:00:00`,
    tipo: "limpeza",
    title: limpeza.title
  };
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

function CampoUnidade({
  defaultValue,
  disabled,
  unidades
}: {
  defaultValue: string;
  disabled?: boolean;
  unidades: Array<{ id: string; name: string }>;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="unidadeId">Unidade</Label>
      <select className={campoClasse} defaultValue={defaultValue} disabled={disabled} id="unidadeId" name="unidadeId">
        {unidades.map((unidade) => (
          <option key={unidade.id} value={unidade.id}>{unidade.name}</option>
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

function Resumo({ icon, label, valor }: { icon: ReactNode; label: string; valor: string }) {
  return (
    <div className="min-w-36 rounded-lg border bg-background/55 p-3 text-sm">
      <div className="mb-2 text-primary [&_svg]:h-4 [&_svg]:w-4">{icon}</div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate font-semibold">{valor}</p>
    </div>
  );
}

function ResumoCompacto({ label, valor }: { label: string; valor: string }) {
  return (
    <Card className="admin-glass-card overflow-hidden">
      <CardContent className="min-h-24 p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-semibold">{valor}</p>
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
