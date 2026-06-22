import { AlertTriangle, LogOut } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@hospedex/ui";

import { sairAction } from "../../lib/auth/actions";
import { ActionButton } from "../management/action-button";

export type SuperAdminDiagnosticProps = {
  detalhe?: string;
  titulo: string;
};

/**
 * Diagnostico de falha do Super Admin.
 *
 * Evita loading infinito quando sessao, profile, role, RLS ou consultas globais
 * falham antes do painel conseguir montar.
 */
export function SuperAdminDiagnostic({ detalhe, titulo }: SuperAdminDiagnosticProps) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border bg-destructive/10 text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <CardTitle>{titulo}</CardTitle>
          <CardDescription>
            O painel global nao conseguiu carregar com seguranca. A tela foi interrompida
            para evitar carregamento infinito.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="rounded-md border bg-secondary px-3 py-2 text-sm text-muted-foreground">
            {detalhe ?? "Erro ao carregar dados do Super Admin."}
          </p>
          <form action={sairAction}>
            <ActionButton className="w-full" icon={<LogOut />} type="submit" variant="cancel">
              Sair e entrar novamente
            </ActionButton>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
