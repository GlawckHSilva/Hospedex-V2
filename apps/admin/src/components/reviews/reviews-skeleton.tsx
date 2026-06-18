import { Skeleton } from "@hospedex/ui";

export function ReviewsSkeleton() {
  return (
    <div className="admin-shell-bg min-h-screen p-5">
      <div className="mx-auto max-w-7xl space-y-5">
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-52 rounded-lg" />
        <Skeleton className="h-28 rounded-lg" />
        <Skeleton className="h-72 rounded-lg" />
      </div>
    </div>
  );
}
