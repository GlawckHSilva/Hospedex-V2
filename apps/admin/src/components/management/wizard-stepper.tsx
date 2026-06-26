"use client";

import { AlertCircle, Check } from "lucide-react";

import { cn } from "@hospedex/ui";

/**
 * Stepper reutilizavel para modais em formato de wizard.
 *
 * O componente centraliza a leitura visual de progresso sem assumir regras de
 * negocio. Quem usa o stepper continua responsavel por validar permissoes,
 * dados obrigatorios e bloqueio de avancos indevidos.
 */

export type WizardStepperEtapa = {
  id: string;
  label: string;
};

type MarcadorEtapa = number | string;

type WizardStepperProps<TEtapa extends WizardStepperEtapa> = {
  className?: string | undefined;
  etapaAtual: number;
  etapas: TEtapa[];
  etapasComErro?: MarcadorEtapa[] | undefined;
  etapasConcluidas?: MarcadorEtapa[] | undefined;
  onEtapaClick?: ((indice: number, etapa: TEtapa) => void) | undefined;
};

function possuiMarcador(
  marcadores: MarcadorEtapa[],
  etapa: WizardStepperEtapa,
  indice: number,
) {
  return marcadores.includes(indice) || marcadores.includes(etapa.id);
}

export function WizardStepper<TEtapa extends WizardStepperEtapa>({
  className,
  etapaAtual,
  etapas,
  etapasComErro = [],
  etapasConcluidas = [],
  onEtapaClick,
}: WizardStepperProps<TEtapa>) {
  const totalEtapas = Math.max(etapas.length - 1, 1);
  const progresso = `${(Math.min(Math.max(etapaAtual, 0), etapas.length - 1) / totalEtapas) * 100}%`;
  const etapaAtiva = etapas[etapaAtual] ?? etapas[0];

  return (
    <div className={cn("rounded-2xl border bg-background/45 p-3 shadow-sm backdrop-blur", className)}>
      <div className="mb-3 flex items-center justify-between gap-3 sm:hidden">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-200">
            Etapa {etapaAtual + 1} de {etapas.length}
          </p>
          <p className="truncate text-sm font-semibold">{etapaAtiva?.label}</p>
        </div>
        <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-700 dark:text-cyan-200">
          {Math.round(Number.parseFloat(progresso))}%
        </span>
      </div>

      <div className="relative mb-3 h-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-cyan-500 transition-[width] duration-300 ease-out"
          style={{ width: progresso }}
        />
      </div>

      <ol aria-label="Etapas do formulario" className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
        {etapas.map((etapa, indice) => {
          const ativa = indice === etapaAtual;
          const concluida = possuiMarcador(etapasConcluidas, etapa, indice);
          const comErro = possuiMarcador(etapasComErro, etapa, indice);
          const conteudo = (
            <>
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                  ativa &&
                    "border-cyan-400 bg-cyan-500/15 text-cyan-700 shadow-sm shadow-cyan-500/20 dark:text-cyan-200",
                  concluida && !comErro && "border-cyan-500 bg-cyan-500 text-white",
                  comErro && "border-red-400 bg-red-500/15 text-red-600 dark:text-red-200",
                  !ativa && !concluida && !comErro && "border-border bg-muted/45 text-muted-foreground",
                )}
              >
                {comErro ? (
                  <AlertCircle className="h-3.5 w-3.5" />
                ) : concluida ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  indice + 1
                )}
              </span>
              <span className="min-w-0 truncate">{etapa.label}</span>
            </>
          );

          return (
            <li aria-current={ativa ? "step" : undefined} className="min-w-0" key={etapa.id}>
              {onEtapaClick ? (
                <button
                  className={cn(
                    "flex w-full min-w-0 items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-xs font-semibold transition",
                    ativa && "border-cyan-400/50 bg-cyan-500/15 text-cyan-700 dark:text-cyan-200",
                    concluida && !ativa && "border-cyan-400/30 bg-cyan-500/8 text-foreground",
                    comErro && "border-red-400/45 bg-red-500/10 text-red-600 dark:text-red-200",
                    !ativa && !concluida && !comErro &&
                      "border-transparent bg-transparent text-muted-foreground hover:border-cyan-300/30 hover:bg-cyan-500/5 hover:text-foreground",
                  )}
                  onClick={() => onEtapaClick(indice, etapa)}
                  type="button"
                >
                  {conteudo}
                </button>
              ) : (
                <div className="flex min-w-0 items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold">
                  {conteudo}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
