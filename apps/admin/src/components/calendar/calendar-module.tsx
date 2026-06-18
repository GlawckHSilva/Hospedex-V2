import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock3,
  LockKeyhole,
  Plus,
  Sparkles,
  Wrench
} from "lucide-react";
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
  type SearchParamsCalendario,
  type VisaoCalendario
} from "../../lib/calendar/types";
import { ModuleToast } from "../admin/module-toast";
import { EntityModal } from "../management/entity-modal";

export type CalendarModuleProps = DadosModuloCalendario &
  SearchParamsCalendario & {
    tenantNome: string;
  };

type EventoCalendario = {
  data: string;
  detalhe: string;
  hora: string;
  id: string;
  tipo: "reserva" | "checkin" | "checkout" | "bloqueio" | "manutencao" | "limpeza";
  titulo: string;
};

const MENSAGENS_SUCESSO_CALENDARIO: Record<string, string> = {
  "bloqueio-criado": "Periodo bloqueado com sucesso.",
  "periodo-liberado": "Periodo liberado com sucesso."
};

const campoClasse =
  "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
const areaClasse =
  "min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

const ESTILO_EVENTO: Record<EventoCalendario["tipo"], string> = {
  bloqueio: "border-rose-400/35 bg-rose-400/12 text-rose-950 dark:text-rose-100",
  checkin: "border-orange-400/35 bg-orange-400/12 text-orange-950 dark:text-orange-100",
  checkout: "border-sky-400/35 bg-sky-400/12 text-sky-950 dark:text-sky-100",
  limpeza: "border-cyan-400/35 bg-cyan-400/12 text-cyan-950 dark:text-cyan-100",
  manutencao: "border-violet-400/35 bg-violet-400/12 text-violet-950 dark:text-violet-100",
  reserva: "border-emerald-400/35 bg-emerald-400/12 text-emerald-950 dark:text-emerald-100"
};

const COR_LEGENDA: Record<EventoCalendario["tipo"], string> = {
  bloqueio: "bg-rose-500",
  checkin: "bg-orange-500",
  checkout: "bg-sky-500",
  limpeza: "bg-cyan-400",
  manutencao: "bg-violet-500",
  reserva: "bg-emerald-500"
};

const HORARIOS_SEMANA = ["06h", "08h", "10h", "12h", "14h", "16h", "18h", "20h"];

/**
 * Calendario visual do Gerenciamento.
 *
 * A casa vem primeiro porque este e o modelo mental do proprietario. Mes,
 * semana e agenda apenas mudam a leitura da mesma propriedade selecionada.
 */
