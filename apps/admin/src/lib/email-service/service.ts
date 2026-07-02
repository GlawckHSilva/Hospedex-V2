/**
 * Serviço base de e-mail da V2.
 *
 * Nesta etapa o Hospedex ainda não possui serviço ativo. As funções mantêm um
 * contrato seguro para a próxima integração com envio real, sem enviar nada
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
    message: "Serviço de e-mail ainda não configurado.",
    status: "not_configured",
    success: false,
  };
}
