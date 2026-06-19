"use client";

import { useEffect, type ComponentPropsWithoutRef } from "react";

import { cn } from "@hospedex/ui";

const SELETOR_CARTAO_INTERATIVO =
  ".admin-glass-card, .glass-card, .admin-interactive-card";

/**
 * Camada reutilizavel para o efeito premium dos cards do Gerenciamento.
 *
 * A regra fica centralizada para evitar duplicacao em cada modulo. O listener
 * atualiza variaveis CSS no card sob o mouse, permitindo brilho posicional e
 * inclinacao sutil sem alterar regras de negocio, permissoes ou dados.
 */
export function InteractiveCardEffects() {
  useEffect(() => {
    const shellGerenciamento = document.querySelector(".admin-management-shell");
    const permiteHoverFino = window.matchMedia("(hover: hover) and (pointer: fine)");
    const permiteMovimento = window.matchMedia("(prefers-reduced-motion: no-preference)");

    // O efeito de profundidade fica restrito a desktop com mouse preciso.
    // Em mobile ou reduced motion mantemos leitura e acessibilidade sem rotação.
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

    function atualizarCartao(evento: PointerEvent) {
      const cartao = obterCartao(evento.target);

      if (!cartao) {
        return;
      }

      const limite = cartao.getBoundingClientRect();
      const posicaoX = evento.clientX - limite.left;
      const posicaoY = evento.clientY - limite.top;
      const percentualX = limite.width > 0 ? posicaoX / limite.width : 0.5;
      const percentualY = limite.height > 0 ? posicaoY / limite.height : 0.5;
      const rotacaoY = (percentualX - 0.5) * 3;
      const rotacaoX = (0.5 - percentualY) * 3;

      cartao.style.setProperty("--interactive-card-x", `${posicaoX}px`);
      cartao.style.setProperty("--interactive-card-y", `${posicaoY}px`);
      cartao.style.setProperty("--interactive-card-rotate-x", `${rotacaoX.toFixed(2)}deg`);
      cartao.style.setProperty("--interactive-card-rotate-y", `${rotacaoY.toFixed(2)}deg`);
      cartao.style.setProperty(
        "transform",
        `perspective(900px) translateY(-4px) rotateX(${rotacaoX.toFixed(2)}deg) rotateY(${rotacaoY.toFixed(2)}deg)`,
      );
    }

    function resetarCartao(evento: PointerEvent) {
      const cartaoAtual = obterCartao(evento.target);
      const proximoCartao = obterCartao(evento.relatedTarget);

      if (!cartaoAtual || cartaoAtual === proximoCartao) {
        return;
      }

      cartaoAtual.style.setProperty("--interactive-card-x", "50%");
      cartaoAtual.style.setProperty("--interactive-card-y", "50%");
      cartaoAtual.style.setProperty("--interactive-card-rotate-x", "0deg");
      cartaoAtual.style.setProperty("--interactive-card-rotate-y", "0deg");
      cartaoAtual.style.setProperty(
        "transform",
        "perspective(900px) translateY(0) rotateX(0deg) rotateY(0deg)",
      );
    }

    document.addEventListener("pointermove", atualizarCartao, { passive: true });
    document.addEventListener("pointerout", resetarCartao, { passive: true });

    return () => {
      document.body.classList.remove("admin-interactive-cards-enabled");
      document.querySelectorAll<HTMLElement>(SELETOR_CARTAO_INTERATIVO).forEach((cartao) => {
        cartao.style.removeProperty("transform");
        cartao.style.removeProperty("--interactive-card-x");
        cartao.style.removeProperty("--interactive-card-y");
        cartao.style.removeProperty("--interactive-card-rotate-x");
        cartao.style.removeProperty("--interactive-card-rotate-y");
      });
      document.removeEventListener("pointermove", atualizarCartao);
      document.removeEventListener("pointerout", resetarCartao);
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
