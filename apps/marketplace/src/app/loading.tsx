import { PremiumSkeleton } from "@hospedex/ui";

import { PublicShell } from "../components/layout/public-shell";

export default function Loading() {
  return (
    <PublicShell>
      <section className="mx-auto grid min-h-[70svh] max-w-7xl content-center gap-6 px-4 py-16 sm:px-6">
        <PremiumSkeleton className="h-6 w-36" />
        <PremiumSkeleton className="h-16 w-full max-w-3xl" />
        <PremiumSkeleton className="h-20 w-full max-w-4xl rounded-lg" />
      </section>
    </PublicShell>
  );
}
