import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

import { obterAmbienteSupabase, supabaseEstaConfigurado } from "./env";

const TEMPO_LIMITE_PROXY_MS = 10_000;

export async function atualizarSessaoSupabase(request: NextRequest) {
  let resposta = NextResponse.next({ request });

  if (!supabaseEstaConfigurado()) {
    return { resposta, usuarioAutenticado: null };
  }

  const { url, key } = obterAmbienteSupabase();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        resposta = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          resposta.cookies.set(name, value, options);
        });
      }
    }
  });

  // `getUser` valida a sessão no Supabase; cookie sozinho pode ser forjado.
  const { data, error } = await comTempoLimite(
    supabase.auth.getUser(),
    "Tempo limite ao validar sessao no Supabase."
  ).catch((erro) => {
    console.error("Sessao invalida ou indisponivel no proxy.", erro);
    return { data: { user: null }, error: erro };
  });
  const usuarioAutenticado: User | null = error ? null : data.user;

  return { resposta, usuarioAutenticado };
}

async function comTempoLimite<T>(consulta: PromiseLike<T>, mensagem: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, rejeitar) => {
    timer = setTimeout(() => rejeitar(new Error(mensagem)), TEMPO_LIMITE_PROXY_MS);
  });

  try {
    return await Promise.race([Promise.resolve(consulta), timeout]);
  } catch (erro) {
    console.error(mensagem, erro);
    throw erro;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
