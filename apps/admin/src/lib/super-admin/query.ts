/**
 * Guardas de consulta para telas globais do Super Admin.
 *
 * Evita que uma consulta externa deixe a pagina carregando indefinidamente e
 * transforma falhas de leitura em estado vazio/zero com log de servidor.
 */

const TIMEOUT_CONSULTA_MS = 10_000;

type ResultadoDados<T> = {
  data: T | null;
  error: { message: string } | null;
};

type ResultadoContagem = {
  count: number | null;
  error: { message: string } | null;
};

export async function lerDadosSuperAdmin<T>(
  consulta: PromiseLike<ResultadoDados<T>>,
  contexto: string,
  fallback: T
): Promise<T> {
  try {
    const resultado = await comTimeout(Promise.resolve(consulta), contexto);
    if (resultado.error) {
      console.error(`Erro ao carregar ${contexto}.`, resultado.error.message);
      return fallback;
    }

    return resultado.data ?? fallback;
  } catch (erro) {
    console.error(`Erro ao carregar ${contexto}.`, erro);
    return fallback;
  }
}

export async function contarSuperAdmin(
  consulta: PromiseLike<ResultadoContagem>,
  contexto: string
): Promise<number> {
  try {
    const resultado = await comTimeout(Promise.resolve(consulta), contexto);
    if (resultado.error) {
      console.error(`Erro ao contar ${contexto}.`, resultado.error.message);
      return 0;
    }

    return resultado.count ?? 0;
  } catch (erro) {
    console.error(`Erro ao contar ${contexto}.`, erro);
    return 0;
  }
}

async function comTimeout<T>(consulta: Promise<T>, contexto: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, rejeitar) => {
    timer = setTimeout(
      () => rejeitar(new Error(`Tempo limite excedido em ${contexto}.`)),
      TIMEOUT_CONSULTA_MS
    );
  });

  try {
    return await Promise.race([consulta, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
