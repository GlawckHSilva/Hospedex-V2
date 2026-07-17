import type {
  FeatureFlagRow,
  TenantFeatureRow,
  TenantSettingRow
} from "@hospedex/types";

import type {
  ContextoAutenticacao,
  TenantContextoAutenticacao
} from "../auth/types";
import { carregarResumoCredencialMercadoPago } from "../payments/mercado-pago-credentials";
import { normalizarVariavelAmbiente } from "../supabase/env";
import { criarClienteSupabaseServer } from "../supabase/server";
import {
  MODULOS_GERENCIAMENTO_CONFIGURAVEIS,
  type ConfiguracoesTenantGerenciamento,
  type DadosConfiguracoesGerenciamento,
  type ModuloGerenciamentoConfiguravel
} from "./types";

/**
 * Leitura das Configuracoes do Gerenciamento.
 *
 * Toda consulta parte do tenant do contexto autenticado. Isso impede que IDs
 * enviados pela interface sejam usados para atravessar dados de outro cliente.
 */

const PERMISSOES_LEITURA = [
  "settings.manage",
  "tenants.manage",
  "members.manage",
  "roles.manage"
] as const;

const PERMISSOES_GESTAO = ["settings.manage", "tenants.manage"] as const;

export function podeLerConfiguracoes(contexto: ContextoAutenticacao): boolean {
  if (contexto.role === "owner") return true;
  if (contexto.role === "super_admin") return false;
  return PERMISSOES_LEITURA.some((permissao) => contexto.permissions.includes(permissao));
}

export function podeGerenciarConfiguracoes(contexto: ContextoAutenticacao): boolean {
  if (contexto.role === "owner") return true;
  return PERMISSOES_GESTAO.some((permissao) => contexto.permissions.includes(permissao));
}

export function podeGerenciarModulosConfiguracoes(contexto: ContextoAutenticacao): boolean {
  // Apenas o proprietario pode ligar/desligar modulos do proprio tenant.
  // Funcionarios podem ter permissao administrativa, mas nao controlam o plano contratado.
  return contexto.role === "owner";
}

export async function carregarDadosConfiguracoesGerenciamento(
  contexto: ContextoAutenticacao
): Promise<DadosConfiguracoesGerenciamento> {
  const tenant = contexto.tenant;

  if (!tenant) {
    return criarDadosVazios("Tenant nao encontrado");
  }

  const supabase = await criarClienteSupabaseServer();
  const chaves = MODULOS_GERENCIAMENTO_CONFIGURAVEIS.map((modulo) => modulo.key);
  const [
    configuracoesResultado,
    credencialMercadoPago,
    flagsResultado,
    tenantFeaturesResultado
  ] =
    await Promise.all([
      supabase
        .from("tenant_settings")
        .select("*")
        .eq("tenant_id", tenant.id)
        .maybeSingle<TenantSettingRow>(),
      carregarResumoCredencialMercadoPago(tenant.id),
      supabase
        .from("feature_flags")
        .select("*")
        .in("key", chaves)
        .returns<FeatureFlagRow[]>(),
      supabase
        .from("tenant_features")
        .select("*")
        .eq("tenant_id", tenant.id)
        .returns<TenantFeatureRow[]>()
    ]);

  registrarErroLeitura("configuracoes do tenant", configuracoesResultado.error);
  registrarErroLeitura("feature flags do gerenciamento", flagsResultado.error);
  registrarErroLeitura("modulos do tenant", tenantFeaturesResultado.error);

  const flags = flagsResultado.data ?? [];
  const tenantFeatures = tenantFeaturesResultado.data ?? [];

  return {
    configuracoes: normalizarConfiguracoes(
      tenant,
      configuracoesResultado.data ?? null,
      credencialMercadoPago
    ),
    modulos: montarModulos(contexto, flags, tenantFeatures),
    podeGerenciarConfiguracoes: podeGerenciarConfiguracoes(contexto),
    podeGerenciarModulos: podeGerenciarModulosConfiguracoes(contexto),
    sessoesFuturasDisponiveis: false,
    tenantNome: tenant.name
  };
}

