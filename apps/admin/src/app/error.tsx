"use client";

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@hospedex/ui";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Não foi possível carregar</CardTitle>
          <CardDescription>
            Ocorreu um erro ao carregar o Admin. Tente novamente em instantes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" onClick={reset} type="button">
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
