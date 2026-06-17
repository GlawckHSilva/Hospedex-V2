"use client";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@hospedex/ui";

export default function ErrorPage({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const mensagem = obterMensagemSegura(error);

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Não foi possível carregar</CardTitle>
          <CardDescription>{mensagem}</CardDescription>
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

function obterMensagemSegura(error: Error) {
  if (error.message.includes("Body exceeded")) {
    return "A imagem enviada é maior que o limite aceito pelo Admin. Use uma imagem menor e tente novamente.";
  }

  return "Ocorreu um erro ao carregar o Admin. Tente novamente em instantes.";
}

