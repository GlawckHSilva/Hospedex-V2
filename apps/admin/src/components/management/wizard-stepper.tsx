"use client";

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
    <div className={cn("space-y-3", className)}>
      <div className="space-y-2 sm:hidden">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-200">
            Etapa {etapaAtual + 1} de {etapas.length}
          </p>
          <p className="text-sm font-semibold">{etapaAtiva?.label}</p>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-cyan-500 transition-[width] duration-300 ease-out"
            style={{ width: progresso }}
          />
        </div>
      </div>

      <ol
        aria-label="Etapas do formulario"
        className="hidden gap-3 sm:grid"
        style={{ gridTemplateColumns: `repeat(${etapas.length}, minmax(0, 1fr))` }}
      >
        {etapas.map((etapa, indice) => {
          const ativa = indice === etapaAtual;
          const concluida = possuiMarcador(etapasConcluidas, etapa, indice);
          const comErro = possuiMarcador(etapasComErro, etapa, indice);
          const conteudo = (
            <>
              <span
                className={cn(
                  "col-span-2 mb-2 block h-1 rounded-full bg-muted transition-colors duration-200",
                  (ativa || concluida) && !comErro && "bg-cyan-500",
                  comErro && "bg-red-500/80",
                )}
              />
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                  ativa &&
                    "border-cyan-400 bg-cyan-500/15 text-cyan-700 shadow-sm shadow-cyan-500/20 dark:text-cyan-200",
                  concluida && !comErro && "border-cyan-500 bg-cyan-500 text-white",
                  comErro && "border-red-400 bg-red-500/15 text-red-600 dark:text-red-200",
                  !ativa && !concluida && !comErro && "border-border bg-muted/45 text-muted-foreground",
                )}
              >
                {indice + 1}
              </span>
              <span className="min-w-0 break-words leading-tight">{etapa.label}</span>
            </>
          );

          return (
            <li aria-current={ativa ? "step" : undefined} className="min-w-0" key={etapa.id}>
              {onEtapaClick ? (
                <button
                  className={cn(
                    "grid w-full min-w-0 grid-cols-[auto_1fr] items-center gap-x-2 text-left text-xs font-semibold transition-colors",
                    ativa && "text-cyan-700 dark:text-cyan-200",
                    concluida && !ativa && "text-foreground",
                    comErro && "text-red-600 dark:text-red-200",
                    !ativa && !concluida && !comErro && "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => onEtapaClick(indice, etapa)}
                  type="button"
                >
                  {conteudo}
                </button>
              ) : (
                <div className="grid min-w-0 grid-cols-[auto_1fr] items-center gap-x-2 text-xs font-semibold">
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
