"use client";

import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@hospedex/ui";

import {
  ActionButton,
  type ActionButtonSize,
  type ActionButtonVariant,
} from "./action-button";

/**
 * Botao de submit com estado pendente real do formulario.
 *
 * Usado em Server Actions para impedir duplo clique e deixar claro qual acao
 * esta em andamento sem duplicar estado local em cada modal.
 */
export function FormActionButton({
  children,
  disabled,
  icon,
  pendingLabel,
  size = "md",
  variant,
}: {
  children: ReactNode;
  disabled?: boolean;
  icon?: ReactNode;
  pendingLabel: string;
  size?: ActionButtonSize;
  variant: ActionButtonVariant;
}) {
  const { pending } = useFormStatus();

  return (
    <ActionButton
      disabled={disabled || pending}
      icon={pending ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      size={size}
      type="submit"
      variant={variant}
    >
      {pending ? pendingLabel : children}
    </ActionButton>
  );
}

export function FormSubmitButton({
  children,
  disabled,
  pendingLabel,
  size = "sm",
  variant = "outline",
}: {
  children: ReactNode;
  disabled?: boolean;
  pendingLabel: string;
  size?: "sm" | "md" | "lg" | "icon";
  variant?: "default" | "outline" | "destructive" | "ghost";
}) {
  const { pending } = useFormStatus();

  return (
    <Button disabled={disabled || pending} size={size} type="submit" variant={variant}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {pending ? pendingLabel : children}
    </Button>
  );
}
