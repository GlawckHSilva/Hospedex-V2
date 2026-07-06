"use server";

import type { FeatureFlagRow, TenantCleaningPolicy } from "@hospedex/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirAutenticacao } from "../auth/context";
import type { ContextoAutenticacao } from "../auth/types";
import {
  enviarLogoTenantParaStorage,
  obterArquivoImagem,
  removerLogoTenantDoStorage
} from "../properties/media-storage";
import {
  carregarResumoCredencialMercadoPago,
  removerCredencialMercadoPago,
  removerWebhookSecretMercadoPago,
  salvarCredencialMercadoPago,
  salvarWebhookSecretMercadoPago
} from "../payments/mercado-pago-credentials";
import { criarClienteSupabaseServer } from "../supabase/server";
import {
  podeGerenciarConfiguracoes,
  podeGerenciarModulosConfiguracoes
} from "./data";
import {
  MODULOS_GERENCIAMENTO_CONFIGURAVEIS,
  POLITICAS_LIMPEZA,
  type ChaveModuloGerenciamento
} from "./types";

/**
 * Server actions das Configuracoes do Gerenciamento.
 *
 * Todas as alteracoes sensiveis passam pelo servidor e pela sessao Supabase do
 * usuario autenticado. A service role nao entra no frontend nem nestas actions.
 */

const CAMINHO_CONFIGURACOES = "/configuracoes";

class ErroRegraConfiguracoes extends Error {}

type EscopoConfiguracoes = {
  contexto: ContextoAutenticacao;
  ownerId: string;
  tenantId: string;
};

export async function atualizarConfiguracoesGeraisAction(formData: FormData) {
  const escopo = await carregarEscopoConfiguracoes();

  try {
    const supabase = await criarClienteSupabaseServer();
    const entrada = await obterEntradaGeral(formData, supabase, escopo);

    const { error: erroTenant } = await supabase
      .from("tenants")
      .update({ name: entrada.tenantName })
      .eq("id", escopo.tenantId)
      .eq("owner_id", escopo.ownerId);

    if (erroTenant) throw new Error(erroTenant.message);

    const { error } = await supabase.from("tenant_settings").upsert(
      {
        tenant_id: escopo.tenantId,
        owner_id: escopo.ownerId,
        logo_url: entrada.logoUrl,
        phone: entrada.phone,
        whatsapp: entrada.whatsapp,
        email: entrada.email,
        city: entrada.city,
        state: entrada.state,
        short_description: entrada.shortDescription
      },
      { onConflict: "tenant_id" }
    );

    if (error) throw new Error(error.message);
    revalidarConfiguracoes();
  } catch (erro) {
    redirecionarComErro(erro, "Não foi possível salvar as configurações. Tente novamente.");
  }

  redirect(`${CAMINHO_CONFIGURACOES}?sucesso=configuracoes-atualizadas`);
}

export async function atualizarPreferenciasOperacionaisAction(formData: FormData) {
  const escopo = await carregarEscopoConfiguracoes();

  try {
    const supabase = await criarClienteSupabaseServer();
    const entrada = obterEntradaOperacional(formData);

    const { error } = await supabase.from("tenant_settings").upsert(
      {
        tenant_id: escopo.tenantId,
        owner_id: escopo.ownerId,
        default_check_in_time: entrada.defaultCheckInTime,
        default_check_out_time: entrada.defaultCheckOutTime,
        cleaning_policy: entrada.cleaningPolicy,
        allow_manual_reservations: entrada.allowManualReservations,
        require_payment_confirmation: entrada.requirePaymentConfirmation,
        require_checkin_confirmation: entrada.requireCheckinConfirmation,
        require_checkout_confirmation: entrada.requireCheckoutConfirmation
      },
      { onConflict: "tenant_id" }
    );

    if (error) throw new Error(error.message);
    revalidarConfiguracoes();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao salvar preferencias operacionais.");
  }

  redirect(`${CAMINHO_CONFIGURACOES}?sucesso=preferencias-atualizadas`);
}

