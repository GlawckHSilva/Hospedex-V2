import { PremiumSkeleton } from "@hospedex/ui";

import { PublicShell } from "../../../components/layout/public-shell";

export default function PropriedadeLoading() {
  return (
    <PublicShell>
      <section className="border-b bg-[linear-gradient(135deg,var(--background),var(--secondary))]">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:py-10">
          <div className="grid gap-3 lg:grid-cols-[1.35fr_0.65fr]">
            <PremiumSkeleton className="min-h-[340px] rounded-lg lg:min-h-[520px]" />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
              <PremiumSkeleton className="min-h-[150px] rounded-lg" />
              <PremiumSkeleton className="min-h-[150px] rounded-lg" />
              <PremiumSkeleton className="min-h-[150px] rounded-lg" />
              <PremiumSkeleton className="min-h-[150px] rounded-lg" />
            </div>
          </div>
          <PremiumSkeleton className="h-12 w-3/4" />
          <PremiumSkeleton className="h-5 w-64" />
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_340px] lg:py-14">
        <div className="grid gap-8">
          <PremiumSkeleton className="h-44 rounded-lg" />
          <PremiumSkeleton className="h-40 rounded-lg" />
          <PremiumSkeleton className="h-64 rounded-lg" />
        </div>
        <PremiumSkeleton className="h-72 rounded-lg" />
      </section>
    </PublicShell>
  );
}
