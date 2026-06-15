import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ErroRegraNegocio } from "./permissions";

/**
 * Feedback comum das server actions do módulo.
 *
 * Centraliza redirects e revalidação para manter mensagens em português e evitar
 * que cada submódulo implemente seu próprio contrato de retorno.
 */

export const CAMINHO_PROPRIEDADES = "/propriedades";
export const CAMINHO_UNIDADES = "/unidades";

export function textoObrigatorio(formData: FormData, chave: string, label: string): string {
  const valor = formData.get(chave)?.toString().trim();
  if (!valor) throw new ErroRegraNegocio(`Informe ${label}.`);
  return valor;
}

export function obterCaminhoRetorno(formData: FormData): string {
  const retorno = formData.get("retorno")?.toString();
  return retorno === CAMINHO_PROPRIEDADES ? CAMINHO_PROPRIEDADES : CAMINHO_UNIDADES;
}

export function revalidarModuloPropriedades() {
  revalidatePath(CAMINHO_PROPRIEDADES);
  revalidatePath(CAMINHO_UNIDADES);
}

export function redirecionarComErro(
  caminho: string,
  erro: unknown,
  mensagemLog: string
): never {
  const mensagem =
    erro instanceof ErroRegraNegocio
      ? erro.message
      : "Não foi possível concluir a operação.";

  if (!(erro instanceof ErroRegraNegocio)) {
    console.error(mensagemLog, erro);
  }

  redirect(`${caminho}?erro=${encodeURIComponent(mensagem)}`);
}
