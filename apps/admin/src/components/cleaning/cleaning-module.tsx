import {
  Calendar,
  CalendarCheck2,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  Grid2X2,
  Home,
  LayoutList,
  LogIn,
  LogOut,
  Phone,
  Plus,
  Sparkles,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Badge, Button, Card, CardContent, FadeIn, Label, cn } from "@hospedex/ui";

import { ModuleToast } from "../admin/module-toast";
import { ConfirmDialog, EntityModal } from "../management/entity-modal";
import { EmptyState } from "../management/entity-card";
import {
  confirmarCheckInAction,
  confirmarCheckOutAction,
} from "../../lib/cleaning/actions";
import type {
  DadosModuloLimpeza,
  ReservaOperacional,
  SearchParamsLimpeza,
  TarefaLimpezaCompleta,
} from "../../lib/cleaning/types";
import {
  LABEL_STATUS_TAREFA_LIMPEZA,
  STATUS_TAREFA_LIMPEZA,
} from "../../lib/cleaning/types";
import { CleaningTaskCard } from "./cleaning-task-card";
import { CleaningTaskForm } from "./cleaning-task-form";

/**
 * Modulo visual de operacao diaria.
 *
 * A tela prioriza decisoes de rotina do proprietario. As regras sensiveis de
 * tenant, permissoes, check-in, check-out e criacao de limpeza continuam nas
 * server actions para evitar manipulacao client-side.
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
  statusLimpeza = "todas",
  sucesso,
  tarefas,
  visual = "grade",
}: CleaningModuleProps) {
  const reservasOperacionais = removerReservasDuplicadas([
    ...checkInsHoje,
    ...checkOutsHoje,
  ]);
  const tarefasFiltradas = filtrarTarefas(tarefas, statusLimpeza);
  const tarefasPendentes = tarefas.filter((tarefa) =>
    ["awaiting_cleaning", "in_cleaning"].includes(tarefa.status)
  );
  const tarefasConcluidasHoje = tarefas.filter(
    (tarefa) =>
      tarefa.status === "completed" &&
      (tarefa.completed_at?.startsWith(hoje) || tarefa.scheduled_for === hoje)
  );
  const tarefasAtrasadas = tarefas.filter((tarefa) => tarefaEhAtrasada(tarefa, hoje));
  const modoLista = visual === "lista";

  return (
    <FadeIn className="space-y-5">
      <ModuleToast
        erro={erro}
        mensagensSucesso={MENSAGENS_SUCESSO_LIMPEZA}
        sucesso={sucesso}
      />

      <section className="admin-glass-panel space-y-5 p-4 sm:p-5">
        <div className="grid gap-4 xl:grid-cols-[1fr_auto_auto] xl:items-start">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">
              Operacao do dia
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Acompanhe entradas, saidas e tarefas de limpeza.
            </p>
          </div>

          <SeletorData dataAtual={hoje} statusLimpeza={statusLimpeza} visual={visual} />

          <BotaoNovaTarefa
            podeGerenciarLimpeza={podeGerenciarLimpeza}
            propriedades={propriedades}
            reservas={reservasOperacionais}
            responsaveis={responsaveis}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <ResumoOperacao
            descricao="Entradas previstas"
            icon={<LogIn />}
            label="Check-ins hoje"
            tone="success"
            valor={checkInsHoje.length}
          />
          <ResumoOperacao
            descricao="Saidas previstas"
            icon={<LogOut />}
            label="Check-outs hoje"
            tone="warning"
            valor={checkOutsHoje.length}
          />
          <ResumoOperacao
            descricao="Aguardando execucao"
            icon={<Sparkles />}
            label="Limpezas pendentes"
            tone="info"
            valor={tarefasPendentes.length}
          />
          <ResumoOperacao
            descricao="Concluidas no dia"
            icon={<Check />}
            label="Limpezas concluidas"
            tone="purple"
            valor={tarefasConcluidasHoje.length}
          />
          <ResumoOperacao
            descricao="Necessitam atencao"
            icon={<Clock3 />}
            label="Atrasadas"
            tone="danger"
            valor={tarefasAtrasadas.length}
          />
        </div>
      </section>

      {!limpezaAtiva ? (
        <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          O modulo de limpeza esta desativado para este tenant. As tarefas ficam
          somente para consulta.
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-2">
        <SecaoOperacional
          action={confirmarCheckInAction}
          disabled={!podeGerenciarOperacao}
          icon={<LogIn />}
          podeGerenciarLimpeza={podeGerenciarLimpeza}
          propriedades={propriedades}
          reservas={checkInsHoje}
          reservasOperacionais={reservasOperacionais}
          responsaveis={responsaveis}
          tipo="checkin"
          titulo="Check-ins do dia"
          vazio="Nenhum check-in previsto para esta data."
        />
        <SecaoOperacional
          action={confirmarCheckOutAction}
          disabled={!podeGerenciarOperacao}
          icon={<LogOut />}
          podeGerenciarLimpeza={podeGerenciarLimpeza}
          propriedades={propriedades}
          reservas={checkOutsHoje}
          reservasOperacionais={reservasOperacionais}
          responsaveis={responsaveis}
          tipo="checkout"
          titulo="Check-outs do dia"
          vazio="Nenhum check-out previsto para esta data."
        />
      </div>

      <Card className="admin-glass-card">
        <CardContent className="space-y-5 p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-cyan-300">
                <Sparkles className="h-4 w-4" />
                <h2 className="text-lg font-semibold text-foreground">
                  Tarefas de limpeza
                </h2>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Organize limpezas manuais ou geradas apos check-out.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <FiltroStatusLimpeza
                dataAtual={hoje}
                statusLimpeza={statusLimpeza}
                visual={visual}
              />
              <AlternadorVisual
                dataAtual={hoje}
                statusLimpeza={statusLimpeza}
                visual={visual}
              />
            </div>
          </div>

          {tarefasFiltradas.length > 0 ? (
            <div
              className={cn(
                "grid gap-4",
                modoLista ? "grid-cols-1" : "md:grid-cols-2 2xl:grid-cols-3"
              )}
            >
              {tarefasFiltradas.map((tarefa) => (
                <CleaningTaskCard
                  hoje={hoje}
                  key={tarefa.id}
                  podeGerenciar={podeGerenciarLimpeza}
                  propriedades={propriedades}
                  reservas={reservasOperacionais}
                  responsaveis={responsaveis}
                  tarefa={tarefa}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              description="Quando houver tarefas para o filtro selecionado, elas aparecem aqui."
              icon={<Sparkles className="h-5 w-5" />}
              title="Nenhuma tarefa de limpeza encontrada"
            />
          )}
        </CardContent>
      </Card>

      <div className="rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100/90">
        Avisos de operacao, historico de reserva e tarefas concluidas continuam
        registrados nos modulos correspondentes.
      </div>
    </FadeIn>
  );
}

function BotaoNovaTarefa({
  podeGerenciarLimpeza,
  propriedades,
  reservas,
  responsaveis,
}: {
  podeGerenciarLimpeza: boolean;
  propriedades: CleaningModuleProps["propriedades"];
  reservas: ReservaOperacional[];
  responsaveis: CleaningModuleProps["responsaveis"];
}) {
  return (
    <EntityModal
      description="Informe casa, reserva vinculada e responsavel pela limpeza."
      disabled={!podeGerenciarLimpeza}
      eyebrow="Limpeza"
      size="lg"
      title="Nova tarefa de limpeza"
      triggerAction="add"
      triggerClassName="w-full sm:w-auto"
      triggerIcon={<Plus className="h-4 w-4" />}
      triggerLabel="Nova tarefa"
      triggerSize="md"
    >
      <CleaningTaskForm
        modo="criar"
        podeGerenciar={podeGerenciarLimpeza}
        propriedades={propriedades}
        reservas={reservas}
        responsaveis={responsaveis}
      />
    </EntityModal>
  );
}

function SeletorData({
  dataAtual,
  statusLimpeza,
  visual,
}: {
  dataAtual: string;
  statusLimpeza: SearchParamsLimpeza["statusLimpeza"];
  visual: SearchParamsLimpeza["visual"];
}) {
  const hojeSistema = obterHojeSaoPaulo();
  const textoData =
    dataAtual === hojeSistema
      ? `Hoje, ${formatarDataCurta(dataAtual)}`
      : formatarDataLonga(dataAtual);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/80 bg-background/45 p-1.5">
      <Link
        aria-label="Dia anterior"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card/70 text-cyan-200 transition hover:border-cyan-300/50 hover:bg-cyan-500/10"
        href={montarHrefLimpeza(deslocarData(dataAtual, -1), statusLimpeza, visual)}
      >
        <ChevronLeft className="h-4 w-4" />
      </Link>
      <div className="inline-flex h-9 min-w-48 items-center justify-center gap-2 rounded-lg border border-border bg-card/70 px-4 text-sm font-medium">
        <Calendar className="h-4 w-4 text-cyan-300" />
        {textoData}
      </div>
      <Link
        aria-label="Proximo dia"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card/70 text-cyan-200 transition hover:border-cyan-300/50 hover:bg-cyan-500/10"
        href={montarHrefLimpeza(deslocarData(dataAtual, 1), statusLimpeza, visual)}
      >
        <ChevronRight className="h-4 w-4" />
      </Link>
      <Link
        className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-card/70 px-4 text-sm font-semibold transition hover:border-cyan-300/50 hover:bg-cyan-500/10"
        href={montarHrefLimpeza(hojeSistema, statusLimpeza, visual)}
      >
        Hoje
      </Link>
    </div>
  );
}

function ResumoOperacao({
  descricao,
  icon,
  label,
  tone,
  valor,
}: {
  descricao: string;
  icon: ReactNode;
  label: string;
  tone: "success" | "warning" | "info" | "purple" | "danger";
  valor: number;
}) {
  const classes = {
    danger: "from-red-500/16 to-red-500/4 text-red-300 after:bg-red-400",
    info: "from-cyan-500/16 to-cyan-500/4 text-cyan-300 after:bg-cyan-400",
    purple: "from-violet-500/16 to-violet-500/4 text-violet-300 after:bg-violet-400",
    success: "from-emerald-500/16 to-emerald-500/4 text-emerald-300 after:bg-emerald-400",
    warning: "from-orange-500/16 to-orange-500/4 text-orange-300 after:bg-orange-400",
  }[tone];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border/80 bg-gradient-to-br p-4 shadow-sm after:absolute after:inset-x-0 after:bottom-0 after:h-1",
        classes
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-current/20 bg-current/10 [&_svg]:h-5 [&_svg]:w-5">
          {icon}
        </span>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{valor}</p>
          <p className="mt-2 text-xs text-muted-foreground">{descricao}</p>
        </div>
      </div>
    </div>
  );
}

function SecaoOperacional({
  action,
  disabled,
  icon,
  podeGerenciarLimpeza,
  propriedades,
  reservas,
  reservasOperacionais,
  responsaveis,
  tipo,
  titulo,
  vazio,
}: {
  action: (formData: FormData) => Promise<void>;
  disabled: boolean;
  icon: ReactNode;
  podeGerenciarLimpeza: boolean;
  propriedades: CleaningModuleProps["propriedades"];
  reservas: ReservaOperacional[];
  reservasOperacionais: ReservaOperacional[];
  responsaveis: CleaningModuleProps["responsaveis"];
  tipo: "checkin" | "checkout";
  titulo: string;
  vazio: string;
}) {
  const hrefReservas =
    tipo === "checkin"
      ? "/reservas?status=confirmed"
      : "/reservas?status=checked_in";

  return (
    <Card className="admin-glass-card">
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-cyan-300 [&_svg]:h-4 [&_svg]:w-4",
              tipo === "checkout" && "text-orange-300"
            )}
          >
            {icon}
          </span>
          <h2 className="text-lg font-semibold">{titulo}</h2>
        </div>

        {reservas.length > 0 ? (
          <div className="space-y-3">
            {reservas.map((reserva) => (
              <ReservaOperacaoCard
                action={action}
                disabled={disabled}
                key={reserva.id}
                podeGerenciarLimpeza={podeGerenciarLimpeza}
                propriedades={propriedades}
                reserva={reserva}
                reservasOperacionais={reservasOperacionais}
                responsaveis={responsaveis}
                tipo={tipo}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-border/80 bg-background/45 p-4 text-sm text-muted-foreground">
            {vazio}
          </p>
        )}

        <Link
          className="mx-auto flex w-fit items-center gap-2 text-sm font-semibold text-cyan-300 transition hover:text-cyan-100"
          href={hrefReservas}
        >
          {tipo === "checkin" ? "Ver todos check-ins" : "Ver todos check-outs"}
          <ChevronRight className="h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  );
}

function ReservaOperacaoCard({
  action,
  disabled,
  podeGerenciarLimpeza,
  propriedades,
  reserva,
  reservasOperacionais,
  responsaveis,
  tipo,
}: {
  action: (formData: FormData) => Promise<void>;
  disabled: boolean;
  podeGerenciarLimpeza: boolean;
  propriedades: CleaningModuleProps["propriedades"];
  reserva: ReservaOperacional;
  reservasOperacionais: ReservaOperacional[];
  responsaveis: CleaningModuleProps["responsaveis"];
  tipo: "checkin" | "checkout";
}) {
  const nomeHospede = reserva.hospedePrincipal?.full_name ?? "Hospede nao informado";
  const telefone = reserva.hospedePrincipal?.phone ?? "Telefone nao informado";
  const casa = reserva.propriedade?.name ?? "Casa nao informada";
  const horario =
    tipo === "checkin" ? reserva.expected_checkin_time : reserva.expected_checkout_time;
  const acaoLabel = tipo === "checkin" ? "Confirmar check-in" : "Confirmar check-out";
  const descricaoConfirmacao =
    tipo === "checkin"
      ? "Ao confirmar, a reserva passa para status hospedado."
      : "Ao confirmar, a reserva registra check-out e pode gerar tarefa de limpeza.";

  return (
    <article className="rounded-xl border border-border/80 bg-background/45 p-4">
      <div className="grid gap-4 lg:grid-cols-[auto_1fr_auto] lg:items-start">
        <div className="space-y-2 text-sm font-semibold text-cyan-300">
          <p>{formatarHorario(horario, tipo === "checkin" ? "Entrada" : "Saida")}</p>
          <div className="grid h-10 w-10 place-items-center rounded-full border border-cyan-300/20 bg-cyan-500/15 text-sm text-cyan-100">
            {obterIniciais(nomeHospede)}
          </div>
        </div>

        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold">{nomeHospede}</h3>
            <Badge variant={tipo === "checkin" ? "success" : "warning"}>
              {tipo === "checkin" ? "Confirmado" : "Previsto"}
            </Badge>
          </div>
          <div className="grid gap-1 text-sm text-muted-foreground">
            <LinhaIcone icon={<Phone />} texto={telefone} />
            <LinhaIcone icon={<Home />} texto={casa} />
            <LinhaIcone icon={<CalendarCheck2 />} texto={reserva.code} />
            <LinhaIcone
              icon={<UserRound />}
              texto={`${reserva.guests_count} ${reserva.guests_count === 1 ? "hospede" : "hospedes"}`}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        <ConfirmDialog
          description={descricaoConfirmacao}
          disabled={disabled}
          title={acaoLabel}
          triggerAction={tipo === "checkin" ? "add" : "status"}
          triggerClassName="min-h-10 justify-center"
          triggerIcon={<Check className="h-4 w-4" />}
          triggerLabel={acaoLabel}
        >
          <form action={action} className="grid gap-3">
            <input name="reservaId" type="hidden" value={reserva.id} />
            <div className="grid gap-2">
              <Label htmlFor={`observacao-${tipo}-${reserva.id}`}>
                Observacao
              </Label>
              <textarea
                className={areaClasse}
                disabled={disabled}
                id={`observacao-${tipo}-${reserva.id}`}
                name="observacao"
                placeholder="Opcional"
              />
            </div>
            <Button disabled={disabled} type="submit">
              {acaoLabel}
            </Button>
          </form>
        </ConfirmDialog>

        {tipo === "checkout" ? (
          <EntityModal
            description="Crie uma tarefa manual vinculada a este check-out quando precisar organizar a limpeza antes da confirmacao."
            disabled={!podeGerenciarLimpeza}
            eyebrow="Limpeza"
            title="Gerar limpeza"
            triggerAction="edit"
            triggerClassName="min-h-10 justify-center"
            triggerIcon={<Sparkles className="h-4 w-4" />}
            triggerLabel="Gerar limpeza"
          >
            <CleaningTaskForm
              modo="criar"
              podeGerenciar={podeGerenciarLimpeza}
              propriedades={propriedades}
              reservas={reservasOperacionais}
              responsaveis={responsaveis}
              valoresPadrao={{
                propertyId: reserva.property_id,
                reservationId: reserva.id,
                scheduledFor: reserva.check_out,
                status: "awaiting_cleaning",
                title: `Limpeza apos check-out ${reserva.code}`,
              }}
            />
          </EntityModal>
        ) : null}

        <Link
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card/55 px-3.5 py-2 text-sm font-semibold transition hover:border-cyan-300/40 hover:bg-cyan-500/10"
          href={`/reservas?busca=${encodeURIComponent(reserva.code)}`}
        >
          Ver reserva
          <Eye className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}

function LinhaIcone({ icon, texto }: { icon: ReactNode; texto: string }) {
  return (
    <p className="flex min-w-0 items-center gap-2">
      <span className="text-cyan-300 [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
      <span className="min-w-0 truncate">{texto}</span>
    </p>
  );
}

function FiltroStatusLimpeza({
  dataAtual,
  statusLimpeza,
  visual,
}: {
  dataAtual: string;
  statusLimpeza: SearchParamsLimpeza["statusLimpeza"];
  visual: SearchParamsLimpeza["visual"];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-muted-foreground">Status:</span>
      {["todas", ...STATUS_TAREFA_LIMPEZA].map((status) => {
        const ativo = statusLimpeza === status || (!statusLimpeza && status === "todas");
        return (
          <Link
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
              ativo
                ? "border-cyan-300/45 bg-cyan-500/15 text-cyan-100"
                : "border-border bg-card/45 text-muted-foreground hover:border-cyan-300/35 hover:text-cyan-100"
            )}
            href={montarHrefLimpeza(
              dataAtual,
              status as SearchParamsLimpeza["statusLimpeza"],
              visual
            )}
            key={status}
          >
            {status === "todas"
              ? "Todas"
              : LABEL_STATUS_TAREFA_LIMPEZA[status as TarefaLimpezaCompleta["status"]]}
          </Link>
        );
      })}
    </div>
  );
}

function AlternadorVisual({
  dataAtual,
  statusLimpeza,
  visual,
}: {
  dataAtual: string;
  statusLimpeza: SearchParamsLimpeza["statusLimpeza"];
  visual: SearchParamsLimpeza["visual"];
}) {
  return (
    <div className="flex w-fit overflow-hidden rounded-xl border border-border bg-background/45 p-1">
      <Link
        aria-label="Visualizar em lista"
        className={cn(
          "grid h-8 w-9 place-items-center rounded-lg text-muted-foreground transition hover:text-cyan-100",
          visual === "lista" && "bg-cyan-500/15 text-cyan-100"
        )}
        href={montarHrefLimpeza(dataAtual, statusLimpeza, "lista")}
      >
        <LayoutList className="h-4 w-4" />
      </Link>
      <Link
        aria-label="Visualizar em grade"
        className={cn(
          "grid h-8 w-9 place-items-center rounded-lg text-muted-foreground transition hover:text-cyan-100",
          visual !== "lista" && "bg-cyan-500/15 text-cyan-100"
        )}
        href={montarHrefLimpeza(dataAtual, statusLimpeza, "grade")}
      >
        <Grid2X2 className="h-4 w-4" />
      </Link>
    </div>
  );
}

function filtrarTarefas(
  tarefas: TarefaLimpezaCompleta[],
  statusLimpeza: SearchParamsLimpeza["statusLimpeza"]
) {
  if (!statusLimpeza || statusLimpeza === "todas") return tarefas;
  return tarefas.filter((tarefa) => tarefa.status === statusLimpeza);
}

function removerReservasDuplicadas(reservas: ReservaOperacional[]) {
  const mapa = new Map<string, ReservaOperacional>();
  reservas.forEach((reserva) => mapa.set(reserva.id, reserva));
  return Array.from(mapa.values());
}

function tarefaEhAtrasada(tarefa: TarefaLimpezaCompleta, hoje: string) {
  return (
    tarefa.status !== "completed" &&
    tarefa.status !== "cancelled" &&
    Boolean(tarefa.scheduled_for) &&
    tarefa.scheduled_for! < hoje
  );
}

function montarHrefLimpeza(
  data: string,
  statusLimpeza: SearchParamsLimpeza["statusLimpeza"],
  visual: SearchParamsLimpeza["visual"]
) {
  const params = new URLSearchParams();
  params.set("data", data);
  if (statusLimpeza && statusLimpeza !== "todas") {
    params.set("statusLimpeza", statusLimpeza);
  }
  if (visual === "lista") params.set("visual", "lista");
  return `/limpeza?${params.toString()}`;
}

function deslocarData(data: string, dias: number) {
  const valor = new Date(`${data}T00:00:00Z`);
  valor.setUTCDate(valor.getUTCDate() + dias);
  return valor.toISOString().slice(0, 10);
}

function obterHojeSaoPaulo() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
}

function formatarDataCurta(valor: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${valor}T00:00:00Z`));
}

function formatarDataLonga(valor: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${valor}T00:00:00Z`));
}

function formatarHorario(valor: string | null, fallback: string) {
  return valor ? valor.slice(0, 5) : fallback;
}

function obterIniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "HS";
  return partes
    .slice(0, 2)
    .map((parte) => parte[0]?.toLocaleUpperCase("pt-BR") ?? "")
    .join("");
}
