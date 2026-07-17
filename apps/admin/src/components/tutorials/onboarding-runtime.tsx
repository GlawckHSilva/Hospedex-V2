"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ACTIONS, EVENTS, Joyride, STATUS, type EventData, type Step } from "react-joyride";

import { salvarEventoTourAction } from "../../lib/tutorials/actions";
import { TUTORIAL_TOURS, type TutorialTourDefinition, type TutorialTourKey } from "../../lib/tutorials/tour-registry";
import type { TutorialResumoGerenciamento } from "../../lib/tutorials/types";
import { OnboardingGate } from "./onboarding-gate";

type TourState = "idle" | "loading" | "running" | "completed" | "skipped" | "error";

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
  const completedSteps = useRef<string[]>([]);
  const storageKey = `${STORAGE_KEY}:${resumo?.storageScope ?? "sem-contexto"}`;

  const joyrideSteps = useMemo<Step[]>(() => {
    if (!activeTour) return [];
    return activeTour.steps.map((step) => ({
      content: step.content,
      placement: step.placement ?? "auto",
      skipBeacon: true,
      target: () => encontrarTargetVisivel(step.targetId),
      title: step.title
    }));
  }, [activeTour]);

  const startTour = useCallback((tourKey: TutorialTourKey, index = 0) => {
    const tour = TUTORIAL_TOURS[tourKey];
    if (!tour) return;

    completedSteps.current = [];
    setActiveTour(tour);
    setStepIndex(index);
    setRun(false);
    setState("loading");
    salvarLocalmente(storageKey, tour.key, index);
  }, [storageKey]);

  useEffect(() => {
    const salvo = lerTourLocal(storageKey);
    const tour = salvo?.tourKey ? TUTORIAL_TOURS[salvo.tourKey] : null;
    if (salvo && tour && salvo.stepIndex >= 0 && salvo.stepIndex < tour.steps.length) {
      startTour(salvo.tourKey, salvo.stepIndex);
    } else if (salvo) {
      removerTourLocal(storageKey);
    }
  }, [startTour, storageKey]);

  useEffect(() => {
    function handleStart(evento: Event) {
      const detail = (evento as CustomEvent<{ tourKey?: TutorialTourKey }>).detail;
      if (detail?.tourKey) startTour(detail.tourKey);
    }

    window.addEventListener("hospedex:start-tour", handleStart);
    return () => window.removeEventListener("hospedex:start-tour", handleStart);
  }, [startTour]);

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
    esperarTarget(step.targetId).then((encontrou) => {
      if (cancelado) return;
      if (!encontrou) {
        console.warn("Target do tutorial ausente.", { targetId: step.targetId, tour: activeTour.key });
        avancarOuConcluir();
        return;
      }
      setRun(true);
      setState("running");
      startTransition(() => {
        void salvarEventoTourAction({
          currentStep: stepIndex,
          status: "in_progress",
          tutorialKey: activeTour.key
        });
      });
    });

    return () => {
      cancelado = true;
    };
  }, [activeTour, pathname, router, startTransition, state, stepIndex]);

  const avancarOuConcluir = useCallback(() => {
    if (!activeTour) return;
    const nextIndex = stepIndex + 1;
    if (nextIndex >= activeTour.steps.length) {
      finalizar("completed");
      return;
    }
    setStepIndex(nextIndex);
    setRun(false);
    setState("loading");
    salvarLocalmente(storageKey, activeTour.key, nextIndex);
  }, [activeTour, stepIndex, storageKey]);

  function finalizar(status: "completed" | "dismissed") {
    if (!activeTour) return;
    setRun(false);
    setState(status === "completed" ? "completed" : "skipped");
    removerTourLocal(storageKey);
    startTransition(() => {
      void salvarEventoTourAction({
        completedSteps: completedSteps.current,
        currentStep: stepIndex,
        status,
        tutorialKey: activeTour.key
      });
    });
    setActiveTour(null);
    setStepIndex(0);
    setState("idle");
  }

  function handleJoyride(data: EventData) {
    const { action, index, status, type } = data;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      finalizar(status === STATUS.FINISHED ? "completed" : "dismissed");
      return;
    }

    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
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
  }

  return (
    <>
      <OnboardingGate resumo={resumo} onStartTour={startTour} />
      <Joyride
        continuous
        locale={{
          back: "Anterior",
          close: "Fechar",
          last: "Concluir",
          next: "Próximo",
          nextWithProgress: "Próximo ({current} de {total})",
          skip: "Pular tutorial"
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
          zIndex: 2147483647
        }}
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
            maxWidth: "calc(100vw - 24px)"
          },
          tooltipTitle: { fontSize: 16, fontWeight: 700 }
        }}
      />
    </>
  );
}

function esperarTarget(targetId: string) {
  const inicio = performance.now();

  return new Promise<boolean>((resolve) => {
    function verificar() {
      const elemento = encontrarTargetVisivel(targetId);
      if (elemento) {
        elemento.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
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
  return Array.from(elementos).find((elemento) => elemento.offsetParent !== null) ?? null;
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
    // O tutorial continua funcionando quando o navegador bloqueia armazenamento local.
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
    // Nada precisa ser removido quando o armazenamento nao esta disponivel.
  }
}
