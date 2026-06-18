"use client";

import { AnimatePresence, motion, type HTMLMotionProps } from "framer-motion";
import {
  Check,
  Eye,
  Pencil,
  Plus,
  Settings,
  ShieldCheck,
  Trash2,
  Wrench,
  XCircle,
} from "lucide-react";
import {
  type ReactNode,
  useEffect,
  useState,
} from "react";

import { cn } from "@hospedex/ui";

export type ActionButtonVariant =
  | "add"
  | "edit"
  | "view"
  | "delete"
  | "settings"
  | "status"
  | "service"
  | "cancel";

export type ActionButtonSize = "sm" | "md" | "lg" | "icon";

type ActionButtonProps = Omit<HTMLMotionProps<"button">, "children" | "size"> & {
  children: ReactNode;
  icon?: ReactNode | undefined;
  size?: ActionButtonSize | undefined;
  success?: boolean | undefined;
  successKey?: number | string | undefined;
  variant: ActionButtonVariant;
};

const iconByVariant: Record<ActionButtonVariant, ReactNode> = {
  add: <Plus />,
  cancel: <XCircle />,
  delete: <Trash2 />,
  edit: <Pencil />,
  service: <Wrench />,
  settings: <Settings />,
  status: <ShieldCheck />,
  view: <Eye />,
};

const variantClass: Record<ActionButtonVariant, string> = {
  add: "border-emerald-400/35 bg-emerald-500/10 text-emerald-700 shadow-emerald-950/10 hover:border-emerald-300/60 hover:bg-emerald-500/18 dark:text-emerald-200",
  cancel:
    "border-rose-300/35 bg-rose-500/8 text-rose-700 shadow-rose-950/10 hover:border-rose-300/55 hover:bg-rose-500/14 dark:text-rose-200",
  delete:
    "border-red-400/35 bg-red-500/10 text-red-700 shadow-red-950/10 hover:border-red-300/60 hover:bg-red-500/18 dark:text-red-200",
  edit: "border-cyan-400/35 bg-cyan-500/10 text-cyan-700 shadow-cyan-950/10 hover:border-cyan-300/60 hover:bg-cyan-500/18 dark:text-cyan-200",
  service:
    "border-blue-950/20 bg-blue-950/8 text-blue-950 shadow-blue-950/10 hover:border-blue-900/35 hover:bg-blue-950/14 dark:border-blue-300/25 dark:text-blue-200",
  settings:
    "border-violet-400/35 bg-violet-500/10 text-violet-700 shadow-violet-950/10 hover:border-violet-300/60 hover:bg-violet-500/18 dark:text-violet-200",
  status:
    "border-amber-400/40 bg-amber-400/12 text-amber-700 shadow-amber-950/10 hover:border-amber-300/65 hover:bg-amber-400/20 dark:text-amber-200",
  view: "border-blue-400/35 bg-blue-500/10 text-blue-700 shadow-blue-950/10 hover:border-blue-300/60 hover:bg-blue-500/18 dark:text-blue-200",
};

const sizeClass: Record<ActionButtonSize, string> = {
  icon: "h-9 w-9 px-0",
  lg: "h-10 px-4 text-sm",
  md: "h-9 px-3.5 text-sm",
  sm: "h-8 px-3 text-xs",
};

const labelVariants = {
  hover: { opacity: 0, x: -8 },
  rest: { opacity: 1, x: 0 },
};

const iconVariants = {
  hover: { scale: 1.18 },
  rest: { scale: 1 },
};

/**
 * Botao de acao premium do Gerenciamento.
 *
 * O estado de sucesso e opt-in para preservar as regras de negocio existentes:
 * quem conhece o retorno da acao pode informar success ou successKey.
 */
export function ActionButton({
  children,
  className,
  disabled,
  icon,
  size = "sm",
  success,
  successKey,
  type = "button",
  variant,
  ...props
}: ActionButtonProps) {
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!success && successKey === undefined) return;

    setShowSuccess(true);
    const timeout = window.setTimeout(() => setShowSuccess(false), 900);

    return () => window.clearTimeout(timeout);
  }, [success, successKey]);

  const currentIcon = showSuccess ? <Check /> : (icon ?? iconByVariant[variant]);

  return (
    <motion.button
      animate="rest"
      className={cn(
        "group/action-button inline-flex shrink-0 items-center justify-center gap-2 overflow-hidden rounded-xl border font-semibold tracking-normal shadow-sm backdrop-blur-md transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 disabled:pointer-events-none disabled:opacity-50 [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0",
        sizeClass[size],
        variantClass[variant],
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
      {size !== "icon" ? (
        <motion.span
          className="min-w-0 truncate"
          transition={{ duration: 0.16, ease: "easeOut" }}
          variants={labelVariants}
        >
          {children}
        </motion.span>
      ) : null}

      <motion.span
        className="flex items-center justify-center"
        transition={{ duration: 0.16, ease: "easeOut" }}
        variants={iconVariants}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            className="flex items-center justify-center"
            key={showSuccess ? "success" : variant}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: -18, scale: 0.82 }}
            initial={{ opacity: 0, rotate: 18, scale: 0.82 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
          >
            {currentIcon}
          </motion.span>
        </AnimatePresence>
      </motion.span>
    </motion.button>
  );
}
