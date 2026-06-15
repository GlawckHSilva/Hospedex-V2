import { redirect } from "next/navigation";

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@hospedex/ui";

import { sairAction } from "../../lib/auth/actions";
import {
  carregarContextoAutenticacao,
  obterCaminhoInicialPorRole
} from "../../lib/auth/context";

export const dynamic = "force-dynamic";

export default async function NoAccessPage() {
  const contexto = await carregarContextoAutenticacao();
  if (!contexto) redirect("/login");
  if (contexto.role !== "guest") redirect(obterCaminhoInicialPorRole(contexto.role));

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Acesso não liberado</CardTitle>
          <CardDescription>
            Sua conta existe, mas ainda não possui tenant ou permissão administrativa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={sairAction}>
            <Button className="w-full" type="submit" variant="outline">
              Sair
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
