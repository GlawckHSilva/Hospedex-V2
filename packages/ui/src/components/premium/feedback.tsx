import type { ComponentProps, ReactNode } from "react";

import { cn } from "../../lib/utils";
import { Badge, type BadgeProps } from "../ui/badge";
import { Skeleton } from "../ui/skeleton";

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

export type StatusBadgeProps = Omit<BadgeProps, "variant"> & {
  tone?: StatusTone;
};

const toneToVariant: Record<StatusTone, BadgeProps["variant"]> = {
  danger: "danger",
  info: "info",
  neutral: "outline",
  success: "success",
  warning: "warning"
};

/**
 * Feedback visual reutilizavel.
 *
 * Padroniza status, skeletons e estados vazios sem acoplar texto ou fluxo.
 */

export function StatusBadge({ className, tone = "neutral", ...props }: StatusBadgeProps) {
  return (
    <Badge
      className={cn("status-badge", className)}
      variant={toneToVariant[tone]}
      {...props}
    />
  );
}

export function PremiumSkeleton({ className, ...props }: ComponentProps<typeof Skeleton>) {
  return <Skeleton className={cn("premium-skeleton", className)} {...props} />;
}

export function PremiumEmptyState({
  action,
  className,
  description,
  icon,
  title,
  ...props
}: ComponentProps<"div"> & {
  action?: ReactNode;
  description: string;
  icon?: ReactNode;
  title: string;
}) {
  return (
    <div className={cn("premium-empty-state", className)} {...props}>
      {icon ? <div className="premium-empty-state__icon">{icon}</div> : null}
      <h2 className="text-xl font-semibold tracking-normal">{title}</h2>
      <p className="max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      {action ? <div>{action}</div> : null}
    </div>
  );
}
