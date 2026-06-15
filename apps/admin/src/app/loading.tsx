import { Skeleton } from "@hospedex/ui";

export default function Loading() {
  return (
    <div className="admin-shell-bg min-h-screen">
      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[264px_1fr]">
        <Skeleton className="hidden h-[calc(100vh-2.5rem)] lg:block" />
        <div className="space-y-5">
          <Skeleton className="h-36" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-72" />
        </div>
      </div>
    </div>
  );
}