function normalizarConfiguracoes(
  tenant: TenantContextoAutenticacao,
  configuracoes: TenantSettingRow | null,
  mercadoPagoCredencial = {
    conectado: false,
    last4: null as string | null,
    webhookSecretConfigurado: false,
    webhookSecretLast4: null as string | null
  }
): ConfiguracoesTenantGerenciamento {
  return {
    allow_manual_reservations: configuracoes?.allow_manual_reservations ?? true,
    city: configuracoes?.city ?? null,
    cleaning_policy: configuracoes?.cleaning_policy ?? "after_checkout",
    default_check_in_time: cortarHora(configuracoes?.default_check_in_time ?? "14:00"),
    default_check_out_time: cortarHora(configuracoes?.default_check_out_time ?? "11:00"),
    email: configuracoes?.email ?? null,
    logo_url: configuracoes?.logo_url ?? null,
    phone: configuracoes?.phone ?? null,
    pix_bank_name: configuracoes?.pix_bank_name ?? null,
    pix_key: configuracoes?.pix_key ?? null,
    pix_key_type: configuracoes?.pix_key_type ?? "aleatoria",
    pix_payment_note: configuracoes?.pix_payment_note ?? null,
    pix_receiver_name: configuracoes?.pix_receiver_name ?? null,
    payment_receiver_document: configuracoes?.payment_receiver_document ?? null,
    payment_collection_method: configuracoes?.payment_collection_method ?? "manual",
    manual_payment_deadline_hours: configuracoes?.manual_payment_deadline_hours ?? 24,
    mercado_pago_enabled: configuracoes?.mercado_pago_enabled ?? false,
    mercado_pago_environment: configuracoes?.mercado_pago_environment ?? "sandbox",
    mercado_pago_public_key: configuracoes?.mercado_pago_public_key ?? null,
    mercado_pago_access_token_secret_name:
      configuracoes?.mercado_pago_access_token_secret_name ?? null,
    mercado_pago_default_charge_strategy:
      configuracoes?.mercado_pago_default_charge_strategy ?? "full",
    mercado_pago_default_deposit_percent:
      configuracoes?.mercado_pago_default_deposit_percent ?? null,
    mercado_pago_default_deposit_fixed:
      configuracoes?.mercado_pago_default_deposit_fixed ?? null,
    mercado_pago_default_deadline_hours:
      configuracoes?.mercado_pago_default_deadline_hours ?? 24,
    mercadoPagoCredencial,
    mercadoPagoWebhookUrl: montarWebhookMercadoPagoUrl(tenant.id),
    primary_color: configuracoes?.primary_color ?? "#06b6d4",
    require_checkin_confirmation: configuracoes?.require_checkin_confirmation ?? true,
    require_checkout_confirmation: configuracoes?.require_checkout_confirmation ?? true,
    require_payment_confirmation: configuracoes?.require_payment_confirmation ?? true,
    short_description: configuracoes?.short_description ?? null,
    state: configuracoes?.state ?? null,
    tenantName: tenant.name,
    whatsapp: configuracoes?.whatsapp ?? null,
    bank_transfer_payment_instructions: configuracoes?.bank_transfer_payment_instructions ?? null,
    cash_payment_instructions: configuracoes?.cash_payment_instructions ?? null,
    credit_card_installments_note: configuracoes?.credit_card_installments_note ?? null,
    credit_card_payment_instructions: configuracoes?.credit_card_payment_instructions ?? null,
    debit_card_payment_instructions: configuracoes?.debit_card_payment_instructions ?? null
  };
}

