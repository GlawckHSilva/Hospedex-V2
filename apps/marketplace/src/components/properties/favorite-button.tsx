"use client";

import { Heart } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@hospedex/ui";

import {
  alternarFavoritoHospedex,
  estaNosFavoritos,
  type FavoritoHospedex
} from "../../lib/favorites/local-favorites";
import type { PropriedadePublica } from "../../lib/marketplace/data";

type FavoriteButtonProps = {
  property: Pick<
    PropriedadePublica,
    "coverImage" | "id" | "locationLabel" | "maxGuests" | "minPrice" | "name" | "slug"
  >;
};

/**
 * Botao de favorito da pagina publica.
 *
 * Mantem o feedback imediato no cliente e grava o favorito localmente para o
 * visitante nao perder a selecao ao navegar pelo Marketplace.
 */
export function FavoriteButton({ property }: FavoriteButtonProps) {
  const [favorito, setFavorito] = useState(false);
  const [animando, setAnimando] = useState(false);

  const itemFavorito = useMemo<FavoritoHospedex>(
    () => ({
      id: property.id,
      imageUrl: property.coverImage?.url ?? null,
      locationLabel: property.locationLabel,
      maxGuests: property.maxGuests,
      minPrice: property.minPrice,
      name: property.name,
      savedAt: new Date().toISOString(),
      slug: property.slug
    }),
    [property]
  );

  useEffect(() => {
    setFavorito(estaNosFavoritos(property.id));
  }, [property.id]);

  function alternarFavorito() {
    const resultado = alternarFavoritoHospedex(itemFavorito);
    setFavorito(resultado.favorito);
    setAnimando(true);
    window.setTimeout(() => setAnimando(false), 460);
  }

  return (
    <button
      aria-label={favorito ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      aria-pressed={favorito}
      className={cn(
        "relative grid h-9 w-9 shrink-0 place-items-center overflow-visible rounded-xl border backdrop-blur-xl transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/70 sm:h-10 sm:w-10",
        favorito
          ? "border-rose-300/70 bg-rose-500/20 text-rose-100 shadow-lg shadow-rose-500/20 hover:bg-rose-500/25"
          : "border-white/15 bg-black/36 text-white hover:border-rose-300/55 hover:text-rose-200",
        animando ? "hospedex-favorite-pop" : ""
      )}
      onClick={alternarFavorito}
      title={favorito ? "Remover dos favoritos" : "Salvar hospedagem"}
      type="button"
    >
      <Heart
        className={cn(
          "h-4 w-4 transition sm:h-5 sm:w-5",
          favorito ? "fill-rose-400 text-rose-300" : ""
        )}
      />
      {animando && favorito ? (
        <span className="hospedex-favorite-burst" aria-hidden="true" />
      ) : null}
    </button>
  );
}