export async function atualizarInstrucoesPagamentoAction(formData: FormData) {
  const escopo = await carregarEscopoConfiguracoes();

  try {
    const supabase = await criarClienteSupabaseServer();
    const mercadoPagoEnabled = checkboxAtivo(formData, "mercadoPagoEnabled");
    const mercadoPagoEnvironment = validarAmbienteMercadoPago(
      textoOpcional(formData, "mercadoPagoEnvironment") ?? "sandbox"
    );
    const mercadoPagoPublicKey = textoOpcional(formData, "mercadoPagoPublicKey");
    const mercadoPagoAccessToken = textoOpcional(formData, "mercadoPagoAccessToken");
    const mercadoPagoWebhookSecret = textoOpcional(formData, "mercadoPagoWebhookSecret");
    const mercadoPagoAccessTokenSecretName = textoOpcional(
      formData,
      "mercadoPagoAccessTokenSecretName"
    );
    const removerMercadoPago = checkboxAtivo(formData, "removerMercadoPago");
    const removerMercadoPagoWebhookSecret = checkboxAtivo(
      formData,
      "removerMercadoPagoWebhookSecret"
    );
    const credencialAtual = await carregarResumoCredencialMercadoPago(escopo.tenantId);

    /*
      O Mercado Pago pode ser configurado pelo Hospedex ou, temporariamente,
      por variavel de ambiente legada. O token digitado nunca volta para a UI.
    */
    if (
      mercadoPagoEnabled &&
      !mercadoPagoAccessToken &&
      (!credencialAtual.conectado || removerMercadoPago) &&
      !mercadoPagoAccessTokenSecretName
    ) {
      throw new ErroRegraConfiguracoes(
        "Informe o access token do Mercado Pago ou conecte uma credencial antes de ativar."
      );
    }
    if (mercadoPagoWebhookSecret && !mercadoPagoAccessToken && !credencialAtual.conectado) {
      throw new ErroRegraConfiguracoes(
        "Configure o Access Token Mercado Pago antes de salvar o Webhook Secret."
      );
    }

    const { error } = await supabase.from("tenant_settings").upsert(
      {
        tenant_id: escopo.tenantId,
        owner_id: escopo.ownerId,
        pix_key: textoOpcional(formData, "pixKey"),
        pix_key_type: validarTipoChavePix(textoOpcional(formData, "pixKeyType") ?? "aleatoria"),
        pix_receiver_name: textoOpcional(formData, "pixReceiverName"),
        payment_receiver_document: textoOpcional(formData, "paymentReceiverDocument"),
        pix_bank_name: textoOpcional(formData, "pixBankName"),
        pix_payment_note: textoOpcional(formData, "pixPaymentNote"),
        cash_payment_instructions:
          textoOpcional(formData, "cashPaymentInstructions") ??
          "Pagamento em dinheiro no check-in, conforme combinado com o proprietario.",
        debit_card_payment_instructions:
          textoOpcional(formData, "debitCardPaymentInstructions") ??
          "Pagamento via debito conforme disponibilidade do proprietario.",
        bank_transfer_payment_instructions: textoOpcional(
          formData,
          "bankTransferPaymentInstructions"
        ),
        credit_card_payment_instructions:
          textoOpcional(formData, "creditCardPaymentInstructions") ??
          "Pagamento via credito conforme regras combinadas com o proprietario.",
        credit_card_installments_note: textoOpcional(formData, "creditCardInstallmentsNote"),
        payment_collection_method: validarMetodoCobranca(
          textoOpcional(formData, "paymentCollectionMethod") ?? "manual"
        ),
        manual_payment_deadline_hours: numeroInteiroOpcional(
          formData,
          "manualPaymentDeadlineHours",
          24
        ),
        mercado_pago_enabled: mercadoPagoEnabled,
        mercado_pago_environment: mercadoPagoEnvironment,
        mercado_pago_public_key: mercadoPagoPublicKey,
        mercado_pago_access_token_secret_name: mercadoPagoAccessTokenSecretName,
        mercado_pago_default_charge_strategy: validarEstrategiaMercadoPago(
          textoOpcional(formData, "mercadoPagoDefaultChargeStrategy") ?? "full"
        ),
        mercado_pago_default_deposit_percent: numeroDecimalOpcional(
          formData,
          "mercadoPagoDefaultDepositPercent"
        ),
        mercado_pago_default_deposit_fixed: numeroDecimalOpcional(
          formData,
          "mercadoPagoDefaultDepositFixed"
        ),
        mercado_pago_default_deadline_hours: numeroInteiroOpcional(
          formData,
          "mercadoPagoDefaultDeadlineHours",
          24
        )
      },
      { onConflict: "tenant_id" }
    );

    if (error) throw new Error(error.message);

    if (mercadoPagoAccessToken) {
      await salvarCredencialMercadoPago({
        accessToken: mercadoPagoAccessToken,
        ambiente: mercadoPagoEnvironment,
        ownerId: escopo.ownerId,
        publicKey: mercadoPagoPublicKey,
        tenantId: escopo.tenantId,
        userId: escopo.contexto.userId,
        webhookSecret: mercadoPagoWebhookSecret
      });
    } else if (removerMercadoPago) {
      await removerCredencialMercadoPago(escopo.tenantId);
    } else if (mercadoPagoWebhookSecret) {
      await salvarWebhookSecretMercadoPago({
        tenantId: escopo.tenantId,
        userId: escopo.contexto.userId,
        webhookSecret: mercadoPagoWebhookSecret
      });
    } else if (removerMercadoPagoWebhookSecret) {
      await removerWebhookSecretMercadoPago(escopo.tenantId);
    }

    revalidarConfiguracoes();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao salvar instrucoes de pagamento.");
  }

  redirect(`${CAMINHO_CONFIGURACOES}?sucesso=pagamentos-atualizados`);
}

