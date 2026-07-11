import { PublicShell } from "../../components/layout/public-shell";
import { FavoritesList } from "../../components/favorites/favorites-list";

export default function FavoritosPage() {
  return (
    <PublicShell>
      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <FavoritesList />
      </section>
    </PublicShell>
  );
}
