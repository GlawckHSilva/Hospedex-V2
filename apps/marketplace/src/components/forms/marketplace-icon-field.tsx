import type { ComponentType, ReactNode } from "react";

import { cn } from "@hospedex/ui";

/**
 * Campo padronizado do Marketplace com ícone.
 *
 * Centraliza espaçamento, contraste e alinhamento para evitar que cada
 * formulário ajuste ícones manualmente. O ícone é decorativo; o label continua
 * sendo a referência acessível do campo.
 */
export function MarketplaceIconField({
  children,
  className,
  helpText,
  icon: Icone,
  label,
  srOnly = false,
}: {
  children: ReactNode;
  className?: string;
  helpText?: ReactNode;
  icon: ComponentType<{ className?: string }>;
  label: string;
  srOnly?: boolean;
}) {
  return (
    <label className={cn("marketplace-form-field", className)}>
      <span className={srOnly ? "sr-only" : "marketplace-form-label"}>
        {label}
      </span>
      <span className="marketplace-icon-control">
        <Icone aria-hidden="true" className="marketplace-field-icon" />
        {children}
      </span>
      {helpText ? <span className="marketplace-form-help">{helpText}</span> : null}
    </label>
  );
}

export function MarketplacePlainField({
  children,
  className,
  helpText,
  label,
  srOnly = false,
}: {
  children: ReactNode;
  className?: string;
  helpText?: ReactNode;
  label: string;
  srOnly?: boolean;
}) {
  return (
    <label className={cn("marketplace-form-field", className)}>
      <span className={srOnly ? "sr-only" : "marketplace-form-label"}>
        {label}
      </span>
      {children}
      {helpText ? <span className="marketplace-form-help">{helpText}</span> : null}
    </label>
  );
}

export const marketplaceInputWithIconClass =
  "marketplace-reservation-control marketplace-control-with-icon";

export const marketplaceInputPlainClass =
  "marketplace-reservation-control marketplace-control-plain";

export const marketplaceSelectWithIconClass =
  "marketplace-reservation-control marketplace-control-with-icon marketplace-control-select";

export const marketplaceSelectPlainClass =
  "marketplace-reservation-control marketplace-control-plain marketplace-control-select";

export const marketplaceTextareaClass =
  "marketplace-reservation-control marketplace-control-textarea";
