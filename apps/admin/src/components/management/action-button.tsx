"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import {
  Eye,
  Pencil,
  Plus,
  Settings,
  SlidersHorizontal,
  Trash2,
  XCircle,
} from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@hospedex/ui";

export type ActionButtonVariant =
  | "add"
  | "edit"
  | "view"
  | "delete"
  | "cancel"
  | "settings"
  | "status";

export type ActionButtonSize = "sm" | "md" | "lg" | "icon";

type ActionButtonProps = Omit<HTMLMotionProps<"button">, "children" | "size"> & {
  children: ReactNode;
  icon?: ReactNode | undefined;
  size?: ActionButtonSize | undefined;
  variant: ActionButtonVariant;
};

const iconByVariant: Record<ActionButtonVariant, ReactNode> = {
  add: <Plus />,
  cancel: <XCircle />,
  delete: <Trash2 />,
  edit: <Pencil />,
  settings: <Settings />,
  status: <SlidersHorizontal />,
  view: <Eye />,
};

const variantClass: Record<ActionButtonVariant, { fill: string; shell: string }> = {
  add: {
    fill: "bg-emerald-500",
    shell:
      "border-emerald-500/35 bg-emerald-500/8 text-emerald-700 shadow-emerald-950/10 dark:text-emerald-200",
  },
  cancel: {
    fill: "bg-rose-500",
    shell:
      "border-rose-400/35 bg-rose-500/8 text-rose-700 shadow-rose-950/10 dark:text-rose-200",
  },
  delete: {
    fill: "bg-red-600",
    shell:
      "border-red-500/35 bg-red-500/8 text-red-700 shadow-red-950/10 dark:text-red-200",
  },
  edit: {
    fill: "bg-cyan-500",
    shell:
      "border-cyan-400/35 bg-cyan-500/8 text-cyan-700 shadow-cyan-950/10 dark:text-cyan-200",
  },
  settings: {
    fill: "bg-slate-500",
    shell:
      "border-slate-500/35 bg-slate-500/8 text-slate-700 shadow-slate-950/10 dark:text-slate-200",
  },
  status: {
    fill: "bg-orange-500",
    shell:
      "border-orange-400/40 bg-orange-400/10 text-orange-700 shadow-orange-950/10 dark:text-orange-200",
  },
  view: {
    fill: "bg-cyan-500",
    shell:
      "border-cyan-400/35 bg-cyan-500/8 text-cyan-700 shadow-cyan-950/10 dark:text-cyan-200",
  },
};

const sizeClass: Record<ActionButtonSize, string> = {
  icon: "h-9 w-9 px-0",
  lg: "min-h-10 px-4 py-2 text-sm",
  md: "min-h-9 px-3.5 py-2 text-sm",
  sm: "min-h-8 px-3 py-1.5 text-xs",
};

/**
 * Botao de acao premium do Gerenciamento.
 *
 * A camada de cor cresce da esquerda para a direita no hover, mantendo texto e
 * icone acima da animacao para preservar leitura e acessibilidade.
 */
export function ActionButton({
  children,
  className,
  disabled,
  icon,
  size = "sm",
  type = "button",
  variant,
  ...props
}: ActionButtonProps) {
  const currentIcon = icon ?? iconByVariant[variant];
  const colors = variantClass[variant];

  return (
    <motion.button
      animate="rest"
      className={cn(
        "group/action-button relative isolate inline-flex shrink-0 items-center justify-center gap-2 overflow-hidden rounded-xl border font-semibold tracking-normal shadow-sm backdrop-blur-md transition-colors duration-200 hover:border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 disabled:pointer-events-none disabled:opacity-50 [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0",
        sizeClass[size],
        colors.shell,
        className,
      )}
      disabled={disabled}
      initial="rest"
      transition={{ duration: 0.18, ease: "easeOut" }}
      type={type}
      variants={{ hover: {}, rest: {} }}
      {...(!disabled
        ? {
            whileHover: "hover" as const,
            whileTap: { scale: 0.98 },
          }
        : {})}
      {...props}
    >
      <motion.span
        className={cn("absolute inset-y-0 left-0 z-0 w-full origin-left", colors.fill)}
        transition={{ duration: 0.22, ease: "easeOut" }}
        variants={{ hover: { scaleX: 1 }, rest: { scaleX: 0 } }}
      />

      <span className="relative z-10 flex min-w-0 items-center justify-center gap-2 transition-colors duration-200 group-hover/action-button:text-white">
        {size !== "icon" ? (
          <span className="min-w-0 text-center leading-tight">
            {children}
          </span>
        ) : null}
        <span className="flex items-center justify-center">{currentIcon}</span>
      </span>
    </motion.button>
  );
}
