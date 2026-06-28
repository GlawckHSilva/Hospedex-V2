import { PublicShell } from "../../../components/layout/public-shell";

export default function LoadingReservaDetalhe() {
  return (
    <PublicShell>
      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-10 sm:px-6 lg:py-14">
        <div className="h-10 w-44 animate-pulse rounded-lg bg-muted" />
        <div className="h-72 animate-pulse rounded-2xl border bg-card/50" />
        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="h-96 animate-pulse rounded-2xl border bg-card/50" />
          <div className="h-80 animate-pulse rounded-2xl border bg-card/50" />
        </div>
      </section>
    </PublicShell>
  );
}
