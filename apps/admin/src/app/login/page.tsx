import { redirect } from "next/navigation";

import { AuthCard } from "../../components/auth/auth-card";
import { LoginForm } from "../../components/auth/login-form";
import {
  carregarContextoAutenticacao,
  obterCaminhoInicialPorRole
} from "../../lib/auth/context";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const contexto = await carregarContextoAutenticacao();
  if (contexto) redirect(obterCaminhoInicialPorRole(contexto.role));

  const { message } = await searchParams;

  return (
    <AuthCard
      description="Acesse seu painel administrativo."
      footerHref="/cadastro"
      footerLabel="Criar conta"
      footerText="Ainda nao tem acesso?"
      message={message}
      title="Entrar no Hospedex"
    >
      <LoginForm />
    </AuthCard>
  );
}
