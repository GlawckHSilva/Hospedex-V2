"use client";

import { createBrowserClient } from "@supabase/ssr";

import { obterAmbienteSupabase } from "./env";

export function criarClienteSupabaseBrowser() {
  const { url, key } = obterAmbienteSupabase();
  return createBrowserClient(url, key);
}
