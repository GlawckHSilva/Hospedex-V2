import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-cyan-300/35 bg-primary text-primary-foreground",
        secondary: "border-border bg-secondary text-secondary-foreground",
        outline: "border-border bg-card/40 text-muted-foreground",
        success: "border-success/30 bg-success/15 text-success",
        warning: "border-warning/35 bg-warning/15 text-warning",
        danger: "border-destructive/35 bg-destructive/15 text-destructive",
        info: "border-info/35 bg-info/15 text-info"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export type BadgeProps = ComponentProps<"span"> &
  VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
