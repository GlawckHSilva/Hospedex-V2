import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente Supabase server-side do Marketplace.
 *
 * Mantem a sessao do hospede em cookies HTTP e evita qualquer uso de service
 * role no frontend. Toda autorizacao continua dependendo das policies RLS.
 */
export async function criarClienteSupabaseServer() {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) return null;

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, options, value }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components podem ler cookies, mas nao gravar. Server Actions
          // e Route Handlers gravam normalmente pelo mesmo helper.
        }
      }
    }
  });
}
