"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { criarClienteSupabaseServer } from "../supabase/server";
import {
  EMAIL_TEMPLATE_VARIABLES,
  obterTemplatePadrao,
} from "./defaults";
import { exigirAcessoEmail, podeGerenciarEmail } from "./permissions";
import { validarTemplateEmail } from "./validation";

/**
 * Mutações dos templates de e-mail.
 *
 * O tenant e o usuário autenticado são carregados no servidor para preservar
 * isolamento multi-tenant. A interface nunca define qual tenant será alterado.
 */

const CAMINHO_TEMPLATES_EMAIL = "/templates-email";

class ErroRegraTemplateEmail extends Error {}

export async function salvarTemplateEmailAction(formData: FormData) {
  const escopo = await carregarEscopoTemplates();

  try {
    const templateKey = textoObrigatorio(formData, "templateKey", "modelo");
    const padrao = obterTemplatePadrao(templateKey);
    if (!padrao) throw new ErroRegraTemplateEmail("Modelo de e-mail inválido.");

    const entrada = {
      body: textoObrigatorio(formData, "body", "corpo da mensagem"),
      buttonText: textoOpcional(formData, "buttonText", 80),
      buttonUrl: textoOpcional(formData, "buttonUrl", 300),
      description: textoOpcional(formData, "description", 180) ?? padrao.description,
      isActive: String(formData.get("isActive") ?? "") === "true",
      name: textoObrigatorio(formData, "name", "nome do modelo"),
      subject: textoObrigatorio(formData, "subject", "assunto"),
      title: textoObrigatorio(formData, "title", "título"),
    };
    const validacao = validarTemplateEmail({
      body: entrada.body,
      buttonText: entrada.buttonText ?? "",
      buttonUrl: entrada.buttonUrl ?? "",
      subject: entrada.subject,
      title: entrada.title,
    });

    if (!validacao.valido) {
      throw new ErroRegraTemplateEmail(validacao.erros[0] ?? "Template inválido.");
    }

    const supabase = await criarClienteSupabaseServer();
    const { error } = await supabase.from("message_templates").upsert(
      {
        body: entrada.body,
        button_text: entrada.buttonText,
        button_url: entrada.buttonUrl,
        channel: "email",
        default_body: padrao.body,
        default_button_text: padrao.buttonText,
        default_button_url: padrao.buttonUrl,
        default_subject: padrao.subject,
        default_title: padrao.title,
        description: entrada.description,
        is_active: entrada.isActive,
        is_customized: true,
        is_default: false,
        last_validation_error: null,
        last_validation_status: "valid",
        name: entrada.name,
        subject: entrada.subject,
        template_key: templateKey,
        tenant_id: escopo.tenantId,
        title: entrada.title,
        variables_allowed: [...EMAIL_TEMPLATE_VARIABLES],
      },
      { onConflict: "tenant_id,template_key,channel" },
    );

    if (error) throw new Error(error.message);
    revalidarTemplates();
  } catch (erro) {
    redirecionarComErro(erro, "Não foi possível salvar o modelo.");
  }

  redirect(`${CAMINHO_TEMPLATES_EMAIL}?sucesso=modelo-salvo`);
}

export async function restaurarTemplateEmailPadraoAction(formData: FormData) {
  const escopo = await carregarEscopoTemplates();

  try {
    const templateKey = textoObrigatorio(formData, "templateKey", "modelo");
    if (!obterTemplatePadrao(templateKey)) {
      throw new ErroRegraTemplateEmail("Modelo de e-mail inválido.");
    }

    const supabase = await criarClienteSupabaseServer();
    const { error } = await supabase
      .from("message_templates")
      .delete()
      .eq("tenant_id", escopo.tenantId)
      .eq("channel", "email")
      .eq("template_key", templateKey);

    if (error) throw new Error(error.message);
    revalidarTemplates();
  } catch (erro) {
    redirecionarComErro(erro, "Não foi possível restaurar o modelo.");
  }

  redirect(`${CAMINHO_TEMPLATES_EMAIL}?sucesso=modelo-restaurado`);
}

export async function restaurarTodosTemplatesEmailPadraoAction() {
  const escopo = await carregarEscopoTemplates();

  try {
    const supabase = await criarClienteSupabaseServer();
    const { error } = await supabase
      .from("message_templates")
      .delete()
      .eq("tenant_id", escopo.tenantId)
      .eq("channel", "email");

    if (error) throw new Error(error.message);
    revalidarTemplates();
  } catch (erro) {
    redirecionarComErro(erro, "Não foi possível restaurar os padrões.");
  }

  redirect(`${CAMINHO_TEMPLATES_EMAIL}?sucesso=padroes-restaurados`);
}

async function carregarEscopoTemplates() {
  const contexto = await exigirAcessoEmail();

  if (!contexto.tenant || !podeGerenciarEmail(contexto)) {
    redirect("/sem-acesso?motivo=permissao-insuficiente");
  }

  return {
    tenantId: contexto.tenant.id,
    userId: contexto.userId,
  };
}

function textoObrigatorio(formData: FormData, chave: string, label: string): string {
  const valor = String(formData.get(chave) ?? "").trim();
  if (!valor) throw new ErroRegraTemplateEmail(`Informe ${label}.`);
  return valor;
}

function textoOpcional(
  formData: FormData,
  chave: string,
  limite: number,
): string | null {
  const valor = String(formData.get(chave) ?? "").trim();
  if (!valor) return null;
  if (valor.length > limite) {
    throw new ErroRegraTemplateEmail(`O campo ${chave} excedeu o limite permitido.`);
  }
  return valor;
}

function revalidarTemplates() {
  revalidatePath(CAMINHO_TEMPLATES_EMAIL);
  revalidatePath("/email");
}

function redirecionarComErro(erro: unknown, fallback: string): never {
  const mensagem = erro instanceof Error ? erro.message : fallback;
  redirect(`${CAMINHO_TEMPLATES_EMAIL}?erro=${encodeURIComponent(mensagem)}`);
}
