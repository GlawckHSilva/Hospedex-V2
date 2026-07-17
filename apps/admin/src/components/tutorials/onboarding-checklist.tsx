import { CheckCircle2, Circle, LockKeyhole, PlayCircle } from "lucide-react";
import Link from "next/link";

import { Badge } from "@hospedex/ui";

import { concluirEtapaTutorialAction } from "../../lib/tutorials/actions";
import type { TutorialResumoGerenciamento } from "../../lib/tutorials/types";

export function OnboardingChecklist({ resumo }: { resumo: TutorialResumoGerenciamento | null }) {
  if (!resumo?.checklist.length) return null;

  return (
    <section className="admin-glass-panel p-5" data-tour="checklist-onboarding">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Badge variant="info">Onboarding</Badge>
          <h2 className="mt-3 text-lg font-semibold">Primeiros passos do Gerenciamento</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {resumo.progresso}% concluído. Acompanhe apenas módulos liberados para seu perfil.
          </p>
        </div>
        <Link className="text-sm font-semibold text-primary hover:underline" href="/ajuda">
          Abrir central de ajuda
        </Link>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {resumo.checklist.map((etapa, indice) => (
          <div className="rounded-xl border bg-background/55 p-3" key={etapa.id}>
            <div className="flex items-start gap-3">
              {etapa.concluida ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-500" />
              ) : resumo.somenteLeitura ? (
                <LockKeyhole className="mt-0.5 h-5 w-5 text-amber-500" />
              ) : (
                <Circle className="mt-0.5 h-5 w-5 text-primary" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{etapa.titulo}</p>
                <p className="mt-1 text-sm text-muted-foreground">{etapa.descricao}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-primary" href={etapa.href}>
                    <PlayCircle className="mr-1 inline h-3.5 w-3.5" />
                    Abrir etapa
                  </Link>
                  {!etapa.concluida ? (
                    <form action={concluirEtapaTutorialAction}>
                      <input name="tutorialKey" type="hidden" value={resumo.tutorialKey} />
                      <input name="etapaId" type="hidden" value={etapa.id} />
                      <input name="currentStep" type="hidden" value={indice + 1} />
                      <button className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground" type="submit">
                        Marcar feito
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
