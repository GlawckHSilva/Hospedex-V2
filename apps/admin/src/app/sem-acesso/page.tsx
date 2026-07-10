import { redirect } from "next/navigation";
import Link from "next/link";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  buttonVariants,
  cn,
} from "@hospedex/ui";

import { sairAction } from "../../lib/auth/actions";
import {
  carregarContextoAutenticacao,
  obterCaminhoInicialPorRole,
} from "../../lib/auth/context";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ motivo?: string }>;
};

const MENSAGENS: Record<string, string> = {
  "perfil-nao-encontrado": "Perfil nao encontrado para este usuario.",
  "feature-flag-desabilitada":
    "Este modulo nao faz parte do seu plano atual. Fale com o suporte ou altere seu plano para liberar o acesso.",
  "permissao-insuficiente": "Permissao insuficiente para acessar esta area.",
  "role-nao-vinculada":
    "Role nao vinculada ou tenant operacional nao encontrado.",
  "tenant-nao-encontrado": "Tenant nao encontrado para esta conta.",
};

export default async function NoAccessPage({ searchParams }: PageProps) {
  const { motivo } = await searchParams;
  const contexto = await carregarContextoAutenticacao();
  if (!contexto) redirect("/login?message=Falha ao carregar sessao.");
  if (!motivo && contexto.role !== "guest")
    redirect(obterCaminhoInicialPorRole(contexto.role));
  const mensagem =
    motivo && MENSAGENS[motivo]
      ? MENSAGENS[motivo]
      : "Sua conta existe, mas ainda nao possui tenant ou permissao administrativa.";
  const recursoIndisponivel = motivo === "feature-flag-desabilitada";

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {recursoIndisponivel ? "Recurso indisponivel no seu plano" : "Acesso não liberado"}
          </CardTitle>
          <CardDescription>{mensagem}</CardDescription>
        </CardHeader>
        <CardContent>
          {recursoIndisponivel ? (
            <Link
              className={cn(buttonVariants(), "mb-3 w-full")}
              href="/"
            >
              Voltar para o Dashboard
            </Link>
          ) : null}
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
