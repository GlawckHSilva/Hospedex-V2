import type { ContextoAutenticacao } from "../auth/types";
import { carregarEstadoLicencaTenant } from "../license-state";
import { criarClienteSupabaseServer } from "../supabase/server";
import {
  TUTORIAL_GERENCIAMENTO_KEY,
  TUTORIAL_VERSION,
  TUTORIAL_WELCOME_KEY,
  obterChecklistPermitido
} from "./registry";
import { TUTORIAL_TOURS } from "./tour-registry";
import type { TutorialProgressRow, TutorialResumoGerenciamento } from "./types";

export async function carregarOnboardingGerenciamento(
  contexto: ContextoAutenticacao
): Promise<TutorialResumoGerenciamento | null> {
  if (!contexto.tenant || contexto.role === "super_admin") return null;

  const supabase = await criarClienteSupabaseServer();
  const progressosResultado = await supabase
    .from("user_tutorial_progress")
    .select(
      "id,tenant_id,user_id,tutorial_key,tutorial_version,status,current_step,completed_steps,started_at,completed_at,dismissed_at,last_seen_at,created_at,updated_at"
    )
    .eq("tenant_id", contexto.tenant.id)
    .eq("user_id", contexto.userId)
    .eq("tutorial_version", TUTORIAL_VERSION)
    .returns<TutorialProgressRow[]>();

  if (progressosResultado.error) {
    console.error("Nao foi possivel carregar progresso do onboarding.", progressosResultado.error.message);
    return null;
  }

  const progressos = progressosResultado.data ?? [];
  const boasVindas = progressos.find((item) => item.tutorial_key === TUTORIAL_WELCOME_KEY);
  const progressoPersistido = progressos.find(
    (item) => item.tutorial_key === TUTORIAL_GERENCIAMENTO_KEY
  );
  const onboardingEncerrado =
    progressoPersistido?.status === "completed" || progressoPersistido?.status === "dismissed";
  const [checks, licenca] = onboardingEncerrado
    ? [
        Object.fromEntries(
          (progressoPersistido.completed_steps ?? []).map((etapa) => [etapa, true])
        ),
        null
      ]
    : await Promise.all([
        carregarChecks(contexto.tenant.id),
        carregarEstadoLicencaTenant(contexto.tenant.id)
      ]);
  const checklist = obterChecklistPermitido(contexto, checks);
  const concluidas =
    progressoPersistido?.status === "completed"
      ? checklist.length
      : checklist.filter((item) => item.concluida).length;
  const progresso = checklist.length ? Math.round((concluidas / checklist.length) * 100) : 0;
  let progressoChecklist = progressoPersistido;

  // A conclusão operacional é promovida uma única vez para um registro persistido.
  // Depois disso, alterações nas casas não reabrem uma conquista já concluída.
  if (progresso === 100 && progressoChecklist?.status !== "completed" && progressoChecklist?.status !== "dismissed") {
    progressoChecklist = await persistirConclusaoChecklist(
      contexto.tenant.id,
      contexto.userId,
      checklist.map((item) => item.id),
      progressoChecklist
    );
  }

  const status = obterStatusChecklist(progressoChecklist, concluidas);
  const completedAt = progressoChecklist?.completed_at ?? null;

  return {
    checklist,
    completedAt,
    progresso,
    mostrarChecklist: status === "not_started" || status === "in_progress",
    mostrarBoasVindas:
      status !== "completed" && status !== "dismissed" && (!boasVindas || boasVindas.status === "not_started"),
    mostrarConfirmacaoConclusao: status === "completed" && !progressoChecklist?.dismissed_at,
    somenteLeitura: licenca?.isReadOnlyByExpiredLicense ?? false,
    status,
    storageScope: `${contexto.tenant.id}:${contexto.userId}`,
    tutorialKey: TUTORIAL_GERENCIAMENTO_KEY,
    tours: Object.values(TUTORIAL_TOURS).map((tour) => {
      const progressoTour = progressos.find((item) => item.tutorial_key === tour.key);
      return {
        description: tour.description,
        duration: tour.duration,
        key: tour.key,
        status: progressoTour?.status ?? "not_started",
        title: tour.title
      };
    }),
    usuarioNome: contexto.profile.full_name ?? contexto.profile.email
  };
}

