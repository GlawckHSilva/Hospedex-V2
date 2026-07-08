"use client";

import { useState } from "react";

import { cn } from "@hospedex/ui";

import type {
  DadosModuloProprietarios,
  ProprietarioCompleto
} from "../../../lib/super-admin/proprietarios/types";
import { AbaApis, AbaIntegracoes, AbaModulos } from "./proprietario-detail-access";
import { AbaFinanceiro, AbaLogs } from "./proprietario-detail-activity";
import { AbaLicenca, AbaPerfil } from "./proprietario-detail-profile";

/** Navegacao das secoes administrativas de um proprietario. */

type AbaProprietario =
  | "perfil"
  | "licenca"
  | "modulos"
  | "integracoes"
  | "apis"
  | "financeiro"
  | "logs";

const ABAS: Array<{ id: AbaProprietario; label: string }> = [
  { id: "perfil", label: "Perfil" },
  { id: "licenca", label: "Licenca" },
  { id: "modulos", label: "Modulos" },
  { id: "integracoes", label: "Integracoes" },
  { id: "apis", label: "APIs" },
  { id: "financeiro", label: "Financeiro" },
  { id: "logs", label: "Logs" }
];

type ProprietarioDetailsProps = {
  featureFlags: DadosModuloProprietarios["featureFlags"];
  ocultarFinanceiro?: boolean;
  planFeatures: DadosModuloProprietarios["planFeatures"];
  proprietario: ProprietarioCompleto;
  retorno?: string;
};

export function ProprietarioDetails({
  featureFlags,
  ocultarFinanceiro = false,
  planFeatures,
  proprietario,
  retorno
}: ProprietarioDetailsProps) {
  const [aba, setAba] = useState<AbaProprietario>("perfil");
  const abasVisiveis = ocultarFinanceiro ? ABAS.filter((item) => item.id !== "financeiro") : ABAS;

  return (
    <div className="space-y-5">
      <div className="admin-sidebar-scrollbar flex gap-2 overflow-x-auto border-b pb-3">
        {abasVisiveis.map((item) => (
          <button
            className={cn(
              "shrink-0 cursor-pointer rounded-lg border px-3 py-2 text-sm font-medium transition",
              aba === item.id
                ? "border-cyan-400/40 bg-cyan-500/12 text-cyan-800 dark:text-cyan-100"
                : "border-transparent text-muted-foreground hover:border-cyan-400/20 hover:bg-cyan-500/8 hover:text-foreground"
            )}
            key={item.id}
            onClick={() => setAba(item.id)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>

      {aba === "perfil" ? <AbaPerfil proprietario={proprietario} /> : null}
      {aba === "licenca" ? <AbaLicenca proprietario={proprietario} /> : null}
      {aba === "modulos" ? (
        <AbaModulos
          featureFlags={featureFlags}
          planFeatures={planFeatures}
          proprietario={proprietario}
          {...(retorno ? { retorno } : {})}
        />
      ) : null}
      {aba === "integracoes" ? <AbaIntegracoes proprietario={proprietario} /> : null}
      {aba === "apis" ? <AbaApis featureFlags={featureFlags} proprietario={proprietario} /> : null}
      {aba === "financeiro" && !ocultarFinanceiro ? <AbaFinanceiro proprietario={proprietario} /> : null}
      {aba === "logs" ? <AbaLogs proprietario={proprietario} /> : null}
    </div>
  );
}
