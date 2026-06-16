"use client";

import { createBrowserClient } from "@supabase/ssr";

import { obterAmbienteSupabase } from "./env";

let clienteSupabaseBrowser: ReturnType<typeof createBrowserClient> | null =
  null;

export function criarClienteSupabaseBrowser() {
  if (clienteSupabaseBrowser) return clienteSupabaseBrowser;

  const { url, key } = obterAmbienteSupabase();
  clienteSupabaseBrowser = createBrowserClient(url, key);

  return clienteSupabaseBrowser;
}
