/**
 * Servico base de e-mail da V2.
 *
 * Nesta etapa o Hospedex ainda nao possui provedor ativo. As funcoes mantem um
 * contrato seguro para a proxima integracao com Resend ou SMTP, sem enviar nada
 * de verdade e sem expor chaves no frontend.
 */

export type EmailServiceStatus = "not_configured" | "sent" | "failed" | "skipped";

export type EmailServiceResult = {
  message: string;
  status: EmailServiceStatus;
  success: boolean;
};

export type EmailPayload = {
  html?: string;
  subject: string;
  templateKey?: string;
  text: string;
  to: string;
};

export async function sendEmail(): Promise<EmailServiceResult> {
  return servicoNaoConfigurado();
}

export async function sendOwnerEmailNotification(): Promise<EmailServiceResult> {
  return servicoNaoConfigurado();
}

export async function sendTestEmail(): Promise<EmailServiceResult> {
  return servicoNaoConfigurado();
}

export async function logEmailDelivery(): Promise<EmailServiceResult> {
  return servicoNaoConfigurado();
}

export async function getEmailDeliveryLogs() {
  return [];
}

function servicoNaoConfigurado(): EmailServiceResult {
  return {
    message: "Provedor de e-mail ainda nao configurado.",
    status: "not_configured",
    success: false,
  };
}
