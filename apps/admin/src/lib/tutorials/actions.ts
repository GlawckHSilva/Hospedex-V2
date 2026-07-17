"use server";

import { revalidatePath } from "next/cache";

import { exigirAutenticacao } from "../auth/context";
import { criarClienteSupabaseServer } from "../supabase/server";
import { TUTORIAL_GERENCIAMENTO_KEY, TUTORIAL_VERSION, TUTORIAL_WELCOME_KEY } from "./registry";

export async function dispensarBoasVindasAction() {
  await salvarProgresso(TUTORIAL_WELCOME_KEY, {
    completed_at: new Date().toISOString(),
    current_step: 1,
    status: "completed"
  });
}

export async function reiniciarBoasVindasAction() {
  await salvarProgresso(TUTORIAL_WELCOME_KEY, {
    completed_at: null,
    current_step: 0,
    dismissed_at: null,
    started_at: new Date().toISOString(),
    status: "not_started"
  });
}

export async function confirmarConclusaoOnboardingAction() {
  await salvarProgresso(TUTORIAL_GERENCIAMENTO_KEY, {
    dismissed_at: new Date().toISOString(),
    status: "completed"
  });
}

export async function concluirEtapaTutorialAction(formData: FormData) {
  const etapaId = String(formData.get("etapaId") ?? "");
  if (!etapaId) return;

  await salvarProgresso(String(formData.get("tutorialKey") ?? "gerenciamento-primeiros-passos"), {
    completed_steps: [etapaId],
    current_step: Number(formData.get("currentStep") ?? 0),
    started_at: new Date().toISOString(),
    status: "in_progress"
  });
}

export async function salvarEventoTourAction(input: {
  completedSteps?: string[];
  currentStep: number;
  status: "in_progress" | "completed" | "dismissed";
  tutorialKey: string;
}) {
  const agora = new Date().toISOString();
  await salvarProgresso(input.tutorialKey, {
    completed_at: input.status === "completed" ? agora : null,
    completed_steps: input.completedSteps ?? [],
    current_step: input.currentStep,
    dismissed_at: input.status === "dismissed" ? agora : null,
    last_seen_at: agora,
    started_at: agora,
    status: input.status
  });
}

async function salvarProgresso(tutorialKey: string, dados: Record<string, unknown>) {
  const contexto = await exigirAutenticacao();
  if (!contexto.tenant || contexto.role === "super_admin") return;

  const supabase = await criarClienteSupabaseServer();
  const { data: existente } = await supabase
    .from("user_tutorial_progress")
    .select("completed_at,completed_steps,dismissed_at,status")
    .eq("tenant_id", contexto.tenant.id)
    .eq("user_id", contexto.userId)
    .eq("tutorial_key", tutorialKey)
    .eq("tutorial_version", TUTORIAL_VERSION)
    .maybeSingle<{
      completed_at: string | null;
      completed_steps: string[];
      dismissed_at: string | null;
      status: string;
    }>();

  const completedSteps = Array.from(
    new Set([...(existente?.completed_steps ?? []), ...((dados.completed_steps as string[] | undefined) ?? [])])
  );
  const manterConcluido =
    tutorialKey === TUTORIAL_GERENCIAMENTO_KEY && existente?.status === "completed";
  const dadosPersistidos = manterConcluido
    ? {
        ...dados,
        completed_at: existente.completed_at,
        dismissed_at: dados.dismissed_at ?? existente.dismissed_at,
        status: "completed"
      }
    : dados;

  const { error } = await supabase.from("user_tutorial_progress").upsert(
    {
      ...dadosPersistidos,
      completed_steps: completedSteps,
      last_seen_at: new Date().toISOString(),
      tenant_id: contexto.tenant.id,
      tutorial_key: tutorialKey,
      tutorial_version: TUTORIAL_VERSION,
      user_id: contexto.userId
    },
    { onConflict: "tenant_id,user_id,tutorial_key,tutorial_version" }
  );

  if (error) {
    console.error("Nao foi possivel salvar progresso do tutorial.", error.message);
  }

  revalidatePath("/");
  revalidatePath("/ajuda");
}
