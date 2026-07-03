import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { atualizarSessaoSupabase } from "./lib/supabase/proxy";

const publicRoutes = new Set([
  "/auth/callback",
  "/cadastro",
  "/login",
  "/nova-senha",
  "/recuperar-senha"
]);

export async function proxy(request: NextRequest) {
  const { resposta, usuarioAutenticado } = await atualizarSessaoSupabase(request);
  const path = request.nextUrl.pathname;

  if (path.startsWith("/api/")) {
    return resposta;
  }

  if (publicRoutes.has(path)) {
    return resposta;
  }

  if (!usuarioAutenticado) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", path);
    return NextResponse.redirect(loginUrl);
  }

  return resposta;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]
};
