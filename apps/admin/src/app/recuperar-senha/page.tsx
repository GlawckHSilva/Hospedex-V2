import { redirect } from "next/navigation";

import { Button, Input, Label } from "@hospedex/ui";

import { AuthCard } from "../../components/auth/auth-card";
import { recuperarSenhaAction } from "../../lib/auth/actions";
import {
  carregarContextoAutenticacao,
  obterCaminhoInicialPorRole
} from "../../lib/auth/context";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const contexto = await carregarContextoAutenticacao();
  if (contexto) redirect(obterCaminhoInicialPorRole(contexto.role));

  const { message } = await searchParams;

  return (
    <AuthCard
      description="Informe seu email para receber as instruções."
      footerHref="/login"
      footerLabel="Voltar"
      footerText="Lembrou sua senha?"
      message={message}
      title="Recuperar senha"
    >
      <form action={recuperarSenhaAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input autoComplete="email" id="email" name="email" required type="email" />
        </div>
        <Button className="w-full" type="submit">
          Enviar instruções
        </Button>
      </form>
    </AuthCard>
  );
}