export async function alternarModuloGerenciamentoAction(formData: FormData) {
  const escopo = await carregarEscopoModulos();

  try {
    const supabase = await criarClienteSupabaseServer();
    const key = validarChaveModulo(textoObrigatorio(formData, "modulo", "modulo"));
    const enabled = textoObrigatorio(formData, "ativo", "status") === "true";
    const { data: flag, error: erroFlag } = await supabase
      .from("feature_flags")
      .select("*")
      .eq("key", key)
      .maybeSingle<FeatureFlagRow>();

    if (erroFlag) throw new Error(erroFlag.message);
    if (!flag) throw new ErroRegraConfiguracoes("Modulo nao liberado para este tenant.");
    if (!flag.owner_configurable) {
      throw new ErroRegraConfiguracoes("Este modulo so pode ser alterado pelo Super Admin.");
    }

    const { error } = await supabase.from("tenant_features").upsert(
      {
        tenant_id: escopo.tenantId,
        feature_flag_id: flag.id,
        enabled,
        configured_by: escopo.contexto.userId
      },
      { onConflict: "tenant_id,feature_flag_id" }
    );

    if (error) throw new Error(error.message);
    revalidarConfiguracoes();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao atualizar modulo.");
  }

  redirect(`${CAMINHO_CONFIGURACOES}?sucesso=modulo-atualizado`);
}

export async function alterarSenhaConfiguracoesAction(formData: FormData) {
  await exigirAutenticacao();

  try {
    const senha = textoObrigatorio(formData, "password", "nova senha");
    const confirmacao = textoObrigatorio(formData, "passwordConfirm", "confirmacao da senha");

    if (senha.length < 8) {
      throw new ErroRegraConfiguracoes("A senha deve ter pelo menos 8 caracteres.");
    }
    if (senha !== confirmacao) {
      throw new ErroRegraConfiguracoes("A confirmacao da senha nao confere.");
    }

    const supabase = await criarClienteSupabaseServer();
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) throw new Error(error.message);
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao alterar senha.");
  }

  redirect(`${CAMINHO_CONFIGURACOES}?sucesso=senha-atualizada`);
}

