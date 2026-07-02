import {
  DADOS_PREVIEW_EMAIL,
  EMAIL_TEMPLATE_VARIABLES,
  type EmailTemplateVariable,
} from "./defaults";

/**
 * Validacao e renderizacao de templates.
 *
 * Esta camada existe para impedir que a interface e as server actions tenham
 * regras diferentes sobre variaveis permitidas. Um template com variavel
 * invalida nao deve ser salvo porque quebraria notificacoes automaticas.
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
  if (!campos.title.trim()) erros.push("Informe o titulo do e-mail.");
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
      erros.push(`Variavel invalida: {{${variavel}}}`);
    }
  }

  const linkBotao = campos.buttonUrl.trim();
  if (linkBotao && !ehVariavelPermitida(linkBotao) && !ehUrlValida(linkBotao)) {
    erros.push("Informe uma URL valida ou uma variavel permitida no link do botao.");
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
