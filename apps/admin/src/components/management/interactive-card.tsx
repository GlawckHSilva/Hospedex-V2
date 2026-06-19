"use client";

import { useEffect, type ComponentPropsWithoutRef } from "react";

import { cn } from "@hospedex/ui";

const SELETOR_CARTAO_INTERATIVO =
  ".admin-glass-card, .glass-card, .admin-interactive-card";

/**
 * Camada reutilizavel para a luz interna dos cards do Gerenciamento.
 *
 * A regra fica centralizada para evitar duplicacao em cada modulo. O listener
 * atualiza apenas a posicao do brilho ciano no card sob o mouse; nenhum
 * transform e aplicado para manter os cards totalmente estaticos.
 */
export function InteractiveCardEffects() {
  useEffect(() => {
    const shellGerenciamento = document.querySelector(".admin-management-shell");
    const permiteHoverFino = window.matchMedia("(hover: hover) and (pointer: fine)");
    const permiteMovimento = window.matchMedia("(prefers-reduced-motion: no-preference)");

    // A luz interna fica restrita a desktop com mouse preciso.
    // Em mobile ou reduced motion mantemos leitura e acessibilidade sem animacao.
    if (!shellGerenciamento || !permiteHoverFino.matches || !permiteMovimento.matches) {
      return;
    }

    document.body.classList.add("admin-interactive-cards-enabled");

    function obterCartao(alvo: EventTarget | null): HTMLElement | null {
      if (!(alvo instanceof Element)) {
        return null;
      }

      return alvo.closest<HTMLElement>(SELETOR_CARTAO_INTERATIVO);
    }

    function atualizarLuzCartao(evento: PointerEvent) {
      const cartao = obterCartao(evento.target);

      if (!cartao) {
        return;
      }

      const limite = cartao.getBoundingClientRect();
      const posicaoX = evento.clientX - limite.left;
      const posicaoY = evento.clientY - limite.top;

      cartao.style.setProperty("--interactive-card-x", `${posicaoX}px`);
      cartao.style.setProperty("--interactive-card-y", `${posicaoY}px`);
    }

    function resetarLuzCartao(evento: PointerEvent) {
      const cartaoAtual = obterCartao(evento.target);
      const proximoCartao = obterCartao(evento.relatedTarget);

      if (!cartaoAtual || cartaoAtual === proximoCartao) {
        return;
      }

      cartaoAtual.style.setProperty("--interactive-card-x", "50%");
      cartaoAtual.style.setProperty("--interactive-card-y", "50%");
    }

    document.addEventListener("pointermove", atualizarLuzCartao, { passive: true });
    document.addEventListener("pointerout", resetarLuzCartao, { passive: true });

    return () => {
      document.body.classList.remove("admin-interactive-cards-enabled");
      document.querySelectorAll<HTMLElement>(SELETOR_CARTAO_INTERATIVO).forEach((cartao) => {
        cartao.style.removeProperty("--interactive-card-x");
        cartao.style.removeProperty("--interactive-card-y");
      });
      document.removeEventListener("pointermove", atualizarLuzCartao);
      document.removeEventListener("pointerout", resetarLuzCartao);
    };
  }, []);

  return null;
}

export function InteractiveCard({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return <div className={cn("admin-interactive-card", className)} {...props} />;
}
