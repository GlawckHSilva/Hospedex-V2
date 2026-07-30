import { obterMenuAdmin } from "../../config/navigation";
import type { ContextoAutenticacao } from "../auth/types";
import { criarClienteSupabaseServer } from "../supabase/server";
import { TUTORIAL_INICIAL_KEY, TUTORIAL_LEGACY_KEYS } from "./registry";
import { TUTORIAL_CATALOG } from "./tour-registry";
import type {
  TutorialCard,
  TutorialProgressRow,
  TutorialResumoGerenciamento,
  TutorialStatus,
} from "./types";

const COLUNAS_PROGRESSO =
  "id,tenant_id,user_id,tutorial_key,tutorial_version,status,current_step,completed_steps,invitation_status,invitation_decided_at,restarted_at,started_at,completed_at,dismissed_at,last_seen_at,created_at,updated_at";

/**
 * Carrega somente os tutoriais que o usuário pode acessar no tenant atual.
 * A licença não participa desse filtro: no modo somente leitura a ajuda continua disponível.
 */
export async function carregarOnboardingGerenciamento(
  contexto: ContextoAutenticacao,
): Promise<TutorialResumoGerenciamento | null> {
  if (!contexto.tenant || contexto.role === "super_admin") return null;

  const supabase = await criarClienteSupabaseServer();
  const { data, error } = await supabase
    .from("user_tutorial_progress")
    .select(COLUNAS_PROGRESSO)
    .eq("tenant_id", contexto.tenant.id)
    .eq("user_id", contexto.userId)
    .returns<TutorialProgressRow[]>();

  if (error) {
    console.error("Não foi possível carregar o progresso dos tutoriais.", error.message);
    return null;
  }

  const progressos = data ?? [];
  const rotasPermitidas = new Set(obterMenuAdmin(contexto).map((item) => item.href));
  const catalogoPermitido = TUTORIAL_CATALOG.filter((tutorial) => {
    if (!tutorial.roles.includes(contexto.role)) return false;
    if (tutorial.key === TUTORIAL_INICIAL_KEY) return true;
    if (tutorial.key === "marketplace") return contexto.role === "owner";
    return rotasPermitidas.has(tutorial.route);
  });
  const tours = catalogoPermitido.map((tutorial) => montarCard(tutorial, progressos));
  const modulos = tours.filter((tour) => tour.kind === "module");
  const progressoGeral = modulos.length
    ? Math.round(modulos.reduce((total, tour) => total + tour.progress, 0) / modulos.length)
    : 0;
  const onboardingAtual = progressos.find(
    (item) => item.tutorial_key === TUTORIAL_INICIAL_KEY && item.tutorial_version === 1,
  );
  const onboardingLegadoEncerrado = progressos.some(
    (item) =>
      TUTORIAL_LEGACY_KEYS.includes(item.tutorial_key as (typeof TUTORIAL_LEGACY_KEYS)[number]) &&
      (item.status === "completed" || item.status === "dismissed"),
  );

  return {
    progressoGeral,
    mostrarBoasVindas: !onboardingAtual && !onboardingLegadoEncerrado,
    storageScope: `${contexto.tenant.id}:${contexto.userId}`,
    tours,
    usuarioNome: contexto.profile.full_name ?? contexto.profile.email,
  };
}

function montarCard(
  tutorial: (typeof TUTORIAL_CATALOG)[number],
  progressos: TutorialProgressRow[],
): TutorialCard {
  const atual = progressos.find(
    (item) =>
      item.tutorial_key === tutorial.key && item.tutorial_version === tutorial.version,
  );
  const versaoAnteriorConcluida = progressos.some(
    (item) =>
      item.tutorial_key === tutorial.key &&
      item.tutorial_version < tutorial.version &&
      item.status === "completed",
  );
  const status: TutorialStatus = atual?.status ?? (versaoAnteriorConcluida ? "updated" : "not_started");
  const concluidas = atual?.completed_steps ?? [];
  const progresso =
    status === "completed"
      ? 100
      : Math.min(99, Math.round((concluidas.length / tutorial.steps.length) * 100));

  return {
    completedAt: atual?.completed_at ?? null,
    completedSteps: concluidas,
    currentStep: Math.min(atual?.current_step ?? 0, tutorial.steps.length - 1),
    description: tutorial.description,
    durationMinutes: tutorial.durationMinutes,
    icon: tutorial.icon,
    invitationStatus: atual?.invitation_status ?? "pending",
    key: tutorial.key,
    kind: tutorial.kind,
    progress: progresso,
    route: tutorial.route,
    status,
    stepCount: tutorial.steps.length,
    steps: tutorial.steps,
    title: tutorial.title,
    version: tutorial.version,
  };
}
