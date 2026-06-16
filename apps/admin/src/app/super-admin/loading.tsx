import { PremiumSkeleton } from "@hospedex/ui";

export default function SuperAdminLoading() {
  return (
    <div className="space-y-5">
      <div className="rounded-lg border bg-background/70 p-4 text-sm text-muted-foreground">
        Carregando sessao, role e dados globais do Super Admin.
      </div>
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
