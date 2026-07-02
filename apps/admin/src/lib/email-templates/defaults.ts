import type { MessageTemplateRow } from "@hospedex/types";

/**
 * Defaults dos templates transacionais de e-mail.
 *
 * Esta lista e usada pela UI, pela validacao e pela migration. Manter um
 * catalogo central evita textos divergentes entre preview, restore e envio
 * futuro pelo backend.
 */

export const EMAIL_TEMPLATE_VARIABLES = [
  "nome_proprietario",
  "nome_hospede",
  "codigo_reserva",
  "nome_casa",
  "periodo_reserva",
  "data_checkin",
  "data_checkout",
  "valor_total",
  "valor_pendente",
  "status_reserva",
  "status_pagamento",
  "link_painel",
  "link_reserva",
  "telefone_hospede",
  "nome_tenant",
  "data_atual",
] as const;

export type EmailTemplateVariable = (typeof EMAIL_TEMPLATE_VARIABLES)[number];

export type EmailTemplateDefault = {
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
  link_painel: "/",
  link_reserva: "/reservas/RES-20260701-43EPU",
  nome_casa: "Casa do Lago",
  nome_hospede: "Joao Silva",
  nome_proprietario: "Glawck",
  nome_tenant: "Hospedex",
  periodo_reserva: "10/07/2026 ate 15/07/2026",
  status_pagamento: "Pendente",
  status_reserva: "Aguardando pagamento",
  telefone_hospede: "(43) 99999-0000",
  valor_pendente: "R$ 500,00",
  valor_total: "R$ 1.500,00",
};

export const EMAIL_TEMPLATE_DEFAULTS: EmailTemplateDefault[] = [
  {
    body:
      "Ola, {{nome_proprietario}}.\n\nVoce recebeu uma nova reserva.\n\nReserva: {{codigo_reserva}}\nHospede: {{nome_hospede}}\nCasa: {{nome_casa}}\nPeriodo: {{periodo_reserva}}\nValor total: {{valor_total}}\n\nAcesse o painel para analisar os detalhes.",
    buttonText: "Ver reserva",
    buttonUrl: "{{link_reserva}}",
    description: "Enviado quando uma nova reserva entra no sistema.",
    key: "nova_reserva_recebida",
    name: "Nova reserva recebida",
    subject: "Nova reserva recebida no Hospedex",
    title: "Voce recebeu uma nova reserva",
  },
  {
    body:
      "Ola, {{nome_proprietario}}.\n\nA reserva {{codigo_reserva}} esta aguardando pagamento.\nHospede: {{nome_hospede}}\nValor pendente: {{valor_pendente}}\nStatus: {{status_pagamento}}.",
    buttonText: "Ver reserva",
    buttonUrl: "{{link_reserva}}",
    description: "Enviado quando a reserva aguarda pagamento.",
    key: "reserva_aguardando_pagamento",
    name: "Reserva aguardando pagamento",
    subject: "Reserva aguardando pagamento",
    title: "Pagamento pendente da reserva",
  },
  {
    body:
      "O pagamento da reserva {{codigo_reserva}} foi registrado.\nHospede: {{nome_hospede}}\nCasa: {{nome_casa}}\nValor total: {{valor_total}}.",
    buttonText: "Abrir painel",
    buttonUrl: "{{link_painel}}",
    description: "Enviado apos a confirmacao de um pagamento.",
    key: "pagamento_recebido",
    name: "Pagamento recebido",
    subject: "Pagamento recebido no Hospedex",
    title: "Pagamento confirmado",
  },
  {
    body:
      "A reserva {{codigo_reserva}} foi cancelada.\nHospede: {{nome_hospede}}\nCasa: {{nome_casa}}\nPeriodo: {{periodo_reserva}}.",
    buttonText: "Ver reserva",
    buttonUrl: "{{link_reserva}}",
    description: "Enviado quando uma reserva e cancelada.",
    key: "reserva_cancelada",
    name: "Reserva cancelada",
    subject: "Reserva cancelada",
    title: "Reserva cancelada",
  },
  {
    body:
      "A reserva {{codigo_reserva}} tem check-in previsto para {{data_checkin}}.\nHospede: {{nome_hospede}}\nTelefone: {{telefone_hospede}}\nCasa: {{nome_casa}}.",
    buttonText: "Ver detalhes",
    buttonUrl: "{{link_reserva}}",
    description: "Enviado antes da data de check-in do hospede.",
    key: "checkin_previsto",
    name: "Check-in previsto",
    subject: "Check-in previsto para {{data_checkin}}",
    title: "Check-in previsto",
  },
  {
    body:
      "A reserva {{codigo_reserva}} tem check-out previsto para {{data_checkout}}.\nHospede: {{nome_hospede}}\nCasa: {{nome_casa}}.",
    buttonText: "Ver detalhes",
    buttonUrl: "{{link_reserva}}",
    description: "Enviado antes da data de check-out do hospede.",
    key: "checkout_previsto",
    name: "Check-out previsto",
    subject: "Check-out previsto para {{data_checkout}}",
    title: "Check-out previsto",
  },
  {
    body:
      "Existe uma limpeza pendente vinculada a {{nome_casa}}.\nReserva: {{codigo_reserva}}\nData atual: {{data_atual}}.",
    buttonText: "Abrir painel",
    buttonUrl: "{{link_painel}}",
    description: "Enviado quando uma limpeza precisa ser realizada.",
    key: "limpeza_pendente",
    name: "Limpeza pendente",
    subject: "Limpeza pendente",
    title: "Limpeza pendente",
  },
  {
    body:
      "O tenant {{nome_tenant}} possui uma pendencia operacional.\nReserva: {{codigo_reserva}}\nStatus: {{status_reserva}}.",
    buttonText: "Ver pendencias",
    buttonUrl: "{{link_painel}}",
    description: "Enviado quando existe uma pendencia no gerenciamento.",
    key: "pendencia_operacional",
    name: "Pendencia operacional",
    subject: "Pendencia operacional no Hospedex",
    title: "Pendencia operacional",
  },
  {
    body:
      "Ola, {{nome_proprietario}}.\n\nA licenca do tenant {{nome_tenant}} precisa de atencao.\nAcesse o painel para verificar os detalhes.",
    buttonText: "Abrir painel",
    buttonUrl: "{{link_painel}}",
    description: "Enviado quando a licenca esta perto do vencimento.",
    key: "licenca_vencendo",
    name: "Licenca vencendo",
    subject: "Sua licenca Hospedex esta vencendo",
    title: "Licenca vencendo",
  },
  {
    body:
      "Ola, {{nome_proprietario}}.\n\nEste e um e-mail de teste do Hospedex para {{nome_tenant}}.",
    buttonText: "Abrir painel",
    buttonUrl: "{{link_painel}}",
    description: "Modelo usado para validar a futura configuracao de envio.",
    key: "email_teste",
    name: "E-mail de teste",
    subject: "Teste de e-mail Hospedex",
    title: "E-mail de teste",
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
