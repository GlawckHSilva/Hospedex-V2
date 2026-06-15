import { GlassCard, PremiumSkeleton } from "@hospedex/ui";

export type PropertyGridSkeletonProps = {
  count?: number;
};

export function PropertyGridSkeleton({ count = 6 }: PropertyGridSkeletonProps) {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <GlassCard className="overflow-hidden" key={index}>
          <PremiumSkeleton className="aspect-[4/3] rounded-none" />
          <div className="grid gap-4 p-4">
            <div className="grid gap-2">
              <PremiumSkeleton className="h-5 w-2/3" />
              <PremiumSkeleton className="h-4 w-1/2" />
              <PremiumSkeleton className="h-4 w-full" />
            </div>
            <div className="flex gap-3 border-t pt-4">
              <PremiumSkeleton className="h-4 w-16" />
              <PremiumSkeleton className="h-4 w-20" />
              <PremiumSkeleton className="ml-auto h-4 w-24" />
            </div>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}
