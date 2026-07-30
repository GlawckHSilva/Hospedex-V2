"use client";

import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { CircleHelp, PlayCircle } from "lucide-react";
import { ACTIONS, EVENTS, Joyride, STATUS, type EventData, type Step } from "react-joyride";

import { Button } from "@hospedex/ui";

import {
  salvarDecisaoConviteTourAction,
  salvarEventoTourAction,
} from "../../lib/tutorials/actions";
import {
  TUTORIAL_TOURS,
  obterTutorialPorRota,
  type TutorialTourDefinition,
  type TutorialTourKey,
} from "../../lib/tutorials/tour-registry";
import type { TutorialResumoGerenciamento } from "../../lib/tutorials/types";
import { AppModal } from "../management/entity-modal";
import { OnboardingGate } from "./onboarding-gate";

type TourState = "idle" | "loading" | "running";
type StartOptions = { stepIndex?: number };

const STORAGE_KEY = "hospedex:onboarding:active-tour";
const TARGET_TIMEOUT_MS = 4500;

export function OnboardingRuntime({ resumo }: { resumo: TutorialResumoGerenciamento | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [activeTour, setActiveTour] = useState<TutorialTourDefinition | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [run, setRun] = useState(false);
  const [state, setState] = useState<TourState>("idle");
  const [concluido, setConcluido] = useState<TutorialTourDefinition | null>(null);
  const [portalPronto, setPortalPronto] = useState(false);
  const [viewportCompacto, setViewportCompacto] = useState(false);
  const completedSteps = useRef<string[]>([]);
  const storageKey = `${STORAGE_KEY}:${resumo?.storageScope ?? "sem-contexto"}`;
  const tutorialRota = obterTutorialPorRota(pathname);
  const cardRota = tutorialRota
    ? resumo?.tours.find((tour) => tour.key === tutorialRota.key)
    : null;
  const mostrarConvite = Boolean(
    cardRota &&
      cardRota.invitationStatus === "pending" &&
      cardRota.status === "not_started" &&
      !activeTour,
  );

  useEffect(() => setPortalPronto(true), []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const atualizar = () => setViewportCompacto(media.matches);
    atualizar();
    media.addEventListener("change", atualizar);
    return () => media.removeEventListener("change", atualizar);
  }, []);

  const joyrideSteps = useMemo<Step[]>(() => {
    if (!activeTour) return [];
    return activeTour.steps.map((step) => criarEtapaJoyride(step, viewportCompacto));
  }, [activeTour, viewportCompacto]);

  const startTour = useCallback(
    (tourKey: TutorialTourKey, options: StartOptions = {}) => {
      const tour = TUTORIAL_TOURS[tourKey];
      if (!tour) return;

      const card = resumo?.tours.find((item) => item.key === tourKey);
      const local = lerTourLocal(storageKey);
      const indiceSolicitado = options.stepIndex;
      const indiceServidor = card?.status === "in_progress" ? card.currentStep : undefined;
      const indiceLocal = local?.tourKey === tourKey ? local.stepIndex : 0;
      const indice = Math.max(
        0,
        Math.min(indiceSolicitado ?? indiceServidor ?? indiceLocal, tour.steps.length - 1),
      );

      completedSteps.current = card?.completedSteps ?? [];
      setActiveTour(tour);
      setStepIndex(indice);
      setRun(false);
      setState("loading");
      salvarLocalmente(storageKey, tour.key, indice);
      startTransition(() => {
        void salvarDecisaoConviteTourAction({
          decision: "started",
          tutorialKey: tour.key,
          tutorialVersion: tour.version,
        });
      });
    },
    [resumo?.tours, startTransition, storageKey],
  );

  useEffect(() => {
    function handleStart(evento: Event) {
      const detail = (
        evento as CustomEvent<{ stepIndex?: number; tourKey?: TutorialTourKey }>
      ).detail;
      if (detail?.tourKey) {
        startTour(detail.tourKey, detail.stepIndex === undefined ? {} : { stepIndex: detail.stepIndex });
      }
    }

    window.addEventListener("hospedex:start-tour", handleStart);
    return () => window.removeEventListener("hospedex:start-tour", handleStart);
  }, [startTour]);

  const finalizar = useCallback(
    (status: "completed" | "in_progress") => {
      if (!activeTour) return;
      const tourFinalizado = activeTour;
      setRun(false);
      if (status === "completed") removerTourLocal(storageKey);
      startTransition(async () => {
        await salvarEventoTourAction({
          completedSteps: completedSteps.current,
          currentStep: stepIndex,
          status,
          tutorialKey: activeTour.key,
          tutorialVersion: activeTour.version,
        });
        router.refresh();
      });
      setActiveTour(null);
      setStepIndex(0);
      setState("idle");
      if (status === "completed") setConcluido(tourFinalizado);
    },
    [activeTour, router, startTransition, stepIndex, storageKey],
  );

  const avancarOuConcluir = useCallback(() => {
    if (!activeTour) return;
    const atual = activeTour.steps[stepIndex];
    if (atual) completedSteps.current = Array.from(new Set([...completedSteps.current, atual.id]));
    const nextIndex = stepIndex + 1;
    if (nextIndex >= activeTour.steps.length) {
      finalizar("completed");
      return;
    }
    setStepIndex(nextIndex);
    setRun(false);
    setState("loading");
    salvarLocalmente(storageKey, activeTour.key, nextIndex);
  }, [activeTour, finalizar, stepIndex, storageKey]);

  useEffect(() => {
    if (!activeTour || state !== "loading") return;
    const step = activeTour.steps[stepIndex];
    if (!step) return;

    if (pathname !== step.route) {
      router.push(step.route);
      return;
    }

    let cancelado = false;
    prepararNavegacaoMobile(step.targetId);
    void esperarTarget(step.targetId).then((encontrou) => {
      if (cancelado) return;
      if (!encontrou) {
        console.warn("Alvo do tutorial não está disponível; a etapa será ignorada.", {
          targetId: step.targetId,
          tour: activeTour.key,
        });
        avancarOuConcluir();
        return;
      }
      setRun(true);
      setState("running");
      startTransition(() => {
        void salvarEventoTourAction({
          currentStep: stepIndex,
          status: "in_progress",
          tutorialKey: activeTour.key,
          tutorialVersion: activeTour.version,
        });
      });
    });

    return () => {
      cancelado = true;
    };
  }, [activeTour, avancarOuConcluir, pathname, router, startTransition, state, stepIndex]);

  function handleJoyride(data: EventData) {
    const { action, index, status, type } = data;
    if (status === STATUS.FINISHED) {
      finalizar("completed");
      return;
    }
    if (status === STATUS.SKIPPED) {
      finalizar("in_progress");
      return;
    }
    if (type !== EVENTS.STEP_AFTER && type !== EVENTS.TARGET_NOT_FOUND) return;

    const atual = activeTour?.steps[index];
    if (atual) completedSteps.current = Array.from(new Set([...completedSteps.current, atual.id]));
    const nextIndex = action === ACTIONS.PREV ? Math.max(index - 1, 0) : index + 1;
    if (!activeTour || nextIndex >= activeTour.steps.length) {
      finalizar("completed");
      return;
    }
    setStepIndex(nextIndex);
    setRun(false);
    setState("loading");
    salvarLocalmente(storageKey, activeTour.key, nextIndex);
  }

  function decidirConvite(decision: "later" | "never") {
    if (!cardRota) return;
    startTransition(async () => {
      await salvarDecisaoConviteTourAction({
        decision,
        tutorialKey: cardRota.key,
        tutorialVersion: cardRota.version,
      });
      router.refresh();
    });
  }

  const slot = portalPronto ? document.getElementById("tutorial-context-action") : null;

  return (
    <>
      <OnboardingGate resumo={resumo} onStartTour={(key) => startTour(key)} />
      {slot && cardRota
        ? createPortal(
            <Button
              aria-label="Conhecer este módulo"
              className="h-9 w-9 gap-2 p-0 xl:w-auto xl:px-3"
              onClick={() => startTour(cardRota.key)}
              size="sm"
              title="Conhecer este módulo"
              type="button"
              variant="outline"
            >
              <CircleHelp className="h-4 w-4" />
              <span className="hidden xl:inline">Conhecer este módulo</span>
            </Button>,
            slot,
          )
        : null}

      <AppModal
        description={cardRota ? `${cardRota.stepCount} etapas · cerca de ${cardRota.durationMinutes} min` : ""}
        eyebrow="Ajuda contextual"
        onOpenChange={(open) => {
          if (!open) decidirConvite("later");
        }}
        open={mostrarConvite}
        size="sm"
        title={`Quer conhecer ${cardRota?.title ?? "este módulo"}?`}
      >
        <p className="text-sm text-muted-foreground">{cardRota?.description}</p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button onClick={() => cardRota && startTour(cardRota.key)} type="button">
            <PlayCircle className="mr-2 h-4 w-4" />
            Iniciar agora
          </Button>
          <Button onClick={() => decidirConvite("later")} type="button" variant="outline">
            Ver depois
          </Button>
          <Button onClick={() => decidirConvite("never")} type="button" variant="ghost">
            Não mostrar novamente
          </Button>
        </div>
      </AppModal>

      <AppModal
        description="Você pode aprender cada módulo no seu ritmo pela Central de Tutoriais."
        eyebrow="Tutorial concluído"
        onOpenChange={(open) => !open && setConcluido(null)}
        open={Boolean(concluido)}
        size="sm"
        title="Tudo pronto!"
      >
        <Button onClick={() => setConcluido(null)} type="button">Continuar</Button>
      </AppModal>

      {portalPronto ? (
        <Joyride
          continuous
          locale={{
            back: "Anterior",
            close: "Fechar",
            last: "Concluir",
            next: "Próximo",
            nextWithProgress: "Próximo ({current} de {total})",
            skip: "Continuar depois",
          }}
          onEvent={handleJoyride}
          options={{
            arrowColor: "var(--card)",
            backgroundColor: "var(--card)",
            buttons: ["back", "skip", "primary"],
            closeButtonAction: "skip",
            overlayClickAction: false,
            overlayColor: "rgba(2, 6, 23, 0.58)",
            primaryColor: "var(--primary)",
            showProgress: true,
            spotlightRadius: 14,
            targetWaitTimeout: TARGET_TIMEOUT_MS,
            textColor: "var(--foreground)",
            zIndex: 2147483647,
          }}
          portalElement={document.body}
          run={run}
          scrollToFirstStep
          stepIndex={stepIndex}
          steps={joyrideSteps}
          styles={{
            buttonBack: { color: "var(--muted-foreground)" },
            buttonClose: { color: "var(--muted-foreground)" },
            tooltip: {
              border: "1px solid var(--border)",
              borderRadius: 16,
              boxShadow: "0 24px 80px rgba(0,0,0,.28)",
              maxHeight: "calc(100dvh - 32px)",
              maxWidth: "min(380px, calc(100vw - 32px))",
              overflowY: "auto",
              width: viewportCompacto ? "calc(100vw - 32px)" : 360,
            },
            tooltipContent: {
              maxHeight: "calc(100dvh - 168px)",
              overflowWrap: "anywhere",
              overflowY: "auto",
            },
            tooltipFooter: { flexWrap: "wrap", gap: 8 },
            tooltipTitle: { fontSize: 16, fontWeight: 700 },
          }}
        />
      ) : null}
    </>
  );
}

