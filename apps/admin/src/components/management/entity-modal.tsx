"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import {
  type ComponentProps,
  type ReactNode,
  useEffect,
  useId,
  useState,
} from "react";

import { Button, cn } from "@hospedex/ui";

type ModalSize = "sm" | "md" | "lg" | "xl";

type EntityModalProps = {
  children: ReactNode;
  description?: string | undefined;
  disabled?: boolean | undefined;
  eyebrow?: string | undefined;
  size?: ModalSize;
  title: string;
  triggerClassName?: string | undefined;
  triggerIcon?: ReactNode | undefined;
  triggerLabel: string;
  triggerSize?: ComponentProps<typeof Button>["size"] | undefined;
  triggerVariant?: ComponentProps<typeof Button>["variant"] | undefined;
};

const sizeClass: Record<ModalSize, string> = {
  lg: "max-w-3xl",
  md: "max-w-2xl",
  sm: "max-w-md",
  xl: "max-w-5xl",
};

export function EntityModal({
  children,
  description,
  disabled,
  eyebrow,
  size = "lg",
  title,
  triggerClassName,
  triggerIcon,
  triggerLabel,
  triggerSize = "sm",
  triggerVariant = "outline",
}: EntityModalProps) {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    function fecharComEscape(evento: KeyboardEvent) {
      if (evento.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", fecharComEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", fecharComEscape);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <Button
        className={triggerClassName}
        disabled={disabled}
        onClick={() => setOpen(true)}
        size={triggerSize}
        type="button"
        variant={triggerVariant}
      >
        {triggerIcon}
        {triggerLabel}
      </Button>

      <AnimatePresence>
        {open ? (
          <motion.div
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/68 px-4 py-6 backdrop-blur-md"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            onMouseDown={() => setOpen(false)}
          >
            <motion.div
              animate={{ opacity: 1, scale: 1, y: 0 }}
              aria-labelledby={titleId}
              aria-modal="true"
              className={cn(
                "relative my-auto flex max-h-[calc(100svh-3rem)] w-full flex-col overflow-hidden rounded-2xl border border-cyan-300/20 bg-background/92 shadow-2xl shadow-cyan-950/30 ring-1 ring-white/10 dark:bg-zinc-950/92",
                sizeClass[size],
              )}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              initial={{ opacity: 0, scale: 0.98, y: 14 }}
              onMouseDown={(evento) => evento.stopPropagation()}
              role="dialog"
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              <div className="border-b bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_32%)] px-5 py-4 sm:px-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    {eyebrow ? (
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
                        {eyebrow}
                      </p>
                    ) : null}
                    <h2
                      className="mt-1 text-xl font-semibold tracking-normal"
                      id={titleId}
                    >
                      {title}
                    </h2>
                    {description ? (
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                        {description}
                      </p>
                    ) : null}
                  </div>

                  <Button
                    aria-label="Fechar modal"
                    onClick={() => setOpen(false)}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="overflow-y-auto px-5 py-5 sm:px-6">
                {children}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

export function EntityViewModal({
  children,
  description,
  disabled,
  title,
  triggerClassName,
  triggerIcon,
  triggerLabel = "Visualizar",
}: Omit<
  EntityModalProps,
  "eyebrow" | "size" | "triggerSize" | "triggerVariant"
> & {
  triggerLabel?: string;
}) {
  return (
    <EntityModal
      description={description}
      disabled={disabled}
      eyebrow="Visualização"
      size="lg"
      title={title}
      triggerClassName={triggerClassName}
      triggerIcon={triggerIcon}
      triggerLabel={triggerLabel}
      triggerVariant="outline"
    >
      {children}
    </EntityModal>
  );
}

export function ConfirmDialog({
  children,
  description,
  disabled,
  title,
  triggerClassName,
  triggerIcon,
  triggerLabel = "Excluir",
  triggerVariant = "destructive",
}: Omit<
  EntityModalProps,
  "eyebrow" | "size" | "triggerSize" | "triggerVariant"
> & {
  triggerLabel?: string;
  triggerVariant?: ComponentProps<typeof Button>["variant"];
}) {
  return (
    <EntityModal
      description={description}
      disabled={disabled}
      eyebrow="Confirmação"
      size="sm"
      title={title}
      triggerClassName={triggerClassName}
      triggerIcon={triggerIcon}
      triggerLabel={triggerLabel}
      triggerVariant={triggerVariant}
    >
      {children}
    </EntityModal>
  );
}
