"use client";

import { motion } from "framer-motion";
import { Children, type ReactNode } from "react";

import { Card, CardContent, Skeleton, cn } from "@hospedex/ui";

type EntityCardProps = {
  children: ReactNode;
  className?: string | undefined;
  contentClassName?: string | undefined;
  media?: ReactNode | undefined;
};

type EntityCardHeaderProps = {
  actions?: ReactNode | undefined;
  badges?: ReactNode | undefined;
  icon?: ReactNode | undefined;
  subtitle?: ReactNode | undefined;
  title: ReactNode;
};

type EntityGridProps = {
  children: ReactNode;
  className?: string | undefined;
};

type EmptyStateProps = {
  action?: ReactNode | undefined;
  description: string;
  icon?: ReactNode | undefined;
  title: string;
};

/**
 * Componentes visuais base do Gerenciamento.
 *
 * O grid limita a interface a cards compactos, com no maximo tres colunas em
 * telas grandes, preservando leitura em tablet e mobile.
 */
export function EntityGrid({ children, className }: EntityGridProps) {
  const totalItens = Children.count(children);
  const colunasResponsivas =
    totalItens <= 1
      ? "grid-cols-1"
      : totalItens === 2
        ? "grid-cols-1 sm:grid-cols-2"
        : "grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3";

  return (
    <section
      className={cn(
        "grid auto-rows-fr gap-4",
        colunasResponsivas,
        className,
      )}
    >
      {children}
    </section>
  );
}

export function EntityCard({
  children,
  className,
  contentClassName,
  media,
}: EntityCardProps) {
  return (
    <motion.article
      className="h-full min-w-0"
      initial={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      viewport={{ once: true, margin: "-32px" }}
      whileHover={{ y: -2 }}
      whileInView={{ opacity: 1, y: 0 }}
    >
      <Card
        className={cn(
          "admin-glass-card group h-full overflow-hidden transition duration-200 hover:border-cyan-300/40 hover:shadow-xl hover:shadow-cyan-950/10",
          className,
        )}
      >
        {media}
        <CardContent
          className={cn("flex h-full flex-col gap-4 p-4 sm:p-5", contentClassName)}
        >
          {children}
        </CardContent>
      </Card>
    </motion.article>
  );
}

export function EntityCardHeader({
  actions,
  badges,
  icon,
  subtitle,
  title,
}: EntityCardHeaderProps) {
  return (
    <header className="flex min-w-0 items-start justify-between gap-3">
      <div className="min-w-0">
        {badges ? <div className="mb-2 flex flex-wrap gap-2">{badges}</div> : null}
        <div className="flex min-w-0 items-center gap-2">
          {icon ? (
            <span className="shrink-0 text-primary [&_svg]:h-4 [&_svg]:w-4">
              {icon}
            </span>
          ) : null}
          <h2 className="min-w-0 truncate text-base font-semibold tracking-normal">
            {title}
          </h2>
        </div>
        {subtitle ? (
          <p className="mt-1 min-w-0 truncate text-sm text-muted-foreground">
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </header>
  );
}

export function EntityCardActions({ children }: { children: ReactNode }) {
  const totalAcoes = Children.count(children);

  return (
    <div
      className={cn(
        "mt-auto grid gap-2 [&>button]:w-full [&>button]:justify-center",
        totalAcoes <= 1 ? "grid-cols-1" : "grid-cols-2",
      )}
    >
      {children}
    </div>
  );
}

export function EmptyState({
  action,
  description,
  icon,
  title,
}: EmptyStateProps) {
  return (
    <div className="admin-glass-card grid min-h-52 place-items-center rounded-xl border border-dashed p-8 text-center">
      <div>
        {icon ? (
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-300/25 bg-cyan-500/10 text-cyan-700 dark:text-cyan-200 [&_svg]:h-5 [&_svg]:w-5">
            {icon}
          </div>
        ) : null}
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          {description}
        </p>
        {action ? <div className="mt-4">{action}</div> : null}
      </div>
    </div>
  );
}

export function SkeletonCard({ withMedia = false }: { withMedia?: boolean }) {
  return (
    <Card className="admin-glass-card overflow-hidden">
      {withMedia ? <Skeleton className="h-36 rounded-none" /> : null}
      <CardContent className="space-y-4 p-5">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
        <Skeleton className="h-9 w-full" />
      </CardContent>
    </Card>
  );
}