export function CalendarModule({
  blocos,
  dias,
  erro,
  filtros,
  limpezas,
  manutencoes,
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
  const eventos = montarEventos(dias);
  const bloqueado = !podeGerenciar || !casaAtual || unidades.length === 0;
  const periodoLabel = filtros.visao === "semanal" ? `Semana de ${formatarData(filtros.semana)}` : formatarMes(filtros.mes);

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
              {tenantNome} - selecione uma casa e acompanhe a agenda operacional.
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
                      ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-800 dark:text-cyan-100"
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
        <div className="grid gap-5 xl:grid-cols-[1fr_22rem]">
          <section className="space-y-4">
            <Card className="admin-glass-card">
              <CardContent className="space-y-4 p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-2">
                    <Link
                      aria-label="Periodo anterior"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border bg-background text-sm shadow-sm transition hover:bg-accent hover:text-accent-foreground"
                      href={montarHref(filtros, navegarPeriodo(filtros, -1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Link>
                    <div>
                      <h2 className="text-lg font-semibold capitalize">{periodoLabel}</h2>
                      <p className="text-xs text-muted-foreground">
                        {eventos.length} evento(s) nesta visao
                      </p>
                    </div>
                    <Link
                      aria-label="Proximo periodo"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border bg-background text-sm shadow-sm transition hover:bg-accent hover:text-accent-foreground"
                      href={montarHref(filtros, navegarPeriodo(filtros, 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>

                  <div className="flex rounded-full border bg-background/55 p-1">
                    {(["mensal", "semanal", "agenda"] as VisaoCalendario[]).map((visao) => (
                      <Link
                        className={cn(
                          "rounded-full px-4 py-2 text-sm font-medium transition",
                          filtros.visao === visao
                            ? "bg-cyan-500/15 text-cyan-800 dark:text-cyan-100"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                        href={montarHref(filtros, { visao })}
                        key={visao}
                      >
                        {visao === "mensal" ? "Mes" : visao === "semanal" ? "Semana" : "Agenda"}
                      </Link>
                    ))}
                  </div>
                </div>

                <Legenda />
              </CardContent>
            </Card>

            {filtros.visao === "semanal" ? (
              <VisaoSemanal dias={dias.slice(0, 7)} />
            ) : filtros.visao === "agenda" ? (
              <VisaoAgenda eventos={eventos} />
            ) : (
              <VisaoMensal dias={dias} />
            )}
          </section>

          <PainelLateral
            blocos={blocos}
            limpezas={limpezas}
            manutencoes={manutencoes}
            reservas={reservas}
            resumo={resumo}
          />
        </div>
      )}

      <EntityModal
        description="Crie bloqueio, manutencao ou indisponibilidade sem sair do calendario."
        disabled={bloqueado}
        eyebrow="Disponibilidade"
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
            <CampoUnidade
              defaultValue={unidades[0]?.id ?? ""}
              disabled={bloqueado}
              unidades={unidades}
            />
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

function VisaoMensal({ dias }: { dias: DiaCalendario[] }) {
  return (
    <Card className="admin-glass-card">
      <CardContent className="space-y-3 p-4">
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-muted-foreground">
          {["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"].map((dia) => (
            <span key={dia}>{dia}</span>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-7">
          {dias.map((dia) => (
            <div
              className={cn(
                "min-h-36 rounded-xl border bg-background/55 p-2 text-sm transition hover:border-cyan-300/45 hover:bg-cyan-500/5",
                dia.foraDoMes && "bg-background/25 text-muted-foreground"
              )}
              key={dia.data}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="font-semibold">{dia.numero}</span>
                {eventosDoDia(dia).length > 0 ? (
                  <Badge variant="outline">{eventosDoDia(dia).length}</Badge>
                ) : null}
              </div>
              <div className="space-y-1.5">
                {eventosDoDia(dia)
                  .slice(0, 5)
                  .map((evento) => (
                    <EventoCompacto evento={evento} key={evento.id} />
                  ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function VisaoSemanal({ dias }: { dias: DiaCalendario[] }) {
  return (
    <Card className="admin-glass-card">
      <CardContent className="overflow-x-auto p-4">
        <div className="min-w-[860px]">
          <div className="grid grid-cols-[4rem_repeat(7,1fr)] gap-2 border-b pb-3 text-xs font-semibold text-muted-foreground">
            <span />
            {dias.map((dia) => (
              <div className="text-center" key={dia.data}>
                <p>{formatarDiaSemana(dia.data)}</p>
                <p className="text-base text-foreground">{dia.numero}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-[4rem_repeat(7,1fr)] gap-2">
            {HORARIOS_SEMANA.map((hora) => (
              <TimeRow dias={dias} hora={hora} key={hora} />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TimeRow({ dias, hora }: { dias: DiaCalendario[]; hora: string }) {
  return (
    <>
      <div className="border-r py-4 pr-2 text-right text-xs text-muted-foreground">{hora}</div>
      {dias.map((dia) => (
        <div className="min-h-24 border-b py-2" key={`${dia.data}-${hora}`}>
          {eventosDoDia(dia)
            .filter((evento) => evento.hora === hora || (hora === "14h" && evento.tipo === "reserva"))
            .slice(0, 4)
            .map((evento) => (
              <EventoCompacto evento={evento} key={evento.id} />
            ))}
        </div>
      ))}
    </>
  );
}

function VisaoAgenda({ eventos }: { eventos: EventoCalendario[] }) {
  const eventosPorData = eventos.reduce<Record<string, EventoCalendario[]>>((acc, evento) => {
    acc[evento.data] = [...(acc[evento.data] ?? []), evento];
    return acc;
  }, {});

  return (
    <Card className="admin-glass-card">
      <CardContent className="space-y-4 p-5">
        {Object.entries(eventosPorData).length > 0 ? (
          Object.entries(eventosPorData).map(([data, itens]) => (
            <div className="rounded-xl border bg-background/45 p-4" key={data}>
              <h3 className="text-sm font-semibold">{formatarDataLonga(data)}</h3>
              <div className="mt-3 space-y-2">
                {itens.map((evento) => (
                  <div className="flex items-center gap-3 rounded-lg border bg-background/55 p-3 text-sm" key={evento.id}>
                    <span className={cn("h-2.5 w-2.5 rounded-full", COR_LEGENDA[evento.tipo])} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{evento.titulo}</p>
                      <p className="truncate text-xs text-muted-foreground">{evento.detalhe}</p>
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground">{evento.hora}</span>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <EstadoVazio mensagem="Nenhum evento encontrado para esta agenda." />
        )}
      </CardContent>
    </Card>
  );
}

function PainelLateral({
  blocos,
  limpezas,
  manutencoes,
  reservas,
  resumo
}: {
  blocos: BlocoCalendario[];
  limpezas: LimpezaCalendario[];
  manutencoes: ManutencaoCalendario[];
  reservas: ReservaCalendario[];
  resumo: DadosModuloCalendario["resumo"];
}) {
  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <aside className="space-y-4">
      <Card className="admin-glass-card">
        <CardContent className="space-y-3 p-5">
          <h2 className="text-sm font-semibold">Proximos movimentos</h2>
          <ResumoLinha label="Check-ins" valor={String(resumo.checkInsProximos)} />
          <ResumoLinha label="Check-outs" valor={String(resumo.checkOutsProximos)} />
          <ResumoLinha label="Limpezas pendentes" valor={String(resumo.limpezasPendentes)} />
          <ResumoLinha label="Bloqueios ativos" valor={String(resumo.bloqueiosAtivos)} />
          <ResumoLinha label="Reservas futuras" valor={String(reservas.filter((reserva) => reserva.check_in >= hoje).length)} />
        </CardContent>
      </Card>

      <ListaLateral
        icon={<Clock3 />}
        itens={reservas.filter((reserva) => reserva.check_in >= hoje).slice(0, 5).map((reserva) => ({
          detalhe: reserva.hospedePrincipal?.full_name ?? "Hospede",
          id: reserva.id,
          titulo: `Check-in ${formatarData(reserva.check_in)}`
        }))}
        titulo="Proximos check-ins"
      />
      <ListaLateral
        icon={<Sparkles />}
        itens={limpezas.filter((limpeza) => limpeza.status !== "completed").slice(0, 5).map((limpeza) => ({
          detalhe: limpeza.status,
          id: limpeza.id,
          titulo: limpeza.title
        }))}
        titulo="Limpezas pendentes"
      />
      <ListaLateral
        icon={<LockKeyhole />}
        itens={blocos.slice(0, 5).map((bloco) => ({
          detalhe: formatarPeriodo(bloco.starts_on, bloco.ends_on),
          id: bloco.id,
          titulo: bloco.reason ?? "Bloqueio manual"
        }))}
        titulo="Bloqueios ativos"
      />
      <ListaLateral
        icon={<Wrench />}
        itens={manutencoes.filter((manutencao) => manutencao.status === "pending").slice(0, 5).map((manutencao) => ({
          detalhe: manutencao.scheduled_for ? formatarData(manutencao.scheduled_for) : "Sem data",
          id: manutencao.id,
          titulo: manutencao.title
        }))}
        titulo="Manutencoes"
      />
    </aside>
  );
}

function EventoCompacto({ evento }: { evento: EventoCalendario }) {
  return (
    <div className={cn("rounded-lg border px-2 py-1 text-xs", ESTILO_EVENTO[evento.tipo])}>
      <div className="flex items-center gap-1.5">
        <span className={cn("h-2 w-2 shrink-0 rounded-full", COR_LEGENDA[evento.tipo])} />
        <span className="truncate font-semibold">{evento.titulo}</span>
      </div>
      <p className="truncate opacity-80">{evento.hora} - {evento.detalhe}</p>
    </div>
  );
}

function Legenda() {
  const itens: Array<[EventoCalendario["tipo"], string]> = [
    ["reserva", "Reserva confirmada"],
    ["checkin", "Check-in"],
    ["checkout", "Check-out"],
    ["bloqueio", "Bloqueio"],
    ["manutencao", "Manutencao"],
    ["limpeza", "Limpeza"]
  ];

  return (
    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
      {itens.map(([tipo, label]) => (
        <span className="inline-flex items-center gap-1.5 rounded-full border bg-background/55 px-3 py-1" key={tipo}>
          <Circle className={cn("h-2.5 w-2.5 fill-current", COR_LEGENDA[tipo])} />
          {label}
        </span>
      ))}
    </div>
  );
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

function ResumoLinha({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-background/45 px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{valor}</span>
    </div>
  );
}

function ListaLateral({
  icon,
  itens,
  titulo
}: {
  icon: ReactNode;
  itens: Array<{ detalhe: string; id: string; titulo: string }>;
  titulo: string;
}) {
  return (
    <Card className="admin-glass-card">
      <CardContent className="space-y-3 p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <span className="text-primary [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
          {titulo}
        </h2>
        {itens.length > 0 ? (
          itens.map((item) => (
            <div className="rounded-lg border bg-background/45 p-3 text-sm" key={item.id}>
              <p className="font-medium">{item.titulo}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.detalhe}</p>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">Sem itens no periodo.</p>
        )}
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

function eventosDoDia(dia: DiaCalendario): EventoCalendario[] {
  return [
    ...dia.reservas
      .filter((reserva) => reserva.status !== "cancelled")
      .map((reserva) => criarEventoReserva(reserva, dia.data)),
    ...dia.checkIns.map((reserva) => criarEventoOperacional(reserva, "checkin")),
    ...dia.checkOuts.map((reserva) => criarEventoOperacional(reserva, "checkout")),
    ...dia.blocos.map((bloco) => criarEventoBloqueio(bloco, dia.data)),
    ...dia.manutencoes.map((manutencao) => criarEventoManutencao(manutencao)),
    ...dia.limpezas.map((limpeza) => criarEventoLimpeza(limpeza))
  ].sort((a, b) => a.hora.localeCompare(b.hora));
}

function montarEventos(dias: DiaCalendario[]) {
  return dias.flatMap(eventosDoDia).sort((a, b) => `${a.data}${a.hora}`.localeCompare(`${b.data}${b.hora}`));
}

function criarEventoReserva(reserva: ReservaCalendario, data: string): EventoCalendario {
  return {
    data,
    detalhe: reserva.hospedePrincipal?.full_name ?? "Hospede nao informado",
    hora: "14h",
    id: `reserva-${reserva.id}-${data}`,
    tipo: "reserva",
    titulo: "Reserva confirmada"
  };
}

function criarEventoOperacional(
  reserva: ReservaCalendario,
  tipo: "checkin" | "checkout"
): EventoCalendario {
  return {
    data: tipo === "checkin" ? reserva.check_in : reserva.check_out,
    detalhe: reserva.hospedePrincipal?.full_name ?? "Hospede nao informado",
    hora: tipo === "checkin" ? "14h" : "10h",
    id: `${tipo}-${reserva.id}`,
    tipo,
    titulo: tipo === "checkin" ? "Check-in" : "Check-out"
  };
}

function criarEventoBloqueio(bloco: BlocoCalendario, data: string): EventoCalendario {
  const manutencao = bloco.reason?.toLowerCase().includes("manutenc");
  return {
    data,
    detalhe: bloco.reason ?? "Bloqueio manual",
    hora: manutencao ? "08h" : "09h",
    id: `bloqueio-${bloco.id}-${data}`,
    tipo: manutencao ? "manutencao" : "bloqueio",
    titulo: manutencao ? "Manutencao" : "Bloqueio manual"
  };
}

function criarEventoManutencao(manutencao: ManutencaoCalendario): EventoCalendario {
  return {
    data: manutencao.scheduled_for ?? new Date().toISOString().slice(0, 10),
    detalhe: manutencao.notes ?? manutencao.priority,
    hora: "08h",
    id: `manutencao-${manutencao.id}`,
    tipo: "manutencao",
    titulo: manutencao.title
  };
}

function criarEventoLimpeza(limpeza: LimpezaCalendario): EventoCalendario {
  return {
    data: limpeza.scheduled_for ?? new Date().toISOString().slice(0, 10),
    detalhe: limpeza.status,
    hora: "11h",
    id: `limpeza-${limpeza.id}`,
    tipo: "limpeza",
    titulo: limpeza.title
  };
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

function formatarPeriodo(inicio: string, fim: string) {
  return `${formatarData(inicio)} - ${formatarData(fim)}`;
}

function formatarData(valor: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: "UTC"
  }).format(new Date(`${valor}T00:00:00Z`));
}

function formatarDataLonga(valor: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    timeZone: "UTC"
  }).format(new Date(`${valor}T00:00:00Z`));
}

function formatarDiaSemana(valor: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    timeZone: "UTC"
  }).format(new Date(`${valor}T00:00:00Z`));
}

function formatarMes(mes: string) {
  const [ano = "2026", numeroMes = "01"] = mes.split("-");
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    timeZone: "UTC",
    year: "numeric"
  }).format(new Date(Date.UTC(Number(ano), Number(numeroMes) - 1, 1)));
}
