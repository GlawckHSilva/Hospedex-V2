import { PublicShell } from "../../components/layout/public-shell";
import { GuestLoginCard } from "../../components/guest/guest-auth-forms";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LoginPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const parametros = await searchParams;

  return (
    <PublicShell>
      <section className="grid min-h-[78svh] place-items-center px-4 py-16 sm:px-6">
        <GuestLoginCard mensagem={obterMensagem(parametros)} />
      </section>
    </PublicShell>
  );
}

function obterMensagem(parametros: Record<string, string | string[] | undefined>) {
  if (parametros.cadastro === "sucesso") {
    return "Conta criada. Confira seu e-mail se a confirmacao estiver ativa e depois entre.";
  }

  if (parametros.cadastro === "confirmado") {
    return "E-mail confirmado. Entre para acessar suas reservas.";
  }

  if (parametros.recuperacao === "enviada") {
    return "Enviamos as instruções de recuperação para o e-mail informado.";
  }

  if (typeof parametros.erro === "string") return parametros.erro;
  return null;
}
