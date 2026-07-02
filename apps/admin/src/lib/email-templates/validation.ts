import {
  DADOS_PREVIEW_EMAIL,
  EMAIL_TEMPLATE_VARIABLES,
  type EmailTemplateVariable,
} from "./defaults";

/**
 * Validação e renderização de templates.
 *
 * Esta camada existe para impedir que a interface e as server actions tenham
 * regras diferentes sobre variáveis permitidas. Um template com variável
 * inválida não deve ser salvo porque quebraria notificações automáticas.
 */

const VARIAVEL_REGEX = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;
const VARIAVEIS_PERMITIDAS = new Set<string>(EMAIL_TEMPLATE_VARIABLES);

export type ResultadoValidacaoTemplate = {
  erros: string[];
  valido: boolean;
};

export type CamposTemplateEmail = {
  body: string;
  buttonText: string;
  buttonUrl: string;
  subject: string;
  title: string;
};

export function extrairVariaveisTemplate(texto: string): string[] {
  const variaveis = new Set<string>();

  for (const match of texto.matchAll(VARIAVEL_REGEX)) {
    const variavel = match[1]?.trim();
    if (variavel) variaveis.add(variavel);
  }

  return [...variaveis];
}

export function validarTemplateEmail(
  campos: CamposTemplateEmail,
): ResultadoValidacaoTemplate {
  const erros: string[] = [];

  if (!campos.subject.trim()) erros.push("Informe o assunto do e-mail.");
  if (!campos.title.trim()) erros.push("Informe o título do e-mail.");
  if (!campos.body.trim()) erros.push("Informe o corpo da mensagem.");

  const textos = [
    campos.subject,
    campos.title,
    campos.body,
    campos.buttonText,
    campos.buttonUrl,
  ];

  for (const variavel of extrairVariaveisTemplate(textos.join("\n"))) {
    if (!VARIAVEIS_PERMITIDAS.has(variavel)) {
      erros.push(`Variável inválida: {{${variavel}}}`);
    }
  }

  const linkBotao = campos.buttonUrl.trim();
  if (linkBotao && !ehVariavelPermitida(linkBotao) && !ehUrlValida(linkBotao)) {
    erros.push("Informe uma URL válida ou uma variável permitida no link do botão.");
  }

  return {
    erros,
    valido: erros.length === 0,
  };
}

export function renderizarTemplatePreview(texto: string): string {
  return texto.replace(VARIAVEL_REGEX, (_, nome: EmailTemplateVariable) => {
    return DADOS_PREVIEW_EMAIL[nome] ?? `{{${nome}}}`;
  });
}

export function obterVariaveisPermitidas(): readonly EmailTemplateVariable[] {
  return EMAIL_TEMPLATE_VARIABLES;
}

function ehVariavelPermitida(valor: string): boolean {
  const match = valor.match(/^{{\s*([a-zA-Z0-9_]+)\s*}}$/);
  return Boolean(match?.[1] && VARIAVEIS_PERMITIDAS.has(match[1]));
}

function ehUrlValida(valor: string): boolean {
  try {
    const url = new URL(valor);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
