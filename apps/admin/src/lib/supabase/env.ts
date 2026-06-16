/**
 * Centraliza as variáveis públicas do Supabase usadas pelo Admin.
 *
 * A publishable key pode ir ao navegador; service_role nunca deve ser usado aqui
 * porque burlaria RLS e quebraria o isolamento multi-tenant.
 */
export function supabaseEstaConfigurado() {
  return Boolean(
    normalizarVariavelAmbiente(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      normalizarVariavelAmbiente(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
  );
}

export function obterAmbienteSupabase() {
  const url = normalizarVariavelAmbiente(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = normalizarVariavelAmbiente(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

  if (!url || !key) {
    throw new Error("Variáveis públicas do Supabase não configuradas.");
  }

  return { key, url };
}

export function normalizarVariavelAmbiente(valor: string | undefined) {
  // Remove BOM/caracteres invisiveis que podem entrar por CLI e quebrar cookies.
  return valor?.replace(/\uFEFF/g, "").trim();
}
