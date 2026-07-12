"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Images, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Button, cn } from "@hospedex/ui";

import type { PropriedadePublica } from "../../lib/marketplace/data";

export type PropertyGalleryProps = {
  compact?: boolean;
  mobileHero?: boolean;
  property: PropriedadePublica;
};

/**
 * Galeria publica da casa.
 *
 * Mantem a foto grande principal no hero da pagina e transforma esta secao em
 * uma previa compacta, com lightbox para quem quiser explorar todas as fotos.
 */
export function PropertyGallery({
  compact = false,
  mobileHero = false,
  property
}: PropertyGalleryProps) {
  const imagens = obterImagensGaleria(property);
  const [indiceAtivo, setIndiceAtivo] = useState(0);
  const [modalAberta, setModalAberta] = useState(false);
  const toqueInicial = useRef<number | null>(null);

  const navegar = useCallback(
    (direcao: -1 | 1) => {
      if (imagens.length <= 1) return;

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
    if (indiceAtivo >= imagens.length) setIndiceAtivo(0);
  }, [imagens.length, indiceAtivo]);

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
      <div className="glass-panel grid min-h-[180px] place-items-center border-dashed p-6 text-center">
        <div>
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-primary/10 text-primary">
            <Images className="h-5 w-5" />
          </span>
          <p className="mt-4 font-semibold">Fotos em preparacao</p>
          <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
            O proprietario ainda nao adicionou fotos a galeria.
          </p>
        </div>
      </div>
    );
  }

  const imagemAtiva = imagens[indiceAtivo] ?? imagens[0]!;
  const miniaturas = imagens.slice(1, 5);
  const miniaturasCompactas = imagens.slice(0, 4);
  const fotosRestantes = Math.max(imagens.length - 5, 0);

  function concluirSwipe(posicaoFinal: number) {
    if (toqueInicial.current === null) return;
    const distancia = posicaoFinal - toqueInicial.current;
    toqueInicial.current = null;
    if (Math.abs(distancia) < 48) return;
    navegar(distancia > 0 ? -1 : 1);
  }

  return (
    <>
      {mobileHero ? (
        <div className="grid gap-2 md:hidden">
          <button
            aria-label="Abrir galeria de fotos"
            className="group relative h-[430px] overflow-hidden bg-secondary text-left shadow-2xl shadow-black/30"
            onClick={() => setModalAberta(true)}
            onTouchEnd={(evento) => concluirSwipe(evento.changedTouches[0]?.clientX ?? 0)}
            onTouchStart={(evento) => {
              toqueInicial.current = evento.touches[0]?.clientX ?? null;
            }}
            type="button"
          >
            <img
              alt={obterAlt(imagemAtiva, property.name, indiceAtivo)}
              className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-[1.015]"
              fetchPriority="high"
              src={imagemAtiva.url}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/18 via-transparent to-slate-950/66" />
            <OverlayGaleria atual={indiceAtivo + 1} total={imagens.length} compacto />
          </button>

          {imagens.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto px-4 pb-1">
              {imagens.map((imagem, indice) => (
                <button
                  aria-label={`Selecionar foto ${indice + 1} da hospedagem`}
                  className={cn(
                    "h-16 w-20 shrink-0 overflow-hidden rounded-2xl border bg-secondary transition",
                    indice === indiceAtivo
                      ? "border-cyan-300 opacity-100"
                      : "border-white/12 opacity-70 hover:opacity-100"
                  )}
                  key={imagem.id}
                  onClick={() => setIndiceAtivo(indice)}
                  type="button"
                >
                  <img
                    alt={obterAlt(imagem, property.name, indice)}
                    className="h-full w-full object-cover object-center"
                    loading="lazy"
                    src={imagem.url}
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : compact ? (
        <GaleriaCompacta
          imagens={imagens}
          imagensVisiveis={miniaturasCompactas}
          onAbrir={(indice) => {
            setIndiceAtivo(indice);
            setModalAberta(true);
          }}
        />
      ) : (
        <div className="grid gap-3">
          <div
            className={cn(
              "hidden gap-2 md:grid",
              imagens.length > 1
                ? "md:grid-cols-[minmax(0,1.65fr)_minmax(220px,0.9fr)]"
                : "md:grid-cols-1"
            )}
          >
            <button
              aria-label="Abrir foto da hospedagem"
              className={cn(
                "group relative h-[320px] overflow-hidden bg-secondary text-left shadow-2xl shadow-black/20 lg:h-[360px]",
                imagens.length > 1 ? "rounded-l-3xl" : "rounded-3xl"
              )}
              onClick={() => setModalAberta(true)}
              type="button"
            >
              <img
                alt={obterAlt(imagemAtiva, property.name, indiceAtivo)}
                className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-[1.015]"
                loading="lazy"
                src={imagemAtiva.url}
              />
              <OverlayGaleria atual={indiceAtivo + 1} total={imagens.length} />
            </button>

            {imagens.length > 1 ? (
              <div className="grid h-[320px] grid-cols-2 grid-rows-2 gap-2 lg:h-[360px]">
                {miniaturas.map((imagem, indice) => {
                  const indiceReal = indice + 1;
                  const mostrarRestantes = indice === miniaturas.length - 1 && fotosRestantes > 0;

                  return (
                    <button
                      aria-label={`Abrir foto ${indiceReal + 1} da hospedagem`}
                      className={cn(
                        "group relative overflow-hidden bg-secondary transition",
                        indice === 1 ? "rounded-tr-3xl" : null,
                        indice === miniaturas.length - 1 ? "rounded-br-3xl" : null,
                        miniaturas.length === 1 ? "col-span-2 row-span-2" : null,
                        miniaturas.length === 2 ? "row-span-2" : null,
                        miniaturas.length === 3 && indice === 0 ? "row-span-2" : null
                      )}
                      key={imagem.id}
                      onClick={() => {
                        setIndiceAtivo(indiceReal);
                        setModalAberta(true);
                      }}
                      type="button"
                    >
                      <img
                        alt={obterAlt(imagem, property.name, indiceReal)}
                        className="h-full w-full object-cover object-center transition duration-300 group-hover:scale-[1.025]"
                        loading="lazy"
                        src={imagem.url}
                      />
                      {mostrarRestantes ? (
                        <span className="absolute inset-0 grid place-items-center bg-black/55 text-lg font-semibold text-white">
                          +{fotosRestantes} fotos
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 md:hidden">
            <button
              aria-label="Abrir galeria de fotos"
              className="group relative h-[420px] overflow-hidden rounded-b-none rounded-t-3xl border border-slate-700/70 bg-secondary text-left shadow-2xl shadow-black/20"
              onClick={() => setModalAberta(true)}
              type="button"
            >
              <img
                alt={obterAlt(imagemAtiva, property.name, indiceAtivo)}
                className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-[1.015]"
                loading="lazy"
                src={imagemAtiva.url}
              />
              <OverlayGaleria atual={indiceAtivo + 1} total={imagens.length} compacto />
            </button>

            {imagens.length > 1 ? (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {imagens.map((imagem, indice) => (
                  <button
                    aria-label={`Abrir foto ${indice + 1} da hospedagem`}
                    className={cn(
                      "h-20 w-28 shrink-0 overflow-hidden rounded-2xl border transition",
                      indice === indiceAtivo
                        ? "border-cyan-300"
                        : "border-slate-700/70 opacity-75 hover:opacity-100"
                    )}
                    key={imagem.id}
                    onClick={() => {
                      setIndiceAtivo(indice);
                      setModalAberta(true);
                    }}
                    type="button"
                  >
                    <img
                      alt={obterAlt(imagem, property.name, indice)}
                      className="h-full w-full object-cover object-center"
                      loading="lazy"
                      src={imagem.url}
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      )}

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
                    {imagens.length > 1 ? (
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
                    ) : null}
                    <motion.div
                      animate={{ opacity: 1 }}
                      className="flex h-full w-full items-center justify-center px-12"
                      initial={{ opacity: 0.4 }}
                      key={imagemAtiva.id}
                    >
                      <img
                        alt={obterAlt(imagemAtiva, property.name, indiceAtivo)}
                        className="max-h-full max-w-full select-none object-contain"
                        draggable={false}
                        src={imagemAtiva.url}
                      />
                    </motion.div>
                    {imagens.length > 1 ? (
                      <Button
                        aria-label="Proxima foto"
                        className="absolute right-0 z-10 border-white/15 bg-black/35 text-white hover:bg-black/55"
                        onClick={() => navegar(1)}
                        size="icon"
                        type="button"
                        variant="outline"
                      >
                        <ChevronRight />
                      </Button>
                    ) : null}
                  </div>

                  {imagens.length > 1 ? (
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
                            alt={obterAlt(imagem, property.name, indice)}
                            className="h-full w-full object-cover"
                            src={imagem.url}
                          />
                        </button>
                      ))}
                    </div>
                  ) : null}
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body
          )
        : null}
    </>
  );
}

function GaleriaCompacta({
  imagens,
  imagensVisiveis,
  onAbrir
}: {
  imagens: PropriedadePublica["images"];
  imagensVisiveis: PropriedadePublica["images"];
  onAbrir: (indice: number) => void;
}) {
  return (
    <div className="grid grid-cols-[repeat(4,minmax(0,1fr))_160px] gap-2 max-lg:grid-cols-2">
      {imagensVisiveis.map((imagem, indice) => (
        <button
          aria-label={`Abrir foto ${indice + 1}`}
          className={cn(
            "group relative aspect-[1.45/1] overflow-hidden rounded-xl border bg-secondary",
            indice === 0 ? "border-cyan-300" : "border-slate-700/70"
          )}
          key={imagem.id}
          onClick={() => onAbrir(indice)}
          type="button"
        >
          <img
            alt={imagem.alt}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.025]"
            loading={indice === 0 ? "eager" : "lazy"}
            src={imagem.url}
          />
        </button>
      ))}

      {imagens.length > 1 ? (
        <button
          aria-label="Ver todas as fotos"
          className="grid aspect-[1.45/1] place-items-center rounded-xl border border-slate-700/70 bg-slate-900/80 text-center text-white transition hover:border-cyan-300/60 max-lg:col-span-2"
          onClick={() => onAbrir(0)}
          type="button"
        >
          <span>
            <strong className="block text-2xl">
              {imagens.length > 4 ? `+${imagens.length - 4}` : imagens.length}
            </strong>
            <span className="mt-1 block text-sm text-slate-400">Ver todas</span>
          </span>
        </button>
      ) : null}
    </div>
  );
}

function OverlayGaleria({
  atual,
  compacto = false,
  total
}: {
  atual: number;
  compacto?: boolean;
  total: number;
}) {
  return (
    <div
      className={cn(
        "absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/72 to-transparent text-white",
        compacto ? "p-3" : "p-4"
      )}
    >
      <span
        className={cn(
          "rounded-full bg-white/12 font-semibold backdrop-blur-md",
          compacto ? "px-3 py-1.5 text-xs" : "px-3 py-1.5 text-sm"
        )}
      >
        Ver todas as fotos
      </span>
      <Contador atual={atual} total={total} />
    </div>
  );
}

function ordenarImagens(imagens: PropriedadePublica["images"]) {
  return [...imagens].sort((a, b) => Number(b.isCover) - Number(a.isCover));
}

function obterImagensGaleria(property: PropriedadePublica) {
  const imagensOrdenadas = ordenarImagens(property.images);

  // A capa e usada como fallback para evitar bloco vazio grande quando o
  // proprietario ainda nao adicionou fotos extras na galeria.
  if (imagensOrdenadas.length) return imagensOrdenadas;
  return property.coverImage ? [property.coverImage] : [];
}

function obterAlt(
  imagem: PropriedadePublica["images"][number],
  nomePropriedade: string,
  indice: number
) {
  return imagem.alt || `Foto ${indice + 1} da hospedagem ${nomePropriedade}`;
}

function Contador({ atual, total }: { atual: number; total: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
      <Images className="h-3.5 w-3.5" />
      {atual}/{total}
    </span>
  );
}
