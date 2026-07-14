"use client";

import { BarChart3, CalendarDays, CreditCard, Users } from "lucide-react";
import { useEffect, useState } from "react";

import { GlassCard, cn } from "@hospedex/ui";

const MODULOS = [
  {
    titulo: "Reservas",
    icon: CalendarDays,
    linhas: ["Solicitações", "Pagamentos", "Check-in"]
  },
  {
    titulo: "Financeiro",
    icon: CreditCard,
    linhas: ["Receitas", "Despesas", "Pendentes"]
  },
  {
    titulo: "Hóspedes",
    icon: Users,
    linhas: ["Contatos", "Histórico", "CRM"]
  },
  {
    titulo: "Relatórios",
    icon: BarChart3,
    linhas: ["Receita", "Ocupação", "Ticket médio"]
  }
] as const;

/**
 * Carrossel do preview de gerenciamento na pagina Anunciar.
 *
 * A versao anterior empilhava muitos cards no mobile. Este slider mostra um
 * modulo por vez, mantendo a leitura curta e preservando o mesmo conteudo.
 */
export function ManagementPreviewCarousel() {
  const [indiceAtual, setIndiceAtual] = useState(0);
  const [pausado, setPausado] = useState(false);

  useEffect(() => {
    const movimentoReduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (movimentoReduzido || pausado) return;

    const intervalo = window.setInterval(() => {
      setIndiceAtual((indice) => (indice + 1) % MODULOS.length);
    }, 3200);

    return () => window.clearInterval(intervalo);
  }, [pausado]);

  return (
    <div
      className="min-w-0 overflow-hidden rounded-2xl border border-cyan-300/15 bg-slate-950/55 p-3 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onTouchStart={() => setPausado(true)}
    >
      <div
        className="flex transition-transform duration-700 ease-out"
        style={{ transform: `translateX(-${indiceAtual * 100}%)` }}
      >
        {MODULOS.map((modulo) => {
          const Icone = modulo.icon;

          return (
            <div className="min-w-full px-1" key={modulo.titulo}>
              <GlassCard className="min-h-[232px] border-cyan-300/15 bg-slate-950/72 p-5 text-cyan-50 dark:bg-slate-950/72">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
                    <Icone className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
                      Módulo
                    </p>
                    <h3 className="font-semibold">{modulo.titulo}</h3>
                  </div>
                </div>
                <div className="mt-5 space-y-2">
                  {modulo.linhas.map((linha) => (
                    <PreviewLinha key={linha} texto={linha} />
                  ))}
                </div>
              </GlassCard>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 px-1">
        <p className="text-xs text-cyan-50/70">
          {indiceAtual + 1} de {MODULOS.length}
        </p>
        <div className="flex gap-2">
          {MODULOS.map((modulo, indice) => (
            <button
              aria-label={`Ver ${modulo.titulo}`}
              className={cn(
                "h-2.5 rounded-full transition-all",
                indice === indiceAtual
                  ? "w-7 bg-cyan-300"
                  : "w-2.5 bg-cyan-300/25 hover:bg-cyan-300/50"
              )}
              key={modulo.titulo}
              onClick={() => setIndiceAtual(indice)}
              type="button"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function PreviewLinha({ texto }: { texto: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-cyan-300/15 bg-cyan-500/5 px-3 py-2 text-sm">
      <span className="text-cyan-50/78">{texto}</span>
      <span className="h-2 w-12 rounded-full bg-cyan-300/45" />
    </div>
  );
}
