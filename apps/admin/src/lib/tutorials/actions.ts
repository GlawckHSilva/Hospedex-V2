"use server";

import { revalidatePath } from "next/cache";

import { obterMenuAdmin } from "../../config/navigation";
import { exigirAutenticacao } from "../auth/context";
import { criarClienteSupabaseServer } from "../supabase/server";
import { TUTORIAL_INICIAL_KEY } from "./registry";
import { obterTutorial } from "./tour-registry";
import type { TutorialInvitationStatus, TutorialProgressRow } from "./types";

type ResultadoTutorial = { error?: string; ok: boolean };

export async function dispensarBoasVindasAction(): Promise<ResultadoTutorial> {
  const tutorial = obterTutorial(TUTORIAL_INICIAL_KEY);
  if (!tutorial) return { error: "Tutorial inicial indisponível.", ok: false };

  return salvarProgresso(tutorial.key, tutorial.version, {
    dismissed_at: new Date().toISOString(),
    invitation_status: "never",
    status: "dismissed",
  });
}

export async function salvarEventoTourAction(input: {
  completedSteps?: string[];
  currentStep: number;
  status: "in_progress" | "completed";
  tutorialKey: string;
  tutorialVersion: number;
}): Promise<ResultadoTutorial> {
  const tutorial = obterTutorial(input.tutorialKey);
  if (!tutorial || tutorial.version !== input.tutorialVersion) {
    return { error: "A versão deste tutorial não está disponível.", ok: false };
  }

  const agora = new Date().toISOString();
  return salvarProgresso(tutorial.key, tutorial.version, {
    completed_at: input.status === "completed" ? agora : null,
    completed_steps: input.completedSteps ?? [],
    current_step: Math.max(0, Math.min(input.currentStep, tutorial.steps.length - 1)),
    invitation_status: "started",
    last_seen_at: agora,
    started_at: agora,
    status: input.status,
  });
}

export async function salvarDecisaoConviteTourAction(input: {
  decision: Extract<TutorialInvitationStatus, "later" | "never" | "started">;
  tutorialKey: string;
  tutorialVersion: number;
}): Promise<ResultadoTutorial> {
  const tutorial = obterTutorial(input.tutorialKey);
  if (!tutorial || tutorial.version !== input.tutorialVersion) {
    return { error: "Tutorial indisponível.", ok: false };
  }

  const agora = new Date().toISOString();
  return salvarProgresso(tutorial.key, tutorial.version, {
    dismissed_at: input.decision === "never" ? agora : null,
    invitation_decided_at: agora,
    invitation_status: input.decision,
    last_seen_at: agora,
    status: input.decision === "never" ? "dismissed" : input.decision === "started" ? "in_progress" : "not_started",
  });
}

export async function reiniciarTutorialAction(input: {
  tutorialKey: string;
  tutorialVersion: number;
}): Promise<ResultadoTutorial> {
  const tutorial = obterTutorial(input.tutorialKey);
  if (!tutorial || tutorial.version !== input.tutorialVersion) {
    return { error: "Tutorial indisponível.", ok: false };
  }

  const agora = new Date().toISOString();
  return salvarProgresso(
    tutorial.key,
    tutorial.version,
    {
      completed_at: null,
      completed_steps: [],
      current_step: 0,
      dismissed_at: null,
      invitation_status: "started",
      restarted_at: agora,
      started_at: agora,
      status: "in_progress",
    },
    true,
  );
}

async function salvarProgresso(
  tutorialKey: string,
  tutorialVersion: number,
  dados: Record<string, unknown>,
  substituirEtapas = false,
): Promise<ResultadoTutorial> {
  const contexto = await exigirAutenticacao();
  const tutorial = obterTutorial(tutorialKey);
  if (!contexto.tenant || contexto.role === "super_admin" || !tutorialPermitido(contexto, tutorial)) {
    return { error: "Você não tem permissão para acessar este tutorial.", ok: false };
  }

  const supabase = await criarClienteSupabaseServer();
  const { data: existente } = await supabase
    .from("user_tutorial_progress")
    .select("completed_steps")
    .eq("tenant_id", contexto.tenant.id)
    .eq("user_id", contexto.userId)
    .eq("tutorial_key", tutorialKey)
    .eq("tutorial_version", tutorialVersion)
    .maybeSingle<Pick<TutorialProgressRow, "completed_steps">>();
  const novasEtapas = (dados.completed_steps as string[] | undefined) ?? [];
  const completedSteps = substituirEtapas
    ? novasEtapas
    : Array.from(new Set([...(existente?.completed_steps ?? []), ...novasEtapas]));
  const { error } = await supabase.from("user_tutorial_progress").upsert(
    {
      ...dados,
      completed_steps: completedSteps,
      tenant_id: contexto.tenant.id,
      tutorial_key: tutorialKey,
      tutorial_version: tutorialVersion,
      user_id: contexto.userId,
    },
    { onConflict: "tenant_id,user_id,tutorial_key,tutorial_version" },
  );

  if (error) {
    console.error("Não foi possível salvar o progresso do tutorial.", error.message);
    return { error: "Não foi possível salvar seu progresso agora.", ok: false };
  }

  revalidatePath("/");
  revalidatePath("/ajuda");
  return { ok: true };
}

function tutorialPermitido(
  contexto: Awaited<ReturnType<typeof exigirAutenticacao>>,
  tutorial: ReturnType<typeof obterTutorial>,
) {
  if (!tutorial || !tutorial.roles.includes(contexto.role)) return false;
  if (tutorial.key === TUTORIAL_INICIAL_KEY) return true;
  if (tutorial.key === "marketplace") return contexto.role === "owner";
  return obterMenuAdmin(contexto).some((item) => item.href === tutorial.route);
}
