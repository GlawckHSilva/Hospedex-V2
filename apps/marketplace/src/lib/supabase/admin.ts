import "server-only";

import { createClient } from "@supabase/supabase-js";

/** Cliente administrativo restrito ao servidor para provisionar o trial. */
export function criarClienteSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const chave =
    process.env.HOSPEDEX_SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !chave) {
    throw new Error("Configuracao administrativa do Supabase ausente no servidor.");
  }

  return createClient(url, chave, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}
