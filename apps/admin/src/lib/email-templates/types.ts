import type { MessageTemplateAudience, MessageTemplateRow } from "@hospedex/types";

/**
 * Contratos do módulo de Templates de e-mail.
 *
 * A UI trabalha com um template mesclado: padrão global do Hospedex mais a
 * personalização do tenant, quando existir.
 */

export type EmailTemplate = {
  audience: MessageTemplateAudience;
  body: string;
  buttonText: string | null;
  buttonUrl: string | null;
  channel: "email";
  defaultBody: string;
  defaultButtonText: string | null;
  defaultButtonUrl: string | null;
  defaultSubject: string;
  defaultTitle: string;
  description: string;
  id: string | null;
  isActive: boolean;
  isCustomized: boolean;
  isDefault: boolean;
  key: string;
  lastValidationError: string | null;
  name: string;
  row: MessageTemplateRow | null;
  subject: string;
  title: string;
  variablesAllowed: string[];
};

export type DadosTemplatesEmail = {
  emailTeste: string;
  erroCarregamento: string | null;
  podeGerenciar: boolean;
  resumo: {
    alterados: number;
    ativos: number;
    canalPrincipal: string;
    errosVariavel: number;
    total: number;
  };
  templates: EmailTemplate[];
  tenantNome: string;
};

export type SearchParamsTemplatesEmail = {
  erro?: string | undefined;
  sucesso?: string | undefined;
};

export type DadosCentralEmail = {
  erroCarregamento: string | null;
  podeGerenciar: boolean;
  resumo: {
    enviados: number;
    falhas: number;
    recebidos: number;
    templatesAtivos: number;
  };
  tenantNome: string;
};
