import "server-only";

import type {
  EmailDeliveryAudience,
  EmailDeliveryLogRow,
  EmailDeliveryStatus,
  JsonValue,
  UUID,
} from "@hospedex/types";
import { Resend } from "resend";

import { criarClienteSupabaseServer } from "../supabase/server";

/**
 * Serviço server-side de e-mail da V2.
 *
 * Centraliza Resend, modo test/production e logs de entrega. Nenhuma chave do
 * provedor sai do servidor, e o modo teste impede envio automático para
 * hóspedes reais enquanto o domínio próprio ainda não foi validado.
 */

const REMETENTE_TESTE_PADRAO = "Hospedex <onboarding@resend.dev>";
const MENSAGEM_RESTRICAO_TESTE =
  "Em modo teste, o envio só pode ser feito para o e-mail autorizado na conta Resend.";
const MENSAGEM_RESEND_NAO_CONFIGURADO =
  "Resend não configurado. Adicione RESEND_API_KEY nas variáveis de ambiente da Vercel e faça um novo deploy.";

export type EmailMode = "test" | "production";

export type EmailServiceStatus = EmailDeliveryStatus;

export type EmailServiceResult = {
  message: string;
  providerMessageId?: string | undefined;
  recipientEmail?: string | undefined;
  status: EmailServiceStatus;
  success: boolean;
};

export type EmailPayload = {
  audience: EmailDeliveryAudience;
  eventType: string;
  html?: string | undefined;
  ownerId?: UUID | null | undefined;
  payload?: JsonValue | undefined;
  referenceId?: UUID | null | undefined;
  replyTo?: string | null | undefined;
  subject: string;
  templateKey?: string | null | undefined;
  tenantId: UUID;
  text: string;
  to: string;
};

export type GuestTemplateTestInput = {
  body: string;
  buttonText?: string | null | undefined;
  buttonUrl?: string | null | undefined;
  ownerEmail: string;
  ownerId: UUID;
  subject: string;
  templateKey: string;
  tenantId: UUID;
  title: string;
};

export type EmailServiceConfigStatus = {
  apiKeyConfigured: boolean;
  currentFrom: string;
  fromConfigured: boolean;
  mode: EmailMode;
  providerStatus: "not_configured" | "test" | "active";
  testRecipient: string | null;
};

export type RenderEmailTemplateInput = {
  body: string;
  buttonText?: string | null | undefined;
  buttonUrl?: string | null | undefined;
  isTest?: boolean | undefined;
  subject: string;
  title: string;
};

export function getEmailServiceConfigStatus(): EmailServiceConfigStatus {
  const config = carregarConfiguracaoEmail();

  return {
    apiKeyConfigured: Boolean(config.apiKey),
    currentFrom: config.from,
    fromConfigured: Boolean(config.from),
    mode: config.mode,
    providerStatus: !config.apiKey || !config.from
      ? "not_configured"
      : config.mode === "test"
        ? "test"
        : "active",
    testRecipient: config.testRecipient,
  };
}

export async function sendEmail(payload: EmailPayload): Promise<EmailServiceResult> {
  const config = carregarConfiguracaoEmail();
  const destinatario = resolveRecipientEmail(payload.to, config);

  if (!config.apiKey) {
    return registrarFalhaConfiguracao(payload, destinatario, MENSAGEM_RESEND_NAO_CONFIGURADO);
  }

  if (!config.from) {
    return registrarFalhaConfiguracao(
      payload,
      destinatario,
      "Remetente de e-mail não configurado. Defina EMAIL_FROM nas variáveis de ambiente.",
    );
  }

  if (!destinatario || !emailValido(destinatario)) {
    return registrarFalhaConfiguracao(payload, destinatario, "E-mail do destinatário não encontrado.");
  }

  try {
    const resend = new Resend(config.apiKey);
    const replyTo = payload.replyTo ?? config.replyTo;
    const opcoesEnvio = {
      from: config.from,
      subject: payload.subject,
      text: payload.text,
      to: destinatario,
      ...(payload.html ? { html: payload.html } : {}),
      ...(replyTo ? { replyTo } : {}),
    };
    const { data, error } = await resend.emails.send(opcoesEnvio);

    if (error) {
      const erroTecnico = serializarErro(error);
      const mensagem = mensagemAmigavelResend(erroTecnico, config.mode);

      if (process.env.NODE_ENV !== "production") {
        console.error("Falha ao enviar e-mail pelo Resend.", erroTecnico);
      }

      await registrarLogSeguro({
        ...payload,
        errorMessage: erroTecnico,
        recipientEmail: destinatario,
        status: "failed",
      });

      return {
        message: mensagem,
        recipientEmail: destinatario,
        status: "failed",
        success: false,
      };
    }

    const status: EmailDeliveryStatus = config.mode === "test" ? "test" : "sent";
    await registrarLogSeguro({
      ...payload,
      providerMessageId: data?.id ?? null,
      recipientEmail: destinatario,
      status,
    });

    return {
      message:
        config.mode === "test"
          ? "E-mail de teste enviado para o seu e-mail."
          : "E-mail enviado.",
      providerMessageId: data?.id,
      recipientEmail: destinatario,
      status,
      success: true,
    };
  } catch (erro) {
    const erroTecnico = serializarErro(erro);
    if (process.env.NODE_ENV !== "production") {
      console.error("Erro inesperado no envio de e-mail.", erroTecnico);
    }

    await registrarLogSeguro({
      ...payload,
      errorMessage: erroTecnico,
      recipientEmail: destinatario ?? payload.to,
      status: "failed",
    });

    return {
      message: "Não foi possível enviar o e-mail de teste.",
      recipientEmail: destinatario ?? payload.to,
      status: "failed",
      success: false,
    };
  }
}

