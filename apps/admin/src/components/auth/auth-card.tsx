import Link from "next/link";
import type { ReactNode } from "react";

import { HospedexBrand } from "../brand/hospedex-brand";

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
    <main className="auth-premium-bg min-h-screen overflow-hidden text-white">
      <div className="auth-grid-layer" aria-hidden="true" />
      <div className="relative z-10 grid min-h-screen lg:grid-cols-[1.08fr_0.92fr]">
        <section className="hidden min-h-screen flex-col justify-between border-r border-cyan-300/10 px-10 py-10 lg:flex xl:px-14">
          <HospedexBrand priority size="md" />

          <div className="max-w-3xl">
            <p className="mb-8 text-xs font-bold uppercase tracking-[0.28em] text-cyan-300">
              Operacao conectada. Hospedagem mais forte.
            </p>
            <h2 className="max-w-4xl text-6xl font-black leading-[0.95] tracking-normal text-slate-50 xl:text-7xl">
              Gerencie, acompanhe e{" "}
              <span className="text-cyan-400">hospede melhor.</span>
            </h2>
            <p className="mt-8 max-w-xl text-base leading-7 text-slate-300">
              O painel Hospedex conecta reservas, casas, hospedes e operacao em
              um so lugar.
            </p>
          </div>

          <div className="auth-visual-signal" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
          <div className="auth-login-card w-full max-w-md p-6 sm:p-8">
            <div className="mb-8 lg:hidden">
              <HospedexBrand priority size="md" />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">
                Bem-vindo
              </p>
              <h1 className="text-3xl font-bold tracking-normal text-white">{title}</h1>
              <p className="text-sm text-slate-400">{description}</p>
              {message ? (
                <p className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-sm text-cyan-50">
                  {message}
                </p>
              ) : null}
            </div>
            <div className="mt-7 space-y-6">
              {children}
              <p className="text-center text-sm text-slate-400">
                {footerText}{" "}
                <Link
                  className="font-semibold text-cyan-300 transition hover:text-cyan-100 hover:underline"
                  href={footerHref}
                >
                  {footerLabel}
                </Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