function criarEtapaJoyride(
  step: TutorialTourDefinition["steps"][number],
  viewportCompacto: boolean,
): Step {
  const alvoMenu = step.targetId.startsWith("menu-");
  const alvoAmplo = step.targetId.startsWith("module-");
  const placement = viewportCompacto
    ? alvoMenu
      ? "bottom"
      : alvoAmplo
        ? "center"
        : step.placement ?? "bottom"
    : step.placement ?? (alvoMenu ? "right-start" : alvoAmplo ? "center" : "bottom");

  return {
    content: step.content,
    floatingOptions: {
      autoUpdate: {
        ancestorResize: true,
        ancestorScroll: true,
        elementResize: true,
        layoutShift: true,
      },
      flipOptions:
        placement === "center"
          ? false
          : {
              boundary: [],
              crossAxis: true,
              fallbackPlacements: alvoMenu
                ? ["right", "bottom-start", "top-start"]
                : ["top", "right", "left"],
              padding: 16,
              rootBoundary: "viewport",
            },
      shiftOptions: {
        boundary: [],
        crossAxis: true,
        mainAxis: true,
        padding: 16,
        rootBoundary: "viewport",
      },
      strategy: "fixed",
    },
    isFixed: true,
    offset: 14,
    placement,
    skipBeacon: true,
    target: () => encontrarTargetVisivel(step.targetId),
    title: step.title,
  };
}

