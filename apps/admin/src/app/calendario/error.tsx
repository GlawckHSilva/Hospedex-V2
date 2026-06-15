"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button, Card, CardContent } from "@hospedex/ui";

export default function CalendarioError({
  error,
  reset
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="admin-shell-bg flex min-h-screen items-center justify-center p-5">
      <Card className="admin-glass-card max-w-xl">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <h1 className="text-lg font-semibold">Erro ao carregar calendario</h1>
          </div>
          <p className="text-sm text-muted-foreground">{error.message}</p>
          <Button onClick={reset} type="button" variant="outline">
            <RotateCcw />
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