export async function sendTestEmail(payload: EmailPayload): Promise<EmailServiceResult> {
  return sendEmail(payload);
}

export async function sendGuestTemplateTestEmail(
  input: GuestTemplateTestInput,
): Promise<EmailServiceResult> {
  const email = renderEmailTemplate({
    body: input.body,
    buttonText: input.buttonText,
    buttonUrl: input.buttonUrl,
    isTest: true,
    subject: input.subject,
    title: input.title,
  });

  return sendTestEmail({
    audience: "guest",
    eventType: "test_template",
    html: email.html,
    ownerId: input.ownerId,
    payload: {
      mode: getEmailServiceConfigStatus().mode,
      test: true,
    },
    subject: email.subject,
    templateKey: input.templateKey,
    tenantId: input.tenantId,
    text: email.text,
    to: input.ownerEmail,
  });
}

export async function sendOwnerSystemNotificationEmail(
  payload: EmailPayload,
): Promise<EmailServiceResult> {
  // Preparado para notificações internas futuras. Não há gatilho automático nesta etapa.
  return sendEmail({ ...payload, audience: "owner" });
}

export function renderEmailTemplate(input: RenderEmailTemplateInput) {
  const corpo = input.body.trim();
  const titulo = input.title.trim();
  const botao = input.buttonText?.trim() ?? "";
  const linkBotao = normalizarUrlBotao(input.buttonUrl ?? "");
  const avisoTeste = input.isTest
    ? "Modo teste: este e-mail simula uma mensagem que seria enviada ao hóspede."
    : "";
  const rodape = input.isTest
    ? "Este é um e-mail de teste enviado para o proprietário."
    : "Você recebeu este e-mail porque existe uma comunicação relacionada à sua reserva.";

  const html = `
<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;background:#f6f9fc;color:#0f172a;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f9fc;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #dbe7f3;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="padding:24px 28px;background:#06111f;color:#ffffff;">
                <div style="font-size:20px;font-weight:700;letter-spacing:-0.02em;">
                  <span style="color:#22d3ee;">Hospe</span><span style="color:#ffffff;">dex</span>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                ${avisoTeste ? `<p style="margin:0 0 18px;border-radius:10px;background:#ecfeff;color:#0e7490;padding:10px 12px;font-size:13px;">${escaparHtml(avisoTeste)}</p>` : ""}
                <h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;color:#0f172a;">${escaparHtml(titulo)}</h1>
                <div style="white-space:pre-line;font-size:15px;line-height:1.7;color:#334155;">${escaparHtml(corpo)}</div>
                ${botao && linkBotao ? `<p style="margin:28px 0 0;"><a href="${escaparAtributo(linkBotao)}" style="display:inline-block;border-radius:10px;background:#0891b2;color:#ffffff;font-weight:700;text-decoration:none;padding:12px 18px;">${escaparHtml(botao)}</a></p>` : ""}
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;">
                ${escaparHtml(rodape)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim();

  const text = [
    "Hospedex",
    input.isTest ? avisoTeste : null,
    titulo,
    corpo,
    botao && linkBotao ? `${botao}: ${linkBotao}` : null,
    rodape,
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    html,
    subject: input.subject.trim(),
    text,
  };
}

export async function logEmailDelivery(
  entrada: Omit<EmailLogInput, "provider">,
): Promise<EmailServiceResult> {
  const sucesso = await registrarLogSeguro({
    ...entrada,
    provider: "resend",
  });

  return {
    message: sucesso ? "Log de e-mail registrado." : "Não foi possível registrar o log de e-mail.",
    status: sucesso ? entrada.status : "failed",
    success: sucesso,
  };
}

export async function getEmailDeliveryLogs(tenantId: UUID, limit = 30) {
  const supabase = await criarClienteSupabaseServer();
  const { data, error } = await supabase
    .from("email_delivery_logs")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<EmailDeliveryLogRow[]>();

  if (error) {
    console.error("Não foi possível carregar logs de e-mail.", error.message);
    return [];
  }

  return data ?? [];
}

type EmailConfig = {
  apiKey: string | null;
  from: string;
  mode: EmailMode;
  replyTo: string | null;
  testRecipient: string | null;
};

type EmailLogInput = EmailPayload & {
  errorMessage?: string | null | undefined;
  provider?: "resend" | undefined;
  providerMessageId?: string | null | undefined;
  recipientEmail: string;
  status: EmailDeliveryStatus;
};

function carregarConfiguracaoEmail(): EmailConfig {
  const mode = process.env.EMAIL_MODE === "production" ? "production" : "test";
  const from = limparEnv(process.env.EMAIL_FROM) || (mode === "test" ? REMETENTE_TESTE_PADRAO : "");

  return {
    apiKey: limparEnv(process.env.RESEND_API_KEY),
    from,
    mode,
    replyTo: limparEnv(process.env.EMAIL_REPLY_TO),
    testRecipient: limparEnv(process.env.EMAIL_TEST_RECIPIENT),
  };
}

export function shouldSendEmail(): boolean {
  const config = carregarConfiguracaoEmail();
  return Boolean(config.apiKey && config.from);
}

export function resolveRecipientEmail(destinatario: string, config = carregarConfiguracaoEmail()) {
  if (config.mode === "test") {
    return config.testRecipient ?? destinatario;
  }

  return destinatario;
}

async function registrarFalhaConfiguracao(
  payload: EmailPayload,
  recipientEmail: string | null,
  message: string,
): Promise<EmailServiceResult> {
  await registrarLogSeguro({
    ...payload,
    errorMessage: message,
    recipientEmail: recipientEmail ?? payload.to,
    status: "not_configured",
  });

  return {
    message,
    recipientEmail: recipientEmail ?? payload.to,
    status: "not_configured",
    success: false,
  };
}

async function registrarLogSeguro(input: EmailLogInput): Promise<boolean> {
  try {
    const supabase = await criarClienteSupabaseServer();
    const agora = new Date().toISOString();
    const { error } = await supabase.from("email_delivery_logs").insert({
      audience: input.audience,
      error_message: input.errorMessage ?? null,
      event_type: input.eventType,
      failed_at: ["failed", "not_configured"].includes(input.status) ? agora : null,
      owner_id: input.ownerId ?? null,
      payload: input.payload ?? {},
      provider: input.provider ?? "resend",
      provider_message_id: input.providerMessageId ?? null,
      recipient_email: input.recipientEmail,
      reference_id: input.referenceId ?? null,
      sent_at: ["sent", "test"].includes(input.status) ? agora : null,
      status: input.status,
      subject: input.subject,
      template_key: input.templateKey ?? null,
      tenant_id: input.tenantId,
    });

    if (error) {
      console.error("Não foi possível registrar log de e-mail.", error.message);
      return false;
    }

    return true;
  } catch (erro) {
    console.error("Erro inesperado ao registrar log de e-mail.", serializarErro(erro));
    return false;
  }
}

function mensagemAmigavelResend(erroTecnico: string, mode: EmailMode): string {
  if (mode === "test" && /verify|verified|domain|recipient|onboarding|testing|permission/i.test(erroTecnico)) {
    return MENSAGEM_RESTRICAO_TESTE;
  }

  return "Não foi possível enviar o e-mail de teste. Verifique seu e-mail e tente novamente.";
}

function normalizarUrlBotao(valor: string): string | null {
  const url = valor.trim();
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;

  const base = limparEnv(process.env.APP_PUBLIC_URL);
  if (url.startsWith("/") && base) {
    return `${base.replace(/\/$/, "")}${url}`;
  }

  return url;
}

function limparEnv(valor: string | undefined): string | null {
  const limpo = valor?.trim();
  return limpo ? limpo : null;
}

function emailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function serializarErro(erro: unknown): string {
  if (erro instanceof Error) return erro.message;

  try {
    return JSON.stringify(erro);
  } catch {
    return "Erro desconhecido.";
  }
}

function escaparHtml(texto: string): string {
  return texto
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escaparAtributo(texto: string): string {
  return escaparHtml(texto).replaceAll("`", "&#96;");
}
