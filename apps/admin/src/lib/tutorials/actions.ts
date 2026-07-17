"use server";

import { revalidatePath } from "next/cache";

import { exigirAutenticacao } from "../auth/context";
import { criarClienteSupabaseServer } from "../supabase/server";
import { TUTORIAL_VERSION, TUTORIAL_WELCOME_KEY } from "./registry";

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

async function salvarProgresso(tutorialKey: string, dados: Record<string, unknown>) {
  const contexto = await exigirAutenticacao();
  if (!contexto.tenant || contexto.role === "super_admin") return;

  const supabase = await criarClienteSupabaseServer();
  const { data: existente } = await supabase
    .from("user_tutorial_progress")
    .select("completed_steps")
    .eq("tenant_id", contexto.tenant.id)
    .eq("user_id", contexto.userId)
    .eq("tutorial_key", tutorialKey)
    .eq("tutorial_version", TUTORIAL_VERSION)
    .maybeSingle<{ completed_steps: string[] }>();

  const completedSteps = Array.from(
    new Set([...(existente?.completed_steps ?? []), ...((dados.completed_steps as string[] | undefined) ?? [])])
  );

  const { error } = await supabase.from("user_tutorial_progress").upsert(
    {
      ...dados,
      completed_steps: completedSteps,
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
