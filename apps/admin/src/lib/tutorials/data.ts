import type { ContextoAutenticacao } from "../auth/types";
import { carregarEstadoLicencaTenant } from "../license-state";
import { criarClienteSupabaseServer } from "../supabase/server";
import {
  TUTORIAL_GERENCIAMENTO_KEY,
  TUTORIAL_WELCOME_KEY,
  obterChecklistPermitido
} from "./registry";
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
    usuarioNome: contexto.profile.full_name ?? contexto.profile.email
  };
}

async function carregarChecks(tenantId: string): Promise<Record<string, boolean>> {
  const supabase = await criarClienteSupabaseServer();
  const [
    configuracoes,
    primeiraCasa,
    fotos,
    publicacao,
    calendario,
    reserva,
    pagamento
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
    supabase
      .from("media_assets")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("media_type", "image")
      .eq("status", "active")
      .limit(1)
      .maybeSingle<{ id: string }>(),
    supabase
      .from("properties")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("status", "published")
      .eq("is_public", true)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle<{ id: string }>(),
    supabase
      .from("calendar_availability_blocks")
      .select("id")
      .eq("tenant_id", tenantId)
      .limit(1)
      .maybeSingle<{ id: string }>(),
    supabase
      .from("reservations")
      .select("id")
      .eq("tenant_id", tenantId)
      .limit(1)
      .maybeSingle<{ id: string }>(),
    supabase
      .from("reservations")
      .select("id")
      .eq("tenant_id", tenantId)
      .in("payment_status", ["paid", "received"])
      .limit(1)
      .maybeSingle<{ id: string }>()
  ]);

  return {
    configuracoes: Boolean(configuracoes.data),
    "primeira-casa": Boolean(primeiraCasa.data),
    fotos: Boolean(fotos.data),
    publicacao: Boolean(publicacao.data),
    calendario: Boolean(calendario.data),
    reserva: Boolean(reserva.data),
    pagamento: Boolean(pagamento.data)
  };
}
