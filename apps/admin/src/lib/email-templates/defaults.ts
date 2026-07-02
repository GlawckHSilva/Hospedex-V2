import type { MessageTemplateRow } from "@hospedex/types";

/**
 * Defaults dos templates transacionais de e-mail.
 *
 * Esta lista é usada pela UI, pela validação e pela migration. Manter um
 * catálogo central evita textos divergentes entre preview, restore e envio
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
  nome_hospede: "João Silva",
  nome_proprietario: "Glawck",
  nome_tenant: "Hospedex",
  periodo_reserva: "10/07/2026 até 15/07/2026",
  status_pagamento: "Pendente",
  status_reserva: "Aguardando pagamento",
  telefone_hospede: "(43) 99999-0000",
  valor_pendente: "R$ 500,00",
  valor_total: "R$ 1.500,00",
};

export const EMAIL_TEMPLATE_DEFAULTS: EmailTemplateDefault[] = [
  {
    body:
      "Olá, {{nome_proprietario}}.\n\nVocê recebeu uma nova reserva.\n\nReserva: {{codigo_reserva}}\nHóspede: {{nome_hospede}}\nCasa: {{nome_casa}}\nPeríodo: {{periodo_reserva}}\nValor total: {{valor_total}}\n\nAcesse o painel para analisar os detalhes.",
    buttonText: "Ver reserva",
    buttonUrl: "{{link_reserva}}",
    description: "Enviado quando uma nova reserva entra no sistema.",
    key: "nova_reserva_recebida",
    name: "Nova reserva recebida",
    subject: "Nova reserva recebida no Hospedex",
    title: "Você recebeu uma nova reserva",
  },
  {
    body:
      "Olá, {{nome_proprietario}}.\n\nA reserva {{codigo_reserva}} está aguardando pagamento.\nHóspede: {{nome_hospede}}\nValor pendente: {{valor_pendente}}\nStatus: {{status_pagamento}}.",
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
      "O pagamento da reserva {{codigo_reserva}} foi registrado.\nHóspede: {{nome_hospede}}\nCasa: {{nome_casa}}\nValor total: {{valor_total}}.",
    buttonText: "Abrir painel",
    buttonUrl: "{{link_painel}}",
    description: "Enviado após a confirmação de um pagamento.",
    key: "pagamento_recebido",
    name: "Pagamento recebido",
    subject: "Pagamento recebido no Hospedex",
    title: "Pagamento confirmado",
  },
  {
    body:
      "A reserva {{codigo_reserva}} foi cancelada.\nHóspede: {{nome_hospede}}\nCasa: {{nome_casa}}\nPeríodo: {{periodo_reserva}}.",
    buttonText: "Ver reserva",
    buttonUrl: "{{link_reserva}}",
    description: "Enviado quando uma reserva é cancelada.",
    key: "reserva_cancelada",
    name: "Reserva cancelada",
    subject: "Reserva cancelada",
    title: "Reserva cancelada",
  },
  {
    body:
      "A reserva {{codigo_reserva}} tem check-in previsto para {{data_checkin}}.\nHóspede: {{nome_hospede}}\nTelefone: {{telefone_hospede}}\nCasa: {{nome_casa}}.",
    buttonText: "Ver detalhes",
    buttonUrl: "{{link_reserva}}",
    description: "Enviado antes da data de check-in do hóspede.",
    key: "checkin_previsto",
    name: "Check-in previsto",
    subject: "Check-in previsto para {{data_checkin}}",
    title: "Check-in previsto",
  },
  {
    body:
      "A reserva {{codigo_reserva}} tem check-out previsto para {{data_checkout}}.\nHóspede: {{nome_hospede}}\nCasa: {{nome_casa}}.",
    buttonText: "Ver detalhes",
    buttonUrl: "{{link_reserva}}",
    description: "Enviado antes da data de check-out do hóspede.",
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
      "A conta {{nome_tenant}} possui uma pendência operacional.\nReserva: {{codigo_reserva}}\nStatus: {{status_reserva}}.",
    buttonText: "Ver pendências",
    buttonUrl: "{{link_painel}}",
    description: "Enviado quando existe uma pendência no gerenciamento.",
    key: "pendencia_operacional",
    name: "Pendência operacional",
    subject: "Pendência operacional no Hospedex",
    title: "Pendência operacional",
  },
  {
    body:
      "Olá, {{nome_proprietario}}.\n\nA licença da conta {{nome_tenant}} precisa de atenção.\nAcesse o painel para verificar os detalhes.",
    buttonText: "Abrir painel",
    buttonUrl: "{{link_painel}}",
    description: "Enviado quando a licença está perto do vencimento.",
    key: "licenca_vencendo",
    name: "Licença vencendo",
    subject: "Sua licença Hospedex está vencendo",
    title: "Licença vencendo",
  },
  {
    body:
      "Olá, {{nome_proprietario}}.\n\nEste é um e-mail de teste do Hospedex para {{nome_tenant}}.",
    buttonText: "Abrir painel",
    buttonUrl: "{{link_painel}}",
    description: "Modelo usado para validar a futura configuração de envio.",
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
