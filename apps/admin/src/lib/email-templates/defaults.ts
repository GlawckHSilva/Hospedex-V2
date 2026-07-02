import type { MessageTemplateAudience, MessageTemplateRow } from "@hospedex/types";

/**
 * Defaults dos templates de e-mail editáveis pelo proprietário.
 *
 * Esta lista representa apenas mensagens enviadas aos hóspedes. Notificações
 * internas para o proprietário são padrões do Hospedex e não aparecem nesta UI.
 */

export const EMAIL_TEMPLATE_AUDIENCE_GUEST: MessageTemplateAudience = "guest";

export const EMAIL_TEMPLATE_VARIABLES = [
  "nome_hospede",
  "nome_proprietario",
  "nome_casa",
  "codigo_reserva",
  "periodo_reserva",
  "data_checkin",
  "data_checkout",
  "horario_checkin",
  "horario_checkout",
  "valor_total",
  "valor_pendente",
  "status_reserva",
  "status_pagamento",
  "telefone_proprietario",
  "email_proprietario",
  "endereco_casa",
  "regras_casa",
  "instrucoes_checkin",
  "instrucoes_checkout",
  "link_reserva",
  "link_pagamento",
  "link_portal_hospede",
  "nome_tenant",
  "data_atual",
] as const;

export type EmailTemplateVariable = (typeof EMAIL_TEMPLATE_VARIABLES)[number];

export type EmailTemplateDefault = {
  audience: MessageTemplateAudience;
  body: string;
  buttonText: string | null;
  buttonUrl: string | null;
  description: string;
  key: string;
  name: string;
  subject: string;
  title: string;
};

export const DADOS_PREVIEW_EMAIL: Record<EmailTemplateVariable, string> = {
  codigo_reserva: "RES-20260701-43EPU",
  data_atual: "02/07/2026",
  data_checkin: "10/07/2026",
  data_checkout: "15/07/2026",
  email_proprietario: "proprietario@exemplo.com",
  endereco_casa: "Rua das Flores, 123",
  horario_checkin: "14:00",
  horario_checkout: "11:00",
  instrucoes_checkin: "A chave estará disponível no local combinado.",
  instrucoes_checkout: "Deixe a chave sobre a mesa.",
  link_pagamento: "/pagamento/RES-20260701-43EPU",
  link_portal_hospede: "/hospede",
  link_reserva: "/hospede/reservas/RES-20260701-43EPU",
  nome_casa: "Casa do Lago",
  nome_hospede: "João Silva",
  nome_proprietario: "Glawck",
  nome_tenant: "Hospedex",
  periodo_reserva: "10/07/2026 até 15/07/2026",
  regras_casa: "Não fumar. Respeitar horário de silêncio.",
  status_pagamento: "Pendente",
  status_reserva: "Confirmada",
  telefone_proprietario: "(43) 99999-0000",
  valor_pendente: "R$ 500,00",
  valor_total: "R$ 1.500,00",
};