function esperarTarget(targetId: string) {
  const inicio = performance.now();
  return new Promise<boolean>((resolve) => {
    function verificar() {
      const elemento = encontrarTargetVisivel(targetId);
      if (elemento) {
        const movimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
        elemento.scrollIntoView({ behavior: movimento, block: "center", inline: "nearest" });
        resolve(true);
        return;
      }
      if (performance.now() - inicio > TARGET_TIMEOUT_MS) {
        resolve(false);
        return;
      }
      requestAnimationFrame(verificar);
    }
    verificar();
  });
}

function encontrarTargetVisivel(targetId: string) {
  const elementos = document.querySelectorAll<HTMLElement>(`[data-tour-id="${targetId}"]`);
  return (
    Array.from(elementos).find((elemento) => {
      const rect = elemento.getBoundingClientRect();
      return elemento.offsetParent !== null && rect.width > 0 && rect.height > 0;
    }) ?? null
  );
}

function prepararNavegacaoMobile(targetId: string) {
  if (window.matchMedia("(min-width: 1024px)").matches) return;
  if (targetId.startsWith("menu-")) {
    document.querySelector<HTMLButtonElement>('[aria-label="Abrir menu"]')?.click();
    return;
  }
  document.querySelector<HTMLButtonElement>('[aria-label="Fechar menu"]')?.click();
}

function salvarLocalmente(storageKey: string, tourKey: TutorialTourKey, stepIndex: number) {
  try {
    localStorage.setItem(storageKey, JSON.stringify({ stepIndex, tourKey }));
  } catch {
    // O servidor é a fonte principal; o armazenamento local é apenas contingência.
  }
}

function lerTourLocal(storageKey: string): { stepIndex: number; tourKey: TutorialTourKey } | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const salvo = JSON.parse(raw) as Partial<{ stepIndex: number; tourKey: TutorialTourKey }>;
    if (!Number.isInteger(salvo.stepIndex) || typeof salvo.tourKey !== "string") return null;
    return salvo as { stepIndex: number; tourKey: TutorialTourKey };
  } catch {
    return null;
  }
}

function removerTourLocal(storageKey: string) {
  try {
    localStorage.removeItem(storageKey);
  } catch {
    // Sem ação quando o navegador não disponibiliza armazenamento local.
  }
}