function montarModulos(
  contexto: ContextoAutenticacao,
  flags: FeatureFlagRow[],
  tenantFeatures: TenantFeatureRow[]
): ModuloGerenciamentoConfiguravel[] {
  const flagsPorChave = new Map(flags.map((flag) => [flag.key, flag]));
  const tenantFeaturesPorFlag = new Map(
    tenantFeatures.map((tenantFeature) => [tenantFeature.feature_flag_id, tenantFeature])
  );
  const podeGerenciarModulos = podeGerenciarModulosConfiguracoes(contexto);

  return MODULOS_GERENCIAMENTO_CONFIGURAVEIS.map((modulo) => {
    const flag = flagsPorChave.get(modulo.key);
    const tenantFeature = flag ? tenantFeaturesPorFlag.get(flag.id) : null;
    const liberado = Boolean(flag);
    const configuravelPeloProprietario = Boolean(
      flag?.owner_configurable && podeGerenciarModulos
    );

    return {
      ativo: flag ? tenantFeature?.enabled ?? flag.default_enabled : false,
      configuravelPeloProprietario,
      descricao: modulo.descricao,
      key: modulo.key,
      label: modulo.label,
      liberado,
      motivoBloqueio: obterMotivoBloqueio(flag, podeGerenciarModulos)
    };
  });
}

function obterMotivoBloqueio(
  flag: FeatureFlagRow | undefined,
  podeGerenciarModulos: boolean
): string | null {
  if (!flag) return "Modulo ainda nao liberado para este tenant.";
  if (!flag.owner_configurable) return "Controle exclusivo do Super Admin.";
  if (!podeGerenciarModulos) return "Somente o proprietario pode alterar modulos.";
  return null;
}

function cortarHora(valor: string): string {
  return valor.slice(0, 5);
}

function criarDadosVazios(tenantNome: string): DadosConfiguracoesGerenciamento {
  return {
    configuracoes: {
      allow_manual_reservations: true,
      city: null,
      cleaning_policy: "after_checkout",
      default_check_in_time: "14:00",
      default_check_out_time: "11:00",
      email: null,
      logo_url: null,
      phone: null,
      pix_bank_name: null,
      pix_key: null,
      pix_key_type: "aleatoria",
      pix_payment_note: null,
      pix_receiver_name: null,
      payment_receiver_document: null,
      payment_collection_method: "manual",
      manual_payment_deadline_hours: 24,
      mercado_pago_enabled: false,
      mercado_pago_environment: "sandbox",
      mercado_pago_public_key: null,
      mercado_pago_access_token_secret_name: null,
      mercado_pago_default_charge_strategy: "full",
      mercado_pago_default_deposit_percent: null,
      mercado_pago_default_deposit_fixed: null,
      mercado_pago_default_deadline_hours: 24,
      mercadoPagoCredencial: {
        conectado: false,
        last4: null,
        webhookSecretConfigurado: false,
        webhookSecretLast4: null
      },
      mercadoPagoWebhookUrl: null,
      primary_color: "#06b6d4",
      require_checkin_confirmation: true,
      require_checkout_confirmation: true,
      require_payment_confirmation: true,
      short_description: null,
      state: null,
      tenantName: tenantNome,
      whatsapp: null,
      bank_transfer_payment_instructions: null,
      cash_payment_instructions: null,
      credit_card_installments_note: null,
      credit_card_payment_instructions: null,
      debit_card_payment_instructions: null
    },
    modulos: [],
    podeGerenciarConfiguracoes: false,
    podeGerenciarModulos: false,
    sessoesFuturasDisponiveis: false,
    tenantNome
  };
}

function registrarErroLeitura(label: string, erro: { message: string } | null) {
  if (erro) console.error(`Erro ao carregar ${label}.`, erro.message);
}

function montarWebhookMercadoPagoUrl(tenantId: string): string | null {
  const base = normalizarVariavelAmbiente(process.env.APP_PUBLIC_URL);
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/api/webhooks/mercado-pago?tenant=${encodeURIComponent(tenantId)}`;
}
