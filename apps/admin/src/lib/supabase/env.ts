/**
 * Centraliza as variáveis públicas do Supabase usadas pelo Admin.
 *
 * A publishable key pode ir ao navegador; service_role nunca deve ser usado aqui
 * porque burlaria RLS e quebraria o isolamento multi-tenant.
 */
export function supabaseEstaConfigurado() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}

export function obterAmbienteSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error("Variáveis públicas do Supabase não configuradas.");
  }

  return { key, url };
}
