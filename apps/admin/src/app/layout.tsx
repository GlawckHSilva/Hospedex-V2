import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";

import { AppProviders } from "@hospedex/ui";

import { ProvedorAutenticacao } from "../components/auth/auth-provider";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans"
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono"
});

export const metadata: Metadata = {
  title: "Hospedex",
  description: "Painel administrativo premium do Hospedex."
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fbff" },
    { media: "(prefers-color-scheme: dark)", color: "#111827" }
  ]
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      className={`${geistSans.variable} ${geistMono.variable}`}
      lang="pt-BR"
      suppressHydrationWarning
    >
      <body className="min-h-screen antialiased">
        <AppProviders>
          <ProvedorAutenticacao contextoInicial={null}>
            {children}
          </ProvedorAutenticacao>
        </AppProviders>
      </body>
    </html>
  );
}
