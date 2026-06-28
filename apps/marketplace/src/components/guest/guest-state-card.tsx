import { AlertTriangle, LogIn, ShieldAlert } from "lucide-react";
import Link from "next/link";

import { GlassCard, PremiumEmptyState, buttonVariants, cn } from "@hospedex/ui";

import type { EstadoProtegido } from "../../lib/guest/types";

export function GuestStateCard({
  estado,
  mensagem
}: {
  estado: Exclude<EstadoProtegido, "ok">;
  mensagem: string | null;
}) {
  const semSessao = estado === "nao_autenticado";

  return (
    <GlassCard className="mx-auto max-w-xl p-6">
      <PremiumEmptyState
        action={
          semSessao ? (
            <Link className={cn(buttonVariants({ variant: "default" }))} href="/login">
              <LogIn className="h-4 w-4" />
              Entrar
            </Link>
          ) : null
        }
        description={
          mensagem ??
          (semSessao
            ? "Entre para visualizar suas reservas."
            : "Nao foi possivel liberar o acesso para esta conta.")
        }
        icon={
          semSessao ? (
            <LogIn className="h-5 w-5" />
          ) : estado === "sem_permissao" ? (
            <ShieldAlert className="h-5 w-5" />
          ) : (
            <AlertTriangle className="h-5 w-5" />
          )
        }
        title={
          semSessao
            ? "Sessao necessaria"
            : estado === "sem_permissao"
              ? "Sem permissao"
              : "Erro ao carregar"
        }
      />
    </GlassCard>
  );
}
