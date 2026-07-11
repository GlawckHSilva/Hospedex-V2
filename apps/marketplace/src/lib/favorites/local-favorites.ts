export type FavoritoHospedex = {
  id: string;
  imageUrl: string | null;
  locationLabel: string;
  maxGuests: number;
  minPrice: number | null;
  name: string;
  savedAt: string;
  slug: string;
};

const CHAVE_FAVORITOS = "hospedex:marketplace:favoritos";
const EVENTO_FAVORITOS = "hospedex:favoritos-atualizados";

/**
 * Camada local de favoritos do Marketplace.
 *
 * Nesta fase o favorito e uma preferencia visual do visitante/hospede no proprio
 * navegador. A centralizacao neste arquivo permite trocar por Supabase depois
 * sem espalhar localStorage pelos componentes publicos.
 */
export function listarFavoritosHospedex() {
  if (typeof window === "undefined") return [];

  try {
    const bruto = window.localStorage.getItem(CHAVE_FAVORITOS);
    if (!bruto) return [];

    const favoritos = JSON.parse(bruto);
    if (!Array.isArray(favoritos)) return [];

    return favoritos.filter(ehFavoritoValido) as FavoritoHospedex[];
  } catch {
    return [];
  }
}

export function estaNosFavoritos(id: string) {
  return listarFavoritosHospedex().some((favorito) => favorito.id === id);
}

export function alternarFavoritoHospedex(favorito: FavoritoHospedex) {
  const favoritos = listarFavoritosHospedex();
  const jaExiste = favoritos.some((item) => item.id === favorito.id);
  const proximaLista = jaExiste
    ? favoritos.filter((item) => item.id !== favorito.id)
    : [{ ...favorito, savedAt: new Date().toISOString() }, ...favoritos];

  salvarFavoritos(proximaLista);
  avisarFavoritosAtualizados();

  return {
    favorito: !jaExiste,
    favoritos: proximaLista
  };
}

export function removerFavoritoHospedex(id: string) {
  const favoritos = listarFavoritosHospedex().filter((favorito) => favorito.id !== id);
  salvarFavoritos(favoritos);
  avisarFavoritosAtualizados();
  return favoritos;
}

export function obterEventoFavoritos() {
  return EVENTO_FAVORITOS;
}

function salvarFavoritos(favoritos: FavoritoHospedex[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CHAVE_FAVORITOS, JSON.stringify(favoritos));
}

function avisarFavoritosAtualizados() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENTO_FAVORITOS));
}

function ehFavoritoValido(valor: unknown): valor is FavoritoHospedex {
  if (!valor || typeof valor !== "object") return false;

  const favorito = valor as Partial<FavoritoHospedex>;
  return Boolean(favorito.id && favorito.slug && favorito.name);
}
