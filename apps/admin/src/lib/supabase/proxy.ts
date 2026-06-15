import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

import { obterAmbienteSupabase, supabaseEstaConfigurado } from "./env";

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
  const { data, error } = await supabase.auth.getUser();
  const usuarioAutenticado: User | null = error ? null : data.user;

  return { resposta, usuarioAutenticado };
}
