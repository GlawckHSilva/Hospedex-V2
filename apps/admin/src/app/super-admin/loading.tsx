import { PremiumSkeleton } from "@hospedex/ui";

export default function SuperAdminLoading() {
  return (
    <div className="space-y-5">
      <PremiumSkeleton className="h-40" />
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
        <PremiumSkeleton className="h-32" />
        <PremiumSkeleton className="h-32" />
        <PremiumSkeleton className="h-32" />
        <PremiumSkeleton className="h-32" />
      </div>
      <PremiumSkeleton className="h-80" />
    </div>
  );
}
