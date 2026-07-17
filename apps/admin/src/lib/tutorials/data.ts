import type { ContextoAutenticacao } from "../auth/types";
import { carregarEstadoLicencaTenant } from "../license-state";
import { criarClienteSupabaseServer } from "../supabase/server";
import {
  TUTORIAL_GERENCIAMENTO_KEY,
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
  const [progressosResultado, checks, licenca] = await Promise.all([
    supabase
      .from("user_tutorial_progress")
      .select("*")
      .eq("tenant_id", contexto.tenant.id)
      .eq("user_id", contexto.userId)
      .returns<TutorialProgressRow[]>(),
    carregarChecks(contexto.tenant.id),
    carregarEstadoLicencaTenant(contexto.tenant.id)
  ]);

  if (progressosResultado.error) {
    console.error("Nao foi possivel carregar progresso do onboarding.", progressosResultado.error.message);
  }

  const progressos = progressosResultado.data ?? [];
  const boasVindas = progressos.find((item) => item.tutorial_key === TUTORIAL_WELCOME_KEY);
  const checklist = obterChecklistPermitido(contexto, checks);
  const concluidas = checklist.filter((item) => item.concluida).length;
  const progresso = checklist.length ? Math.round((concluidas / checklist.length) * 100) : 0;

  return {
    checklist,
    progresso,
    mostrarBoasVindas: !boasVindas || boasVindas.status === "not_started",
    somenteLeitura: licenca.isReadOnlyByExpiredLicense,
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
