"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  BedDouble,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  CreditCard,
  FileBarChart,
  House,
  LayoutDashboard,
  ListChecks,
  PlayCircle,
  PlugZap,
  ReceiptText,
  RotateCcw,
  Search,
  Settings,
  Sparkles,
  Store,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Badge, Button, cn } from "@hospedex/ui";

import { reiniciarTutorialAction } from "../../lib/tutorials/actions";
import type { TutorialTourKey } from "../../lib/tutorials/tour-registry";
import type { TutorialCard, TutorialResumoGerenciamento, TutorialStatus } from "../../lib/tutorials/types";
import { AppModal } from "../management/entity-modal";

type FiltroStatus = "all" | "not_started" | "in_progress" | "completed" | "updated";

const ICONES_TUTORIAL: Record<string, LucideIcon> = {
  "bed-double": BedDouble,
  "calendar-days": CalendarDays,
  "credit-card": CreditCard,
  "file-bar-chart": FileBarChart,
  house: House,
  "layout-dashboard": LayoutDashboard,
  "plug-zap": PlugZap,
  "receipt-text": ReceiptText,
  settings: Settings,
  sparkles: Sparkles,
  store: Store,
  "user-cog": UserCog,
  users: Users,
};

export function HelpCenter({ resumo }: { resumo: TutorialResumoGerenciamento | null }) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<FiltroStatus>("all");
  const [aberto, setAberto] = useState<TutorialTourKey | null>(null);
  const [reinicio, setReinicio] = useState<TutorialCard | null>(null);
  const [pendente, startTransition] = useTransition();
  const tours = resumo?.tours ?? [];
  const onboarding = tours.find((tour) => tour.kind === "onboarding");
  const modulos = tours.filter((tour) => tour.kind === "module");
  const atualizados = modulos.filter((tour) => tour.status === "updated");
  const filtrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    return modulos.filter((tour) => {
      const correspondeBusca =
        !termo || `${tour.title} ${tour.description}`.toLocaleLowerCase("pt-BR").includes(termo);
      const correspondeStatus = filtro === "all" || tour.status === filtro;
      return correspondeBusca && correspondeStatus;
    });
  }, [busca, filtro, modulos]);

  async function confirmarReinicio() {
    if (!reinicio) return;
    const tutorial = reinicio;
    startTransition(async () => {
      const resultado = await reiniciarTutorialAction({
        tutorialKey: tutorial.key,
        tutorialVersion: tutorial.version,
      });
      if (resultado.ok) {
        setReinicio(null);
        iniciarTour(tutorial.key, 0);
        router.refresh();
      }
    });
  }

  return (
    <section className="space-y-5" data-tour-id="module-help">
      <div className="admin-glass-panel p-5" data-tour-id="ajuda-contextual">
        <Badge variant="info">Central de Ajuda</Badge>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Tutoriais por módulo</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Aprenda no seu ritmo, continue de onde parou ou consulte uma etapa específica.
            </p>
          </div>
          <div className="min-w-52 rounded-xl border bg-background/55 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progresso geral</span>
              <strong>{resumo?.progressoGeral ?? 0}%</strong>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${resumo?.progressoGeral ?? 0}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
          <label className="relative block">
            <span className="sr-only">Buscar tutorial</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
            <input
              className="h-11 w-full rounded-xl border bg-background/65 pl-10 pr-3 text-sm outline-none transition focus:border-primary"
              onChange={(evento) => setBusca(evento.target.value)}
              placeholder="Buscar Casas, Reservas, Financeiro..."
              value={busca}
            />
          </label>
          <select
            aria-label="Filtrar tutoriais por status"
            className="h-11 rounded-xl border bg-background/65 px-3 text-sm outline-none focus:border-primary"
            onChange={(evento) => setFiltro(evento.target.value as FiltroStatus)}
            value={filtro}
          >
            <option value="all">Todos os status</option>
            <option value="not_started">Não iniciados</option>
            <option value="in_progress">Em andamento</option>
            <option value="completed">Concluídos</option>
            <option value="updated">Atualizados</option>
          </select>
        </div>
      </div>

      {onboarding ? (
        <TutorialCardView
          aberto={aberto === onboarding.key}
          onReiniciar={() => setReinicio(onboarding)}
          onToggle={() => setAberto((atual) => (atual === onboarding.key ? null : onboarding.key))}
          tour={onboarding}
        />
      ) : null}

      {atualizados.length ? (
        <div className="admin-glass-card border-primary/25 p-4">
          <Badge variant="warning">Novidades</Badge>
          <h2 className="mt-3 font-semibold">Tutoriais atualizados</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Veja o que mudou sem perder a conclusão das versões anteriores.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {atualizados.map((tour) => (
              <Button key={tour.key} onClick={() => iniciarTour(tour.key)} size="sm" type="button" variant="outline">
                {tour.title}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <h2 className="text-lg font-semibold">Módulos disponíveis</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A lista respeita suas permissões e os módulos liberados para o tenant.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {filtrados.map((tour) => (
          <TutorialCardView
            aberto={aberto === tour.key}
            key={tour.key}
            onReiniciar={() => setReinicio(tour)}
            onToggle={() => setAberto((atual) => (atual === tour.key ? null : tour.key))}
            tour={tour}
          />
        ))}
      </div>

      {!filtrados.length ? (
        <div className="admin-glass-card p-8 text-center">
          <CircleHelp className="mx-auto h-8 w-8 text-primary" />
          <p className="mt-3 font-semibold">Nenhum tutorial encontrado</p>
          <p className="mt-1 text-sm text-muted-foreground">Ajuste a busca ou o filtro de status.</p>
        </div>
      ) : null}

      <AppModal
        description="O progresso desta versão será zerado. Nenhum dado operacional será alterado."
        eyebrow="Confirmação"
        onOpenChange={(open) => !open && setReinicio(null)}
        open={Boolean(reinicio)}
        size="sm"
        title={`Reiniciar ${reinicio?.title ?? "tutorial"}?`}
      >
        <div className="flex justify-end gap-2">
          <Button disabled={pendente} onClick={() => setReinicio(null)} type="button" variant="outline">
            Cancelar
          </Button>
          <Button disabled={pendente} onClick={confirmarReinicio} type="button">
            <RotateCcw className="mr-2 h-4 w-4" />
            {pendente ? "Reiniciando..." : "Reiniciar"}
          </Button>
        </div>
      </AppModal>
    </section>
  );
}

function TutorialCardView({
  aberto,
  onReiniciar,
  onToggle,
  tour,
}: {
  aberto: boolean;
  onReiniciar: () => void;
  onToggle: () => void;
  tour: TutorialCard;
}) {
  const principal = tour.status === "in_progress" ? "Continuar" : tour.status === "completed" ? "Rever" : "Iniciar";
  const indice = tour.status === "in_progress" ? tour.currentStep : 0;
  const Icone = ICONES_TUTORIAL[tour.icon] ?? ListChecks;

  return (
    <article className="admin-glass-card overflow-hidden p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icone className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{tour.title}</h3>
            <Badge variant={badgeStatus(tour.status)}>{labelStatus(tour.status)}</Badge>
            <span className="text-xs text-muted-foreground">v{tour.version}</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{tour.description}</p>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><ListChecks className="h-3.5 w-3.5" />{tour.stepCount} etapas</span>
            <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{tour.durationMinutes} min</span>
            <span>{tour.progress}% concluído</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${tour.progress}%` }} />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={() => iniciarTour(tour.key, indice)} size="sm" type="button">
          <PlayCircle className="mr-2 h-4 w-4" />{principal}
        </Button>
        <Button onClick={onToggle} size="sm" type="button" variant="outline">
          Ver etapas
          <ChevronDown className={cn("ml-2 h-4 w-4 transition", aberto && "rotate-180")} />
        </Button>
        {tour.status !== "not_started" ? (
          <Button onClick={onReiniciar} size="sm" type="button" variant="ghost">
            <RotateCcw className="mr-2 h-4 w-4" />Reiniciar
          </Button>
        ) : null}
      </div>

      {aberto ? (
        <ol className="mt-4 space-y-2 border-t pt-4">
          {tour.steps.map((etapa, index) => {
            const concluida = tour.completedSteps.includes(etapa.id) || tour.status === "completed";
            return (
              <li className="flex items-start gap-3 rounded-lg border bg-background/45 p-3" key={etapa.id}>
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold">
                  {concluida ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{etapa.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{etapa.content}</p>
                </div>
                <button
                  className="shrink-0 text-xs font-semibold text-primary hover:underline"
                  onClick={() => iniciarTour(tour.key, index)}
                  type="button"
                >
                  Ver etapa
                </button>
              </li>
            );
          })}
        </ol>
      ) : null}
    </article>
  );
}

function iniciarTour(tourKey: TutorialTourKey, stepIndex = 0) {
  window.dispatchEvent(new CustomEvent("hospedex:start-tour", { detail: { stepIndex, tourKey } }));
}

function labelStatus(status: TutorialStatus) {
  if (status === "completed") return "Concluído";
  if (status === "in_progress") return "Em andamento";
  if (status === "dismissed") return "Oculto";
  if (status === "updated") return "Atualizado";
  return "Não iniciado";
}

function badgeStatus(status: TutorialStatus): "info" | "secondary" | "success" | "warning" {
  if (status === "completed") return "success";
  if (status === "in_progress") return "info";
  if (status === "updated") return "warning";
  return "secondary";
}