export const EMAIL_TEMPLATE_DEFAULTS: EmailTemplateDefault[] = [
  {
    audience: EMAIL_TEMPLATE_AUDIENCE_GUEST,
    body:
      "Olá, {{nome_hospede}}.\n\nSua reserva em {{nome_casa}} foi confirmada.\n\nReserva: {{codigo_reserva}}\nPeríodo: {{periodo_reserva}}\nCheck-in: {{data_checkin}} às {{horario_checkin}}\nCheck-out: {{data_checkout}} às {{horario_checkout}}\nValor total: {{valor_total}}\n\nEm caso de dúvida, fale com {{nome_proprietario}} pelo telefone {{telefone_proprietario}}.",
    buttonText: "Ver minha reserva",
    buttonUrl: "{{link_reserva}}",
    description: "Enviado ao hóspede quando a reserva é confirmada.",
    key: "guest_reservation_confirmed",
    name: "Confirmação de reserva",
    subject: "Sua reserva em {{nome_casa}} foi confirmada",
    title: "Reserva confirmada",
  },
  {
    audience: EMAIL_TEMPLATE_AUDIENCE_GUEST,
    body:
      "Olá, {{nome_hospede}}.\n\nRecebemos sua solicitação para {{nome_casa}}.\nA reserva {{codigo_reserva}} está aguardando pagamento.\n\nValor pendente: {{valor_pendente}}\nStatus: {{status_pagamento}}.",
    buttonText: "Ver pagamento",
    buttonUrl: "{{link_pagamento}}",
    description: "Enviado ao hóspede quando a reserva aguarda pagamento.",
    key: "guest_reservation_payment_pending",
    name: "Reserva aguardando pagamento",
    subject: "Sua reserva está aguardando pagamento",
    title: "Pagamento pendente",
  },
  {
    audience: EMAIL_TEMPLATE_AUDIENCE_GUEST,
    body:
      "Olá, {{nome_hospede}}.\n\nExiste um pagamento pendente para a reserva {{codigo_reserva}}.\nCasa: {{nome_casa}}\nValor pendente: {{valor_pendente}}\n\nFinalize o pagamento para manter sua reserva ativa.",
    buttonText: "Pagar agora",
    buttonUrl: "{{link_pagamento}}",
    description: "Mensagem de cobrança amigável para pagamento pendente.",
    key: "guest_payment_charge",
    name: "Cobrança de pagamento pendente",
    subject: "Pagamento pendente da sua reserva",
    title: "Finalize seu pagamento",
  },
  {
    audience: EMAIL_TEMPLATE_AUDIENCE_GUEST,
    body:
      "Olá, {{nome_hospede}}.\n\nO pagamento da reserva {{codigo_reserva}} foi recebido.\nCasa: {{nome_casa}}\nValor total: {{valor_total}}\n\nSua hospedagem está confirmada.",
    buttonText: "Ver detalhes",
    buttonUrl: "{{link_reserva}}",
    description: "Enviado ao hóspede após registro de pagamento.",
    key: "guest_payment_received",
    name: "Pagamento recebido",
    subject: "Pagamento recebido no Hospedex",
    title: "Pagamento confirmado",
  },
  {
    audience: EMAIL_TEMPLATE_AUDIENCE_GUEST,
    body:
      "Olá, {{nome_hospede}}.\n\nSeu check-in em {{nome_casa}} está previsto para {{data_checkin}} às {{horario_checkin}}.\nEndereço: {{endereco_casa}}\n\n{{instrucoes_checkin}}",
    buttonText: "Abrir instruções",
    buttonUrl: "{{link_reserva}}",
    description: "Enviado ao hóspede com instruções de chegada.",
    key: "guest_checkin_instructions",
    name: "Instruções de check-in",
    subject: "Instruções de check-in em {{nome_casa}}",
    title: "Seu check-in está chegando",
  },
  {
    audience: EMAIL_TEMPLATE_AUDIENCE_GUEST,
    body:
      "Olá, {{nome_hospede}}.\n\nSeu check-out em {{nome_casa}} está previsto para {{data_checkout}} às {{horario_checkout}}.\n\n{{instrucoes_checkout}}\n\nObrigado por se hospedar conosco.",
    buttonText: "Ver reserva",
    buttonUrl: "{{link_reserva}}",
    description: "Enviado ao hóspede com instruções de saída.",
    key: "guest_checkout_instructions",
    name: "Instruções de checkout",
    subject: "Instruções de checkout em {{nome_casa}}",
    title: "Orientações de checkout",
  },
  {
    audience: EMAIL_TEMPLATE_AUDIENCE_GUEST,
    body:
      "Olá, {{nome_hospede}}.\n\nA reserva {{codigo_reserva}} em {{nome_casa}} foi cancelada.\nPeríodo: {{periodo_reserva}}\nStatus: {{status_reserva}}\n\nSe precisar de ajuda, fale com {{nome_proprietario}}.",
    buttonText: "Ver reserva",
    buttonUrl: "{{link_reserva}}",
    description: "Enviado ao hóspede quando a reserva é cancelada.",
    key: "guest_reservation_cancelled",
    name: "Reserva cancelada",
    subject: "Sua reserva foi cancelada",
    title: "Reserva cancelada",
  },
  {
    audience: EMAIL_TEMPLATE_AUDIENCE_GUEST,
    body:
      "Olá, {{nome_hospede}}.\n\nSua chegada em {{nome_casa}} está próxima.\nCheck-in: {{data_checkin}} às {{horario_checkin}}\nEndereço: {{endereco_casa}}\n\nTenha uma ótima hospedagem.",
    buttonText: "Ver detalhes",
    buttonUrl: "{{link_reserva}}",
    description: "Lembrete enviado antes da chegada do hóspede.",
    key: "guest_arrival_reminder",
    name: "Lembrete de chegada",
    subject: "Sua chegada em {{nome_casa}} está próxima",
    title: "Lembrete de chegada",
  },
  {
    audience: EMAIL_TEMPLATE_AUDIENCE_GUEST,
    body:
      "Olá, {{nome_hospede}}.\n\nObrigado por se hospedar em {{nome_casa}}.\nEsperamos que sua experiência tenha sido excelente.\n\nSerá um prazer receber você novamente.",
    buttonText: "Acessar reserva",
    buttonUrl: "{{link_reserva}}",
    description: "Mensagem de agradecimento após a hospedagem.",
    key: "guest_post_stay_thanks",
    name: "Agradecimento pós-hospedagem",
    subject: "Obrigado pela sua hospedagem",
    title: "Obrigado por escolher {{nome_tenant}}",
  },
  {
    audience: EMAIL_TEMPLATE_AUDIENCE_GUEST,
    body:
      "Olá, {{nome_hospede}}.\n\nEstas são as regras principais de {{nome_casa}}:\n\n{{regras_casa}}\n\nContamos com sua colaboração para uma ótima hospedagem.",
    buttonText: "Ver regras",
    buttonUrl: "{{link_reserva}}",
    description: "Enviado ao hóspede com regras da casa.",
    key: "guest_house_rules",
    name: "Regras da casa",
    subject: "Regras da hospedagem em {{nome_casa}}",
    title: "Regras da casa",
  },
  {
    audience: EMAIL_TEMPLATE_AUDIENCE_GUEST,
    body:
      "Olá, {{nome_hospede}}.\n\nInformações importantes para sua hospedagem em {{nome_casa}}:\n\nEndereço: {{endereco_casa}}\nCheck-in: {{horario_checkin}}\nCheck-out: {{horario_checkout}}\n\n{{instrucoes_checkin}}",
    buttonText: "Abrir portal do hóspede",
    buttonUrl: "{{link_portal_hospede}}",
    description: "Orientações gerais enviadas ao hóspede.",
    key: "guest_stay_instructions",
    name: "Instruções da hospedagem",
    subject: "Orientações para sua hospedagem",
    title: "Informações da hospedagem",
  },
  {
    audience: EMAIL_TEMPLATE_AUDIENCE_GUEST,
    body:
      "Olá, {{nome_hospede}}.\n\nSeguem orientações importantes da reserva {{codigo_reserva}}:\n\nCasa: {{nome_casa}}\nPeríodo: {{periodo_reserva}}\nValor total: {{valor_total}}\n\nAo prosseguir, você confirma ciência das regras e orientações da hospedagem.",
    buttonText: "Ver orientações",
    buttonUrl: "{{link_reserva}}",
    description: "Modelo para contrato simples ou orientações importantes.",
    key: "guest_contract_guidelines",
    name: "Contrato ou orientações importantes",
    subject: "Orientações importantes da sua reserva",
    title: "Contrato e orientações",
  },
];

const DEFAULTS_BY_KEY = new Map(
  EMAIL_TEMPLATE_DEFAULTS.map((template) => [template.key, template]),
);

export function obterTemplatePadrao(key: string): EmailTemplateDefault | null {
  return DEFAULTS_BY_KEY.get(key) ?? null;
}

export function montarLinhaPadraoTemplate(
  template: EmailTemplateDefault,
): Omit<MessageTemplateRow, "id" | "created_at" | "updated_at"> {
  return {
    audience: template.audience,
    body: template.body,
    button_text: template.buttonText,
    button_url: template.buttonUrl,
    channel: "email",
    default_body: template.body,
    default_button_text: template.buttonText,
    default_button_url: template.buttonUrl,
    default_subject: template.subject,
    default_title: template.title,
    description: template.description,
    is_active: true,
    is_customized: false,
    is_default: true,
    last_validation_error: null,
    last_validation_status: "valid",
    name: template.name,
    subject: template.subject,
    template_key: template.key,
    tenant_id: null,
    title: template.title,
    variables_allowed: [...EMAIL_TEMPLATE_VARIABLES],
  };
}
