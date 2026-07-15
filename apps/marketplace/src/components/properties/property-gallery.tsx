"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Images, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Button, cn } from "@hospedex/ui";

import type { PropriedadePublica } from "../../lib/marketplace/data";
import { FavoriteButton } from "./favorite-button";
import { ShareButton } from "./share-button";

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
  property,
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
    [imagens.length],
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
          <p className="mt-4 font-semibold">Fotos em preparação</p>
          <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
            O proprietário ainda não adicionou fotos à galeria.
          </p>
        </div>
      </div>
    );
  }

  const imagemAtiva = imagens[indiceAtivo] ?? imagens[0]!;
  const miniaturasCompactas = imagens.slice(0, 4);

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
        <div className="lg:hidden">
          <button
            aria-label="Abrir galeria de fotos"
            className="group relative h-[420px] w-full overflow-hidden bg-secondary text-left shadow-2xl shadow-black/30"
            onClick={() => setModalAberta(true)}
            onTouchEnd={(evento) =>
              concluirSwipe(evento.changedTouches[0]?.clientX ?? 0)
            }
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
            {/* Mantém os controles visíveis acima da ficha mobile que sobrepõe a foto. */}
            <div className="absolute inset-x-0 bottom-14 z-10 flex items-center justify-between gap-3 px-4 text-white">
              <span className="rounded-full bg-black/58 px-3 py-1.5 text-xs font-semibold shadow-lg shadow-black/30 backdrop-blur-md">
                Ver todas as fotos
              </span>
              <Contador atual={indiceAtivo + 1} total={imagens.length} />
            </div>
          </button>
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
          <GaleriaImagemUnica
            imagemAtiva={imagemAtiva}
            imagens={imagens}
            indiceAtivo={indiceAtivo}
            navegar={navegar}
            onAbrir={() => setModalAberta(true)}
            onSelecionar={setIndiceAtivo}
            property={property}
          />

          <div className="grid gap-3 md:hidden">
            <button
              aria-label="Abrir galeria de fotos"
              className="group relative h-[420px] overflow-hidden rounded-b-none rounded-t-3xl border border-border bg-secondary text-left shadow-2xl shadow-black/20 dark:border-slate-700/70"
              onClick={() => setModalAberta(true)}
              type="button"
            >
              <img
                alt={obterAlt(imagemAtiva, property.name, indiceAtivo)}
                className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-[1.015]"
                loading="lazy"
                src={imagemAtiva.url}
              />
              <OverlayGaleria
                atual={indiceAtivo + 1}
                total={imagens.length}
                compacto
              />
            </button>

            {imagens.length > 1 ? (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {imagens.map((imagem, indice) => (
                  <button
                    aria-label={`Abrir foto ${indice + 1} da hospedagem`}
                    className={cn(
                      "h-20 w-28 shrink-0 overflow-hidden rounded-2xl border transition",
                      indice === indiceAtivo
                        ? "border-primary dark:border-cyan-300"
                        : "border-border opacity-75 hover:opacity-100 dark:border-slate-700/70",
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
                    onClick={(evento) => {
                      if (evento.target === evento.currentTarget) {
                        setModalAberta(false);
                      }
                    }}
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
                              : "border-transparent opacity-65 hover:opacity-100",
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
            document.body,
          )
        : null}
    </>
  );
}

function GaleriaCompacta({
  imagens,
  imagensVisiveis,
  onAbrir,
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
            indice === 0
              ? "border-primary dark:border-cyan-300"
              : "border-border dark:border-slate-700/70",
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
          className="grid aspect-[1.45/1] place-items-center rounded-xl border border-border bg-card text-center text-foreground transition hover:border-primary/60 dark:border-slate-700/70 dark:bg-slate-900/80 dark:text-white dark:hover:border-cyan-300/60 max-lg:col-span-2"
          onClick={() => onAbrir(0)}
          type="button"
        >
          <span>
            <strong className="block text-2xl">
              {imagens.length > 4 ? `+${imagens.length - 4}` : imagens.length}
            </strong>
            <span className="mt-1 block text-sm text-muted-foreground dark:text-slate-400">Ver todas</span>
          </span>
        </button>
      ) : null}
    </div>
  );
}

function GaleriaImagemUnica({
  imagemAtiva,
  imagens,
  indiceAtivo,
  navegar,
  onAbrir,
  onSelecionar,
  property,
}: {
  imagemAtiva: PropriedadePublica["images"][number];
  imagens: PropriedadePublica["images"];
  indiceAtivo: number;
  navegar: (direcao: -1 | 1) => void;
  onAbrir: () => void;
  onSelecionar: (indice: number) => void;
  property: PropriedadePublica;
}) {
  const temVariasFotos = imagens.length > 1;

  return (
    <div className="hidden gap-3 md:grid">
      <div className="group relative aspect-[16/7] min-h-[300px] max-h-[520px] overflow-hidden rounded-[2rem] bg-secondary shadow-2xl shadow-black/24 lg:min-h-[360px]">
        <button
          aria-label="Abrir galeria de fotos"
          className="absolute inset-0 text-left"
          onClick={onAbrir}
          type="button"
        >
          <img
            alt={obterAlt(imagemAtiva, property.name, indiceAtivo)}
            className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-[1.01]"
            fetchPriority={indiceAtivo === 0 ? "high" : undefined}
            loading={indiceAtivo === 0 ? "eager" : "lazy"}
            src={imagemAtiva.url}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/18 via-transparent to-black/58" />
        </button>

        <div className="absolute left-4 top-4 z-10 flex items-center gap-2">
          <ShareButton compact />
          <FavoriteButton property={property} />
        </div>

        {temVariasFotos ? (
          <>
            <button
              aria-label="Foto anterior"
              className="absolute left-4 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/42 text-white opacity-0 shadow-lg shadow-black/30 backdrop-blur-md transition hover:bg-black/62 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70 group-hover:opacity-100"
              onClick={() => navegar(-1)}
              type="button"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              aria-label="Proxima foto"
              className="absolute right-4 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/42 text-white opacity-0 shadow-lg shadow-black/30 backdrop-blur-md transition hover:bg-black/62 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70 group-hover:opacity-100"
              onClick={() => navegar(1)}
              type="button"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        ) : null}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-3 p-4 text-white">
          <button
            aria-label="Ver todas as fotos"
            className="pointer-events-auto rounded-full bg-black/58 px-3 py-1.5 text-sm font-semibold shadow-lg shadow-black/30 backdrop-blur-md transition hover:bg-black/72 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70"
            onClick={onAbrir}
            type="button"
          >
            Ver todas as fotos
          </button>
          <Contador atual={indiceAtivo + 1} total={imagens.length} />
        </div>
      </div>

      {temVariasFotos ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {imagens.map((imagem, indice) => (
            <button
              aria-label={`Selecionar foto ${indice + 1}`}
              className={cn(
                "h-16 w-24 shrink-0 overflow-hidden rounded-xl border transition",
                indice === indiceAtivo
                  ? "border-primary opacity-100 dark:border-cyan-300"
                  : "border-border opacity-72 hover:opacity-100 dark:border-white/10",
              )}
              key={imagem.id}
              onClick={() => onSelecionar(indice)}
              type="button"
            >
              <img
                alt={obterAlt(imagem, property.name, indice)}
                className="h-full w-full object-cover object-center"
                loading={indice === 0 ? "eager" : "lazy"}
                src={imagem.url}
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function OverlayGaleria({
  atual,
  compacto = false,
  total,
}: {
  atual: number;
  compacto?: boolean;
  total: number;
}) {
  return (
    <div
      className={cn(
        "absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/72 to-transparent text-white",
        compacto ? "p-3" : "p-4",
      )}
    >
      <span
        className={cn(
          "rounded-full bg-white/12 font-semibold backdrop-blur-md",
          compacto ? "px-3 py-1.5 text-xs" : "px-3 py-1.5 text-sm",
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
  // proprietário ainda não adicionou fotos extras na galeria.
  if (imagensOrdenadas.length) return imagensOrdenadas;
  return property.coverImage ? [property.coverImage] : [];
}

function obterAlt(
  imagem: PropriedadePublica["images"][number],
  nomePropriedade: string,
  indice: number,
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
