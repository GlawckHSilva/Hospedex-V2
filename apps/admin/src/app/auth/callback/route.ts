import { NextResponse, type NextRequest } from "next/server";

import { supabaseEstaConfigurado } from "../../../lib/supabase/env";
import { criarClienteSupabaseServer } from "../../../lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const requestedNext = url.searchParams.get("next") ?? "/";
  const next = requestedNext.startsWith("/") ? requestedNext : "/";

  if (code && supabaseEstaConfigurado()) {
    const supabase = await criarClienteSupabaseServer();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