async function carregarEscopoConfiguracoes(): Promise<EscopoConfiguracoes> {
  const contexto = await exigirAutenticacao();

  if (!contexto.tenant || !podeGerenciarConfiguracoes(contexto)) {
    redirect("/sem-acesso?motivo=permissao-insuficiente");
  }

  return {
    contexto,
    ownerId: contexto.tenant.owner_id,
    tenantId: contexto.tenant.id
  };
}

async function carregarEscopoModulos(): Promise<EscopoConfiguracoes> {
  const contexto = await exigirAutenticacao();

  if (!contexto.tenant || !podeGerenciarModulosConfiguracoes(contexto)) {
    redirect("/sem-acesso?motivo=permissao-insuficiente");
  }

  return {
    contexto,
    ownerId: contexto.tenant.owner_id,
    tenantId: contexto.tenant.id
  };
}

async function obterEntradaGeral(
  formData: FormData,
  supabase: Awaited<ReturnType<typeof criarClienteSupabaseServer>>,
  escopo: EscopoConfiguracoes
) {
  const logoAtual = textoOpcional(formData, "logoUrlAtual");
  const removerLogo = formData.get("removerLogo") === "on";
  const arquivoLogo = obterArquivoImagem(formData, "logoFile");
  let logoUrl = logoAtual;

  if (removerLogo) {
    // Remover a logo limpa a referencia do tenant e apaga o arquivo apenas quando
    // ele pertence ao path seguro do proprio tenant no Storage.
    await removerLogoTenantDoStorage(supabase, { tenantId: escopo.tenantId }, logoAtual);
    logoUrl = null;
  }

  if (arquivoLogo) {
    // O upload fica no servidor para validar permissoes antes de gravar arquivo
    // em path isolado por tenant_id no Supabase Storage.
    const logoEnviada = await enviarLogoTenantParaStorage(
      supabase,
      { tenantId: escopo.tenantId },
      arquivoLogo
    );

    if (logoAtual && logoAtual !== logoEnviada.url) {
      await removerLogoTenantDoStorage(supabase, { tenantId: escopo.tenantId }, logoAtual);
    }

    logoUrl = logoEnviada.url;
  }

  return {
    city: textoOpcional(formData, "city"),
    email: textoOpcional(formData, "email"),
    logoUrl,
    phone: validarTelefoneOpcional(formData, "phone"),
    shortDescription: validarDescricaoCurta(textoOpcional(formData, "shortDescription")),
    state: validarEstado(textoOpcional(formData, "state")),
    tenantName: textoObrigatorio(formData, "tenantName", "nome do empreendimento"),
    whatsapp: validarTelefoneOpcional(formData, "whatsapp")
  };
}

function obterEntradaOperacional(formData: FormData) {
  return {
    allowManualReservations: checkboxAtivo(formData, "allowManualReservations"),
    cleaningPolicy: validarPoliticaLimpeza(
      textoObrigatorio(formData, "cleaningPolicy", "politica de limpeza")
    ),
    defaultCheckInTime: validarHora(textoObrigatorio(formData, "defaultCheckInTime", "check-in")),
    defaultCheckOutTime: validarHora(
      textoObrigatorio(formData, "defaultCheckOutTime", "check-out")
    ),
    requireCheckinConfirmation: checkboxAtivo(formData, "requireCheckinConfirmation"),
    requireCheckoutConfirmation: checkboxAtivo(formData, "requireCheckoutConfirmation"),
    requirePaymentConfirmation: checkboxAtivo(formData, "requirePaymentConfirmation")
  };
}

function validarChaveModulo(valor: string): ChaveModuloGerenciamento {
  const chaves = MODULOS_GERENCIAMENTO_CONFIGURAVEIS.map((modulo) => modulo.key);
  if (chaves.includes(valor as ChaveModuloGerenciamento)) {
    return valor as ChaveModuloGerenciamento;
  }

  throw new ErroRegraConfiguracoes("Modulo invalido.");
}

