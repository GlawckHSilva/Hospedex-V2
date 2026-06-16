"use client";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@hospedex/ui";

/**
 * Diagnostico visual do Super Admin.
 *
 * Esta tela evita falha silenciosa quando sessao, profile, RLS ou variaveis de
 * ambiente impedem o carregamento do painel global.
 */
export default function SuperAdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Falha ao carregar Super Admin</CardTitle>
          <CardDescription>
            Verifique sessao, profile super_admin, permissoes RLS e variaveis
            Supabase.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="rounded-md border bg-secondary px-3 py-2 text-sm text-muted-foreground">
            {error.message || "Erro desconhecido ao carregar painel global."}
          </p>
          <Button onClick={reset} type="button">
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
