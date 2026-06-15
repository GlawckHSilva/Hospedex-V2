import {
  CalendarDays,
  DoorOpen,
  LockKeyhole,
  Search,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

import { Badge, Button, Card, CardContent, FadeIn, Input, Label } from "@hospedex/ui";

import { ModuleToast } from "../admin/module-toast";
import { bloquearPeriodoCalendarioAction } from "../../lib/calendar/actions";
import {
  LABEL_STATUS_BLOQUEIO,
  STATUS_BLOQUEIO_CALENDARIO,
  type DadosModuloCalendario,
  type SearchParamsCalendario
} from "../../lib/calendar/types";
import { CalendarDayCell } from "./calendar-day-cell";

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

export function CalendarModule({
  blocos,
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
  const unidadesDoFormulario = filtros.propriedadeId
    ? unidades.filter((unidade) => unidade.property_id === filtros.propriedadeId)
    : unidades;
  const bloqueado = !podeGerenciar || propriedades.length === 0 || unidadesDoFormulario.length === 0;

  return (
    <FadeIn className="space-y-5">
      <ModuleToast
        erro={erro}
        mensagensSucesso={MENSAGENS_SUCESSO_CALENDARIO}
        sucesso={sucesso}
      />

      <section className="admin-glass-panel relative overflow-hidden p-5">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Badge variant={podeGerenciar ? "info" : "warning"}>
              {podeGerenciar ? "Calendario editavel" : "Somente leitura"}
            </Badge>
            <h1 className="mt-3 text-2xl font-semibold tracking-normal">
              Calendario e disponibilidade
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{tenantNome}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Resumo icon={<LockKeyhole />} label="Bloqueios" valor={String(resumo.bloqueiosAtivos)} />
            <Resumo icon={<CalendarDays />} label="Reservas" valor={String(resumo.reservasAtivas)} />
            <Resumo
              icon={<DoorOpen />}
              label="Unidades ativas"
              valor={String(resumo.unidadesDisponiveis)}
            />
            <Resumo
              icon={<ShieldCheck />}
              label="Overbooking"
              valor={String(resumo.conflitosPermitidos)}
            />
          </div>
        </div>
      </section>

      <Card className="admin-glass-card">
        <CardContent className="p-5">
          <form className="grid gap-4 lg:grid-cols-[0.6fr_1fr_1fr_auto]">
            <CampoTexto
              defaultValue={filtros.mes}
              label="Mes"
              name="mes"
              required
              type="month"
            />
            <CampoPropriedade
              defaultValue={filtros.propriedadeId ?? ""}
              propriedades={propriedades}
            />
            <CampoUnidade defaultValue={filtros.unidadeId ?? ""} unidades={unidades} />
            <div className="flex items-end">
              <Button className="w-full" type="submit" variant="outline">
                <Search />
                Filtrar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="admin-glass-card">
        <CardContent className="p-5">
          <details open={reservas.length === 0 && blocos.length === 0}>
            <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4" />
              Bloquear periodo manualmente
            </summary>

            <form action={bloquearPeriodoCalendarioAction} className="mt-5 grid gap-4">
              <input name="mes" type="hidden" value={filtros.mes} />
              <input name="filtroPropriedadeId" type="hidden" value={filtros.propriedadeId ?? ""} />
              <input name="filtroUnidadeId" type="hidden" value={filtros.unidadeId ?? ""} />

              <div className="grid gap-4 lg:grid-cols-2">
                <CampoPropriedade
                  defaultValue={filtros.propriedadeId ?? propriedades[0]?.id ?? ""}
                  disabled={bloqueado}
                  permitirTodos={false}
                  propriedades={propriedades}
                />
                <CampoUnidade
                  defaultValue={filtros.unidadeId ?? unidadesDoFormulario[0]?.id ?? ""}
                  disabled={bloqueado}
                  permitirTodos={false}
                  unidades={unidadesDoFormulario}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <CampoTexto
                  disabled={bloqueado}
                  label="Inicio"
                  name="inicio"
                  required
                  type="date"
                />
                <CampoTexto disabled={bloqueado} label="Fim" name="fim" required type="date" />
                <CampoStatus disabled={bloqueado} />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <CampoTexto
                  disabled={bloqueado}
                  label="Motivo"
                  name="motivo"
                  placeholder="Manutencao, uso proprio..."
                  required
                />
                <CampoArea disabled={bloqueado} label="Observacoes" name="observacoes" />
              </div>

              <div className="flex justify-end">
                <Button disabled={bloqueado} type="submit">
                  <LockKeyhole />
                  Bloquear datas
                </Button>
              </div>
            </form>
          </details>
        </CardContent>
      </Card>

      {propriedades.length === 0 ? (
        <EstadoVazio mensagem="Cadastre uma propriedade antes de gerenciar disponibilidade." />
      ) : unidades.length === 0 ? (
        <EstadoVazio mensagem="Cadastre uma unidade para usar o calendario." />
      ) : (
        <Card className="admin-glass-card">
          <CardContent className="space-y-4 p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold">{formatarMes(filtros.mes)}</h2>
              <Badge variant="outline">{reservas.length + blocos.length} evento(s)</Badge>
            </div>

            <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-muted-foreground">
              {["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"].map((dia) => (
                <span key={dia}>{dia}</span>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-7">
              {dias.map((dia) => (
                <CalendarDayCell
                  dia={dia}
                  key={dia.data}
                  mes={filtros.mes}
                  podeGerenciar={podeGerenciar}
                  propriedadeId={filtros.propriedadeId}
                  unidadeId={filtros.unidadeId}
                />
              ))}
            </div>

            {reservas.length === 0 && blocos.length === 0 ? (
              <div className="rounded-lg border border-dashed bg-background/45 p-4 text-sm text-muted-foreground">
                Nenhuma reserva ou indisponibilidade encontrada para o filtro atual.
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </FadeIn>
  );
}

function Resumo({
  icon,
  label,
  valor
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

function EstadoVazio({ mensagem }: { mensagem: string }) {
  return (
    <Card className="admin-glass-card">
      <CardContent className="p-5 text-sm text-muted-foreground">{mensagem}</CardContent>
    </Card>
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

function CampoArea({
  disabled,
  label,
  name
}: {
  disabled: boolean;
  label: string;
  name: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <textarea className={areaClasse} disabled={disabled} id={name} name={name} />
    </div>
  );
}

function CampoPropriedade({
  defaultValue,
  disabled,
  permitirTodos = true,
  propriedades
}: {
  defaultValue: string;
  disabled?: boolean;
  permitirTodos?: boolean;
  propriedades: Array<{ id: string; name: string }>;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="propriedadeId">Propriedade</Label>
      <select
        className={campoClasse}
        defaultValue={defaultValue}
        disabled={disabled}
        id="propriedadeId"
        name="propriedadeId"
      >
        {permitirTodos ? <option value="">Todas</option> : null}
        {propriedades.map((propriedade) => (
          <option key={propriedade.id} value={propriedade.id}>
            {propriedade.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function CampoUnidade({
  defaultValue,
  disabled,
  permitirTodos = true,
  unidades
}: {
  defaultValue: string;
  disabled?: boolean;
  permitirTodos?: boolean;
  unidades: Array<{ id: string; name: string }>;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="unidadeId">Unidade</Label>
      <select
        className={campoClasse}
        defaultValue={defaultValue}
        disabled={disabled}
        id="unidadeId"
        name="unidadeId"
      >
        {permitirTodos ? <option value="">Todas</option> : null}
        {unidades.map((unidade) => (
          <option key={unidade.id} value={unidade.id}>
            {unidade.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function CampoStatus({ disabled }: { disabled: boolean }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="status">Status</Label>
      <select className={campoClasse} disabled={disabled} id="status" name="status">
        {STATUS_BLOQUEIO_CALENDARIO.map((status) => (
          <option key={status} value={status}>
            {LABEL_STATUS_BLOQUEIO[status]}
          </option>
        ))}
      </select>
    </div>
  );
}

function formatarMes(mes: string) {
  const [ano = "2026", numeroMes = "01"] = mes.split("-");
  const data = new Date(Date.UTC(Number(ano), Number(numeroMes) - 1, 1));
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(data);
}
