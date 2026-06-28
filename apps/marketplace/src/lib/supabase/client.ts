"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente Supabase do navegador no Marketplace.
 *
 * Usa somente a chave publica para sessoes do hospede. Service role nunca deve
 * aparecer aqui porque este arquivo entra no bundle do browser.
 */
export function criarClienteSupabaseBrowser() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) return null;

  return createBrowserClient(supabaseUrl, supabaseKey);
}
