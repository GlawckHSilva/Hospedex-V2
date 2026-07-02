import type { MessageTemplateRow } from "@hospedex/types";

import type { ContextoAutenticacao } from "../auth/types";
import { criarClienteSupabaseServer } from "../supabase/server";
import {
  EMAIL_TEMPLATE_DEFAULTS,
  EMAIL_TEMPLATE_VARIABLES,
  montarLinhaPadraoTemplate,
  obterTemplatePadrao,
} from "./defaults";
import { podeGerenciarEmail } from "./permissions";
import type { DadosCentralEmail, DadosTemplatesEmail, EmailTemplate } from "./types";

/**
 * Carrega templates do tenant autenticado.
 *
 * Templates globais sao a base. Quando o tenant customiza um modelo, a linha
 * tenant-scoped substitui apenas aquele template, mantendo isolamento por RLS.
 */

export async function carregarDadosTemplatesEmail(
  contexto: ContextoAutenticacao,
): Promise<DadosTemplatesEmail> {
  if (!contexto.tenant) {
    return montarDadosTemplates([], contexto, "Tenant nao encontrado.");
  }

  const supabase = await criarClienteSupabaseServer();
  const { data, error } = await supabase
    .from("message_templates")
    .select("*")
    .eq("channel", "email")
    .or(`tenant_id.is.null,tenant_id.eq.${contexto.tenant.id}`)
    .returns<MessageTemplateRow[]>();

  if (error) {
    console.error("Nao foi possivel carregar templates de e-mail.", error.message);
  }

  return montarDadosTemplates(
    data ?? [],
    contexto,
    error ? "Nao foi possivel carregar os templates de e-mail." : null,
  );
}

export async function carregarDadosCentralEmail(
  contexto: ContextoAutenticacao,
): Promise<DadosCentralEmail> {
  const dadosTemplates = await carregarDadosTemplatesEmail(contexto);

  return {
    erroCarregamento: dadosTemplates.erroCarregamento,
    podeGerenciar: dadosTemplates.podeGerenciar,
    resumo: {
      enviados: 0,
      falhas: 0,
      recebidos: 0,
      templatesAtivos: dadosTemplates.resumo.ativos,
    },
    tenantNome: contexto.tenant?.name ?? "Tenant nao encontrado",
  };
}

function montarDadosTemplates(
  registros: MessageTemplateRow[],
  contexto: ContextoAutenticacao,
  erroCarregamento: string | null,
): DadosTemplatesEmail {
  const globais = new Map(
    registros
      .filter((registro) => !registro.tenant_id)
      .map((registro) => [registro.template_key, registro]),
  );
  const customizados = new Map(
    registros
      .filter((registro) => registro.tenant_id === contexto.tenant?.id)
      .map((registro) => [registro.template_key, registro]),
  );

  const templates = EMAIL_TEMPLATE_DEFAULTS.map((templatePadrao) => {
    const global =
      globais.get(templatePadrao.key) ??
      ({
        id: `default-${templatePadrao.key}`,
        created_at: "",
        updated_at: "",
        ...montarLinhaPadraoTemplate(templatePadrao),
      } as MessageTemplateRow);
    const customizado = customizados.get(templatePadrao.key);

    return normalizarTemplate(customizado ?? global, customizado ? global : null);
  });

  return {
    erroCarregamento,
    podeGerenciar: podeGerenciarEmail(contexto),
    resumo: {
      alterados: templates.filter((template) => template.isCustomized).length,
      ativos: templates.filter((template) => template.isActive).length,
      canalPrincipal: "E-mail",
      errosVariavel: templates.filter((template) => template.lastValidationError).length,
      total: templates.length,
    },
    templates,
    tenantNome: contexto.tenant?.name ?? "Tenant nao encontrado",
  };
}

function normalizarTemplate(
  row: MessageTemplateRow,
  globalRow: MessageTemplateRow | null,
): EmailTemplate {
  const templatePadrao = obterTemplatePadrao(row.template_key);
  const defaultSubject =
    globalRow?.default_subject ?? row.default_subject ?? templatePadrao?.subject ?? row.subject;
  const defaultTitle =
    globalRow?.default_title ?? row.default_title ?? templatePadrao?.title ?? row.title;
  const defaultBody =
    globalRow?.default_body ?? row.default_body ?? templatePadrao?.body ?? row.body;

  return {
    body: row.body,
    buttonText: row.button_text,
    buttonUrl: row.button_url,
    channel: "email",
    defaultBody,
    defaultButtonText:
      globalRow?.default_button_text ??
      row.default_button_text ??
      templatePadrao?.buttonText ??
      null,
    defaultButtonUrl:
      globalRow?.default_button_url ??
      row.default_button_url ??
      templatePadrao?.buttonUrl ??
      null,
    defaultSubject,
    defaultTitle,
    description: row.description,
    id: row.id,
    isActive: row.is_active,
    isCustomized: row.is_customized,
    isDefault: row.is_default,
    key: row.template_key,
    lastValidationError: row.last_validation_error,
    name: row.name,
    row,
    subject: row.subject,
    title: row.title,
    variablesAllowed: row.variables_allowed.length
      ? row.variables_allowed
      : [...EMAIL_TEMPLATE_VARIABLES],
  };
}
