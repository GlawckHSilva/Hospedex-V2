import { PremiumSkeleton, StatusBadge } from "@hospedex/ui";

import { PublicShell } from "../../components/layout/public-shell";
import { PropertyGridSkeleton } from "../../components/properties/property-grid-skeleton";

export default function PropriedadesLoading() {
  return (
    <PublicShell>
      <section className="border-b bg-[linear-gradient(135deg,var(--background),var(--secondary))]">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:py-16">
          <div className="max-w-3xl">
            <StatusBadge tone="info">Marketplace</StatusBadge>
            <PremiumSkeleton className="mt-4 h-12 w-3/4" />
            <PremiumSkeleton className="mt-4 h-5 w-2/3" />
          </div>
          <PremiumSkeleton className="h-20 rounded-lg" />
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:py-12">
        <PremiumSkeleton className="h-5 w-48" />
        <PropertyGridSkeleton />
      </section>
    </PublicShell>
  );
}
