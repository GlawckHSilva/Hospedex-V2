import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "../../lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/80 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border border-cyan-300/35 bg-primary text-primary-foreground shadow-sm shadow-cyan-950/20 hover:bg-cyan-300 dark:hover:bg-cyan-200",
        secondary:
          "border border-border bg-secondary text-secondary-foreground shadow-sm hover:border-cyan-400/35 hover:bg-cyan-500/10",
        outline:
          "border border-border bg-card/65 text-foreground shadow-sm hover:border-cyan-400/45 hover:bg-cyan-500/10 hover:text-cyan-100",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        destructive:
          "border border-red-400/30 bg-destructive text-white shadow-sm hover:bg-red-500"
      },
      size: {
        sm: "h-8 px-3",
        md: "h-10 px-4",
        lg: "h-11 px-5",
        icon: "h-10 w-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md"
    }
  }
);

export type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants>;

export function Button({
  className,
  variant,
  size,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      type={type}
      {...props}
    />
  );
}