function obterStatusChecklist(progresso: TutorialProgressRow | undefined, concluidas: number) {
  if (progresso?.status === "completed" || progresso?.status === "dismissed") return progresso.status;
  if (progresso?.status === "in_progress" || concluidas > 0) return "in_progress" as const;
  return "not_started" as const;
}

async function persistirConclusaoChecklist(
  tenantId: string,
  userId: string,
  completedSteps: string[],
  existente: TutorialProgressRow | undefined
) {
  const supabase = await criarClienteSupabaseServer();
  const agora = new Date().toISOString();
  const { data, error } = await supabase
    .from("user_tutorial_progress")
    .upsert(
      {
        completed_at: existente?.completed_at ?? agora,
        completed_steps: Array.from(new Set([...(existente?.completed_steps ?? []), ...completedSteps])),
        current_step: completedSteps.length,
        last_seen_at: agora,
        started_at: existente?.started_at ?? agora,
        status: "completed",
        tenant_id: tenantId,
        tutorial_key: TUTORIAL_GERENCIAMENTO_KEY,
        tutorial_version: TUTORIAL_VERSION,
        user_id: userId
      },
      { onConflict: "tenant_id,user_id,tutorial_key,tutorial_version" }
    )
    .select("*")
    .single<TutorialProgressRow>();

  if (error) {
    console.error("Nao foi possivel confirmar a conclusao do onboarding.", error.message);
    return existente;
  }

  return data;
}

async function carregarChecks(tenantId: string): Promise<Record<string, boolean>> {
  const supabase = await criarClienteSupabaseServer();
  const [
    configuracoes,
    primeiraCasa,
    basicos,
    publicacao,
    disponibilidadeCobranca
  ] = await Promise.all([
    supabase
      .from("tenant_settings")
      .select("id")
      .eq("tenant_id", tenantId)
      .or("logo_url.not.is.null,phone.not.is.null,whatsapp.not.is.null,email.not.is.null,city.not.is.null")
      .limit(1)
      .maybeSingle<{ id: string }>(),
    supabase
      .from("properties")
      .select("id")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle<{ id: string }>(),
    hasConfiguredPropertyBasics(tenantId),
    supabase
      .from("properties")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("status", "published")
      .eq("is_public", true)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle<{ id: string }>(),
    hasConfiguredAvailabilityAndBilling(tenantId)
  ]);

  return {
    configuracoes: Boolean(configuracoes.data),
    "primeira-casa": Boolean(primeiraCasa.data),
    basicos,
    publicacao: Boolean(publicacao.data),
    "disponibilidade-cobranca": disponibilidadeCobranca
  };
}

async function hasConfiguredPropertyBasics(tenantId: string) {
  const supabase = await criarClienteSupabaseServer();
  const [{ data: propriedade }, { data: foto }] = await Promise.all([
    supabase
      .from("properties")
      .select("id")
      .eq("tenant_id", tenantId)
      .not("pricing_details", "is", null)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle<{ id: string }>(),
    supabase
      .from("media_assets")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("media_type", "image")
      .eq("status", "active")
      .limit(1)
      .maybeSingle<{ id: string }>()
  ]);

  return Boolean(propriedade && foto);
}

async function hasConfiguredAvailabilityAndBilling(tenantId: string) {
  const supabase = await criarClienteSupabaseServer();
  const [{ data: bloqueio }, { data: configuracao }] = await Promise.all([
    supabase
      .from("calendar_availability_blocks")
      .select("id")
      .eq("tenant_id", tenantId)
      .limit(1)
      .maybeSingle<{ id: string }>(),
    supabase
      .from("tenant_settings")
      .select("id")
      .eq("tenant_id", tenantId)
      .or("pix_key.not.is.null,mercado_pago_enabled.eq.true,payment_collection_method.not.is.null")
      .limit(1)
      .maybeSingle<{ id: string }>()
  ]);

  return Boolean(bloqueio || configuracao);
}
