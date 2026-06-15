import type { ComponentProps } from "react";

import { cn } from "../../lib/utils";
import { buttonVariants, type ButtonProps } from "../ui/button";
import { Input } from "../ui/input";

/**
 * Controles com vidro leve.
 *
 * Sao wrappers visuais: nao adicionam regra de negocio, apenas elevam estados
 * de foco, hover e profundidade.
 */

export function GlassButton({
  className,
  variant = "default",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        buttonVariants({ variant, size }),
        "glass-button hover:-translate-y-0.5 active:translate-y-0",
        className
      )}
      type={type}
      {...props}
    />
  );
}

export function GlassInput({ className, ...props }: ComponentProps<typeof Input>) {
  return <Input className={cn("glass-input", className)} {...props} />;
}

export function GlassModal({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("glass-modal", className)} {...props} />;
}
