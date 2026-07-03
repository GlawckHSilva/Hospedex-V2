import { NextResponse } from "next/server";

import { processarLembretesClimaCheckin } from "../../../../lib/weather/checkin-reminders";

/**
 * Endpoint interno acionado pelo Vercel Cron.
 *
 * A protecao por CRON_SECRET impede execucao publica aberta. O dry-run permite
 * validar reservas elegiveis e mensagens sem enviar e-mail real.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const segredoConfigurado = process.env.CRON_SECRET?.trim();
  const authorization = request.headers.get("authorization");

  if (!segredoConfigurado) {
    return NextResponse.json(
      { error: "CRON_SECRET nao configurado no servidor." },
      { status: 500 },
    );
  }

  if (authorization !== `Bearer ${segredoConfigurado}`) {
    return NextResponse.json({ error: "Acesso nao autorizado." }, { status: 401 });
  }

  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "1";

  try {
    const resultado = await processarLembretesClimaCheckin({ dryRun });
    return NextResponse.json({
      ok: true,
      resultado,
    });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Erro inesperado no job de clima.";
    console.error("Nao foi possivel executar job de clima.", mensagem);

    return NextResponse.json(
      { error: "Nao foi possivel executar job de clima.", detail: mensagem },
      { status: 500 },
    );
  }
}

