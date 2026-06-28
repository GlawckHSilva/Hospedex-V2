import { PublicShell } from "../../components/layout/public-shell";

export default function LoadingPerfil() {
  return (
    <PublicShell>
      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:py-14">
        <div className="h-[520px] animate-pulse rounded-2xl border bg-card/50" />
      </section>
    </PublicShell>
  );
}
