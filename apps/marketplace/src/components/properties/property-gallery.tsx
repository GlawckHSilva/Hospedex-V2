"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Images, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Button, cn } from "@hospedex/ui";

import type { PropriedadePublica } from "../../lib/marketplace/data";

export type PropertyGalleryProps = {
  property: PropriedadePublica;
};

/**
 * Galeria publica da Casa.
 *
 * Centraliza navegacao por teclado, swipe e modal para que a pagina nao
 * replique regras de acessibilidade ou controle de indice.
 */
export function PropertyGallery({ property }: PropertyGalleryProps) {
  const imagens = ordenarImagens(property.images);
  const [indiceAtivo, setIndiceAtivo] = useState(0);
  const [modalAberta, setModalAberta] = useState(false);
  const toqueInicial = useRef<number | null>(null);
  const navegar = useCallback(
    (direcao: -1 | 1) => {
      setIndiceAtivo((indiceAtual) => {
        const proximo = indiceAtual + direcao;
        if (proximo < 0) return imagens.length - 1;
        if (proximo >= imagens.length) return 0;
        return proximo;
      });
    },
    [imagens.length]
  );

  useEffect(() => {
    if (!modalAberta) return;

    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function controlarTeclado(evento: KeyboardEvent) {
      if (evento.key === "Escape") setModalAberta(false);
      if (evento.key === "ArrowLeft") navegar(-1);
      if (evento.key === "ArrowRight") navegar(1);
    }

    window.addEventListener("keydown", controlarTeclado);
    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener("keydown", controlarTeclado);
    };
  }, [modalAberta, navegar]);

  if (!imagens.length) {
    return (
      <div className="glass-panel grid min-h-[360px] place-items-center border-dashed p-8 text-center">
        <div>
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-primary/10 text-primary">
            <Images className="h-5 w-5" />
          </span>
          <p className="mt-4 font-semibold">Fotos em preparação</p>
          <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
            O proprietário ainda está preparando a galeria pública desta casa.
          </p>
        </div>
      </div>
    );
  }

  const imagemAtiva = imagens[indiceAtivo] ?? imagens[0]!;
  const miniaturas = imagens.slice(1, 5);

  function concluirSwipe(posicaoFinal: number) {
    if (toqueInicial.current === null) return;
    const distancia = posicaoFinal - toqueInicial.current;
    toqueInicial.current = null;
    if (Math.abs(distancia) < 48) return;
    navegar(distancia > 0 ? -1 : 1);
  }

  return (
    <>
      <div className="grid gap-2 overflow-hidden rounded-lg lg:grid-cols-[1.55fr_0.75fr]">
        <button
          aria-label="Abrir galeria de fotos"
          className="group relative min-h-[360px] overflow-hidden bg-secondary text-left lg:min-h-[520px]"
          onClick={() => setModalAberta(true)}
          type="button"
        >
          <img
            alt={imagemAtiva.alt}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.015]"
            fetchPriority="high"
            src={imagemAtiva.url}
          />
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/65 to-transparent p-4 text-white">
            <span className="text-sm font-medium">Ver galeria completa</span>
            <Contador atual={indiceAtivo + 1} total={imagens.length} />
          </div>
        </button>

        <div className="grid grid-cols-2 gap-2 lg:grid-rows-2">
          {miniaturas.map((imagem, indice) => {
            const indiceReal = indice + 1;
            return (
              <button
                aria-label={`Abrir foto ${indiceReal + 1}`}
                className="group relative min-h-36 overflow-hidden bg-secondary lg:min-h-0"
                key={imagem.id}
                onClick={() => {
                  setIndiceAtivo(indiceReal);
                  setModalAberta(true);
                }}
                type="button"
              >
                <img
                  alt={imagem.alt}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.025]"
                  loading="lazy"
                  src={imagem.url}
                />
                {indice === miniaturas.length - 1 && imagens.length > 5 ? (
                  <span className="absolute inset-0 grid place-items-center bg-black/48 text-sm font-semibold text-white">
                    +{imagens.length - 5} fotos
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {modalAberta ? (
                <motion.div
                  animate={{ opacity: 1 }}
                  aria-label="Galeria de fotos"
                  aria-modal="true"
                  className="fixed inset-0 z-[100] flex flex-col bg-black/92 p-3 backdrop-blur-xl sm:p-6"
                  exit={{ opacity: 0 }}
                  initial={{ opacity: 0 }}
                  role="dialog"
                >
                  <div className="flex items-center justify-between gap-3 text-white">
                    <Contador atual={indiceAtivo + 1} total={imagens.length} />
                    <Button
                      aria-label="Fechar galeria"
                      className="border-white/15 bg-white/10 text-white hover:bg-white/15"
                      onClick={() => setModalAberta(false)}
                      size="icon"
                      type="button"
                      variant="outline"
                    >
                      <X />
                    </Button>
                  </div>

                  <div
                    className="relative flex min-h-0 flex-1 items-center justify-center py-4"
                    onPointerDown={(evento) => {
                      toqueInicial.current = evento.clientX;
                    }}
                    onPointerUp={(evento) => concluirSwipe(evento.clientX)}
                  >
                    <Button
                      aria-label="Foto anterior"
                      className="absolute left-0 z-10 border-white/15 bg-black/35 text-white hover:bg-black/55"
                      onClick={() => navegar(-1)}
                      size="icon"
                      type="button"
                      variant="outline"
                    >
                      <ChevronLeft />
                    </Button>
                    <motion.div
                      className="flex h-full w-full items-center justify-center px-12"
                      key={imagemAtiva.id}
                      initial={{ opacity: 0.4 }}
                      animate={{ opacity: 1 }}
                    >
                      <img
                        alt={imagemAtiva.alt}
                        className="max-h-full max-w-full select-none object-contain"
                        draggable={false}
                        src={imagemAtiva.url}
                      />
                    </motion.div>
                    <Button
                      aria-label="Próxima foto"
                      className="absolute right-0 z-10 border-white/15 bg-black/35 text-white hover:bg-black/55"
                      onClick={() => navegar(1)}
                      size="icon"
                      type="button"
                      variant="outline"
                    >
                      <ChevronRight />
                    </Button>
                  </div>

                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {imagens.map((imagem, indice) => (
                      <button
                        aria-label={`Selecionar foto ${indice + 1}`}
                        className={cn(
                          "h-16 w-24 shrink-0 overflow-hidden rounded-md border-2 transition",
                          indice === indiceAtivo
                            ? "border-cyan-300"
                            : "border-transparent opacity-65 hover:opacity-100"
                        )}
                        key={imagem.id}
                        onClick={() => setIndiceAtivo(indice)}
                        type="button"
                      >
                        <img
                          alt=""
                          className="h-full w-full object-cover"
                          src={imagem.url}
                        />
                      </button>
                    ))}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body
          )
        : null}
    </>
  );
}

function ordenarImagens(imagens: PropriedadePublica["images"]) {
  return [...imagens].sort((a, b) => Number(b.isCover) - Number(a.isCover));
}

function Contador({ atual, total }: { atual: number; total: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
      <Images className="h-3.5 w-3.5" />
      {atual}/{total}
    </span>
  );
}
