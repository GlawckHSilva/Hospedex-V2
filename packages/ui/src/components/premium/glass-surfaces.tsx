import type { ComponentProps } from "react";

import { cn } from "../../lib/utils";

/**
 * Superficies premium compartilhadas.
 *
 * Mantem vidro, grade sutil e bordas consistentes sem duplicar classes entre
 * marketplace, painel do proprietario e super admin.
 */

export function GradientBackground({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("gradient-background", className)} {...props} />;
}

export function GlassCard({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("glass-card", className)} {...props} />;
}

export function GlassPanel({ className, ...props }: ComponentProps<"section">) {
  return <section className={cn("glass-panel", className)} {...props} />;
}

export function GlassSidebar({ className, ...props }: ComponentProps<"aside">) {
  return <aside className={cn("glass-sidebar", className)} {...props} />;
}

export function GlassNavbar({ className, ...props }: ComponentProps<"header">) {
  return <header className={cn("glass-navbar", className)} {...props} />;
}

export function GlassTable({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("glass-table", className)} {...props} />;
}
