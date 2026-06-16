import "server-only";

import { createClient } from "@supabase/supabase-js";

import { obterAmbienteSupabase } from "./env";

/**
 * Cliente administrativo do Supabase usado apenas em server actions sensiveis.
 *
 * A service role ignora RLS, por isso nunca deve ser importada por componentes
 * client-side. Toda chamada precisa validar a role super_admin antes de gravar.
 */
export function criarClienteSupabaseAdmin() {
  const { url } = obterAmbienteSupabase();
  const key = obterChaveServiceRole();

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

function obterChaveServiceRole() {
  const key =
    process.env.HOSPEDEX_SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!key) {
    throw new Error("Service role do Supabase nao configurada no servidor.");
  }

  return key;
}
