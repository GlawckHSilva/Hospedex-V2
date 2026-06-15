import Link from "next/link";
import type { ReactNode } from "react";

import { GlassCard, GradientBackground } from "@hospedex/ui";

export type AuthCardProps = {
  title: string;
  description: string;
  message?: string | undefined;
  children: ReactNode;
  footerLabel: string;
  footerHref: string;
  footerText: string;
};

export function AuthCard({
  title,
  description,
  message,
  children,
  footerLabel,
  footerHref,
  footerText
}: AuthCardProps) {
  return (
    <GradientBackground className="premium-grid-bg flex min-h-screen items-center justify-center px-4 py-10">
      <GlassCard className="w-full max-w-md p-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase text-primary">Hospedex Admin</p>
          <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
          {message ? (
            <p className="rounded-md border bg-secondary px-3 py-2 text-sm text-muted-foreground">
              {message}
            </p>
          ) : null}
        </div>
        <div className="mt-5 space-y-5">
          {children}
          <p className="text-center text-sm text-muted-foreground">
            {footerText}{" "}
            <Link className="font-semibold text-primary hover:underline" href={footerHref}>
              {footerLabel}
            </Link>
          </p>
        </div>
      </GlassCard>
    </GradientBackground>
  );
}
