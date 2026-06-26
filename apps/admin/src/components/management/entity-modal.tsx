"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import {
  type ComponentProps,
  type ReactNode,
  useEffect,
  useId,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { Button, cn } from "@hospedex/ui";

import {
  ActionButton,
  type ActionButtonSize,
  type ActionButtonVariant,
} from "./action-button";

type ModalSize = "sm" | "md" | "lg" | "xl";

type AppModalProps = {
  children: ReactNode;
  description?: string | undefined;
  eyebrow?: string | undefined;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  size?: ModalSize;
  title: string;
};

type EntityModalProps = {
  children: ReactNode;
  description?: string | undefined;
  disabled?: boolean | undefined;
  eyebrow?: string | undefined;
  size?: ModalSize;
  title: string;
  triggerClassName?: string | undefined;
  triggerAction?: ActionButtonVariant | undefined;
  triggerIcon?: ReactNode | undefined;
  triggerLabel: string;
  triggerSize?:
    | ActionButtonSize
    | ComponentProps<typeof Button>["size"]
    | undefined;
  triggerVariant?: ComponentProps<typeof Button>["variant"] | undefined;
};

const sizeClass: Record<ModalSize, string> = {
  lg: "max-w-3xl",
  md: "max-w-2xl",
  sm: "max-w-md",
  xl: "max-w-5xl",
};

function normalizarTexto(texto: string) {
  return texto
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function inferirAcaoDoBotao(
  label: string,
  triggerVariant?: ComponentProps<typeof Button>["variant"],
): ActionButtonVariant {
  const texto = normalizarTexto(label);

  if (texto.includes("visualizar") || texto.includes("ver ")) return "view";
  if (texto.includes("cancelar")) return "cancel";
  if (texto.includes("excluir") || texto.includes("remover")) return "delete";
  if (
    texto.includes("config") ||
    texto.includes("preferencia") ||
    texto.includes("permiss") ||
    texto.includes("politica") ||
    texto.includes("senha") ||
    texto.includes("comodidade") ||
    texto.includes("servico") ||
    texto.includes("manutencao")
  ) {
    return "settings";
  }
  if (
    texto.includes("status") ||
    texto.includes("ativar") ||
    texto.includes("desativar") ||
    texto.includes("pausar") ||
    texto.includes("confirmar") ||
    texto.includes("reenviar")
  ) {
    return "status";
  }
  if (
    texto.includes("novo") ||
    texto.includes("nova") ||
    texto.includes("criar") ||
    texto.includes("adicionar") ||
    texto.includes("enviar")
  ) {
    return "add";
  }
  if (
    texto.includes("editar") ||
    texto.includes("alterar") ||
    texto.includes("responder")
  ) {
    return "edit";
  }

  if (triggerVariant === "destructive") return "delete";
  if (triggerVariant === "default") return "add";

  return "settings";
}

export function AppModal({
  children,
  description,
  eyebrow,
  onOpenChange,
  open,
  size = "lg",
  title,
}: AppModalProps) {
  const titleId = useId();
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  useEffect(() => {
    if (!open) return;

    function fecharComEscape(evento: KeyboardEvent) {
      if (evento.key === "Escape") onOpenChange(false);
    }

    const overflowAnterior = document.body.style.overflow;
    document.addEventListener("keydown", fecharComEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", fecharComEscape);
      document.body.style.overflow = overflowAnterior;
    };
  }, [onOpenChange, open]);

  const modal = (
    <AnimatePresence>
      {open ? (
        <motion.div
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[2147483647] isolate grid place-items-center overflow-y-auto overscroll-contain bg-black/72 px-4 py-6 backdrop-blur-md"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          onMouseDown={() => onOpenChange(false)}
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
            <div className="shrink-0 border-b bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_32%)] px-5 py-4 sm:px-6">
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
                  onClick={() => onOpenChange(false)}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              {children}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  if (!portalRoot) return null;

  // O Portal garante que a modal saia de cards, tabelas e containers com overflow.
  return createPortal(modal, portalRoot);
}

export function EntityModal({
  children,
  description,
  disabled,
  eyebrow,
  size = "lg",
  title,
  triggerAction,
  triggerClassName,
  triggerIcon,
  triggerLabel,
  triggerSize = "sm",
  triggerVariant = "outline",
}: EntityModalProps) {
  const [open, setOpen] = useState(false);
  const searchParams = useSearchParams();
  const sucesso = searchParams.get("sucesso");

  useEffect(() => {
    if (!sucesso) return;

    // Server Actions do Gerenciamento retornam sucesso via query string.
    // Fechar a modal neste ponto confirma visualmente a conclusao da acao
    // sem depender de reload completo da pagina atual.
    setOpen(false);
  }, [sucesso]);

  return (
    <>
      <ActionButton
        className={triggerClassName}
        disabled={disabled}
        icon={triggerIcon}
        onClick={() => setOpen(true)}
        size={triggerSize ?? "sm"}
        type="button"
        variant={triggerAction ?? inferirAcaoDoBotao(triggerLabel, triggerVariant)}
      >
        {triggerLabel}
      </ActionButton>

      <AppModal
        description={description}
        eyebrow={eyebrow}
        onOpenChange={setOpen}
        open={open}
        size={size}
        title={title}
      >
        {children}
      </AppModal>
    </>
  );
}

export function EntityViewModal({
  children,
  description,
  disabled,
  title,
  triggerAction,
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
      triggerAction={triggerAction ?? "view"}
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
  triggerAction,
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
      triggerAction={
        triggerAction ?? inferirAcaoDoBotao(triggerLabel, triggerVariant)
      }
      triggerClassName={triggerClassName}
      triggerIcon={triggerIcon}
      triggerLabel={triggerLabel}
      triggerVariant={triggerVariant}
    >
      {children}
    </EntityModal>
  );
}
