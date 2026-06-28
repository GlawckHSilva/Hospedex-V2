import { PublicShell } from "../../components/layout/public-shell";

export default function LoadingMinhasReservas() {
  return (
    <PublicShell>
      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-10 sm:px-6 lg:py-14">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-muted" />
        {[1, 2, 3].map((item) => (
          <div
            className="h-56 animate-pulse rounded-2xl border bg-card/50"
            key={item}
          />
        ))}
      </section>
    </PublicShell>
  );
}
