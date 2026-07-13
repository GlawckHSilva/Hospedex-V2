"use client";

import { ArrowRight, HeartOff, MapPin, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { GlassCard } from "@hospedex/ui";

import {
  listarFavoritosHospedex,
  obterEventoFavoritos,
  removerFavoritoHospedex,
  type FavoritoHospedex,
} from "../../lib/favorites/local-favorites";

/**
 * Lista publica de favoritos do visitante/hospede.
 *
 * Usa armazenamento local nesta fase para manter o recurso simples e sem RLS
 * nova. A rota ja fica pronta para futura sincronizacao com a conta do hospede.
 */
export function FavoritesList() {
  const [favoritos, setFavoritos] = useState<FavoritoHospedex[]>([]);

  useEffect(() => {
    function atualizarFavoritos() {
      setFavoritos(listarFavoritosHospedex());
    }

    atualizarFavoritos();
    window.addEventListener(obterEventoFavoritos(), atualizarFavoritos);
    return () =>
      window.removeEventListener(obterEventoFavoritos(), atualizarFavoritos);
  }, []);

  function removerFavorito(id: string) {
    setFavoritos(removerFavoritoHospedex(id));
  }

  if (!favoritos.length) {
    return (
      <GlassCard className="mx-auto max-w-2xl border-border bg-card/88 p-6 text-center shadow-2xl shadow-cyan-950/10 dark:border-slate-700/55 dark:bg-slate-950/72 dark:shadow-black/20">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-rose-500/12 text-rose-200">
          <HeartOff className="h-5 w-5" />
        </span>
        <h1 className="mt-4 text-2xl font-semibold text-foreground">
          Nenhum favorito salvo
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Toque no coracao de uma hospedagem para salvar aqui e comparar depois.
        </p>
        <Link
          className="mt-5 inline-flex h-10 items-center justify-center rounded-xl bg-cyan-400 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
          href="/propriedades"
        >
          Ver hospedagens
        </Link>
      </GlassCard>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <span className="rounded-full border border-rose-300/25 bg-rose-500/12 px-3 py-1 text-xs font-semibold uppercase tracking-normal text-rose-200">
          Favoritos
        </span>
        <h1 className="mt-3 text-3xl font-semibold text-foreground">
          Hospedagens salvas
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Favoritos deste navegador. Entre na hospedagem para solicitar datas e
          falar com o anfitriao.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {favoritos.map((favorito) => (
          <GlassCard
            className="overflow-hidden border-border bg-card/88 shadow-2xl shadow-cyan-950/10 dark:border-slate-700/55 dark:bg-slate-950/72 dark:shadow-black/20"
            key={favorito.id}
          >
            <div className="aspect-[16/10] overflow-hidden bg-slate-900">
              {favorito.imageUrl ? (
                <img
                  alt={`Foto de ${favorito.name}`}
                  className="h-full w-full object-cover"
                  src={favorito.imageUrl}
                />
              ) : (
                <div className="grid h-full place-items-center text-sm text-slate-500">
                  Sem foto
                </div>
              )}
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold text-foreground">
                    {favorito.name}
                  </h2>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    <span className="truncate">{favorito.locationLabel}</span>
                  </p>
                </div>
                <button
                  aria-label="Remover dos favoritos"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-rose-300/25 bg-rose-500/10 text-rose-200 transition hover:bg-rose-500/18"
                  onClick={() => removerFavorito(favorito.id)}
                  type="button"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-2.5 py-1">
                  <Users className="h-3.5 w-3.5 text-primary" />
                  {favorito.maxGuests} hospede
                  {favorito.maxGuests === 1 ? "" : "s"}
                </span>
                <span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-2.5 py-1 text-amber-100">
                  {formatarPreco(favorito.minPrice)}
                </span>
              </div>

              <Link
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                href={`/propriedades/${favorito.slug}`}
              >
                Ver hospedagem
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

function formatarPreco(valor: number | null) {
  if (!valor) return "Sob consulta";

  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(valor);
}