function validarPoliticaLimpeza(valor: string): TenantCleaningPolicy {
  const politicas = POLITICAS_LIMPEZA.map((politica) => politica.value);
  if (politicas.includes(valor as TenantCleaningPolicy)) {
    return valor as TenantCleaningPolicy;
  }

  throw new ErroRegraConfiguracoes("Politica de limpeza invalida.");
}

function validarTipoChavePix(valor: string) {
  if (["cpf", "cnpj", "email", "telefone", "aleatoria"].includes(valor)) {
    return valor;
  }

  throw new ErroRegraConfiguracoes("Tipo de chave Pix invalido.");
}

function validarMetodoCobranca(valor: string) {
  if (["manual", "mercado_pago"].includes(valor)) return valor;
  throw new ErroRegraConfiguracoes("Metodo de cobranca invalido.");
}

function validarAmbienteMercadoPago(valor: string): "sandbox" | "production" {
  if (["sandbox", "production"].includes(valor)) return valor as "sandbox" | "production";
  throw new ErroRegraConfiguracoes("Ambiente do Mercado Pago invalido.");
}

function validarEstrategiaMercadoPago(valor: string) {
  if (["full", "deposit_percent", "deposit_fixed", "manual_amount"].includes(valor)) {
    return valor;
  }
  throw new ErroRegraConfiguracoes("Tipo de cobranca padrao invalido.");
}

function validarEstado(valor: string | null): string | null {
  if (!valor) return null;
  if (/^[A-Za-z]{2}$/.test(valor)) return valor.toUpperCase();
  throw new ErroRegraConfiguracoes("Informe o estado com duas letras.");
}

function validarTelefoneOpcional(formData: FormData, campo: string): string | null {
  const valor = textoOpcional(formData, campo);
  if (!valor) return null;

  const digitos = valor.replace(/\D/g, "");
  if (digitos.length >= 10 && digitos.length <= 11) return valor;

  throw new ErroRegraConfiguracoes("Informe um número válido.");
}

function validarDescricaoCurta(valor: string | null): string | null {
  if (!valor) return null;
  if (valor.length <= 160) return valor;
  throw new ErroRegraConfiguracoes("A descrição curta deve ter até 160 caracteres.");
}

function validarHora(valor: string): string {
  if (/^\d{2}:\d{2}$/.test(valor)) return valor;
  throw new ErroRegraConfiguracoes("Informe um horario valido.");
}

function textoObrigatorio(formData: FormData, chave: string, label: string): string {
  const valor = formData.get(chave)?.toString().trim();
  if (!valor) throw new ErroRegraConfiguracoes(`Informe ${label}.`);
  return valor;
}

function textoOpcional(formData: FormData, chave: string): string | null {
  const valor = formData.get(chave)?.toString().trim();
  return valor ? valor : null;
}

function numeroDecimalOpcional(formData: FormData, chave: string): number | null {
  const valor = formData.get(chave)?.toString().replace(",", ".").trim();
  if (!valor) return null;
  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero < 0) {
    throw new ErroRegraConfiguracoes("Informe um valor numerico valido.");
  }
  return numero;
}

function numeroInteiroOpcional(formData: FormData, chave: string, padrao: number): number {
  const valor = formData.get(chave)?.toString().trim();
  if (!valor) return padrao;
  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero < 1 || numero > 720) {
    throw new ErroRegraConfiguracoes("Informe um prazo entre 1 e 720 horas.");
  }
  return numero;
}

function checkboxAtivo(formData: FormData, chave: string): boolean {
  return formData.get(chave) === "on";
}

function revalidarConfiguracoes() {
  revalidatePath(CAMINHO_CONFIGURACOES);
  revalidatePath("/");
}

function redirecionarComErro(erro: unknown, mensagemPadrao: string): never {
  if (!(erro instanceof ErroRegraConfiguracoes)) {
    console.error(mensagemPadrao, erro);
  }

  const mensagem = erro instanceof ErroRegraConfiguracoes ? erro.message : mensagemPadrao;
  redirect(`${CAMINHO_CONFIGURACOES}?erro=${encodeURIComponent(mensagem)}`);
}
