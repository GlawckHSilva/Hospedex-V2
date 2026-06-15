import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { obterAmbienteSupabase } from "./env";

export async function criarClienteSupabaseServer() {
  const cookieStore = await cookies();
  const { url, key } = obterAmbienteSupabase();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components não escrevem cookies; o proxy renova a sessão.
        }
      }
    }
  });
}
