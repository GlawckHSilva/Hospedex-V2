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
  const indiceSeguro = Math.min(Math.max(etapaAtual, 0), etapas.length - 1);
  const percentual = Math.round(((indiceSeguro + 1) / Math.max(etapas.length, 1)) * 100);
  const progresso = `${percentual}%`;
  const etapaAtiva = etapas[indiceSeguro] ?? etapas[0];

  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-2 sm:hidden">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-200">
              Etapa {indiceSeguro + 1} de {etapas.length}
            </p>
            <p className="text-sm font-semibold">{etapaAtiva?.label}</p>
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {percentual}% concluído
          </span>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-cyan-500 transition-[width] duration-300 ease-out"
            style={{ width: progresso }}
          />
        </div>
      </div>

      <div className="hidden space-y-4 sm:block">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-200">
            Etapa {indiceSeguro + 1} de {etapas.length}
          </p>
          <span className="text-sm font-medium text-muted-foreground">
            {percentual}% concluído
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-cyan-500 transition-[width] duration-300 ease-out"
            style={{ width: progresso }}
          />
        </div>

        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <ol
            aria-label="Etapas do formulario"
            className="grid min-w-[760px] gap-3"
            style={{ gridTemplateColumns: `repeat(${etapas.length}, minmax(5.5rem, 1fr))` }}
          >
            {etapas.map((etapa, indice) => {
              const ativa = indice === indiceSeguro;
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
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                      ativa &&
                        "border-cyan-400 bg-cyan-500 text-cyan-950 shadow-sm shadow-cyan-500/20",
                      concluida && !comErro && "border-cyan-500 bg-cyan-500 text-cyan-950",
                      comErro && "border-red-400 bg-red-500/15 text-red-600 dark:text-red-200",
                      !ativa && !concluida && !comErro && "border-border bg-muted/45 text-muted-foreground",
                    )}
                  >
                    {indice + 1}
                  </span>
                  <span className="min-w-0 whitespace-nowrap leading-tight">{etapa.label}</span>
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
                      title={etapa.label}
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
      </div>
    </div>
  );
}
