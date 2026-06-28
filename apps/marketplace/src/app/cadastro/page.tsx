import { PublicShell } from "../../components/layout/public-shell";
import { GuestSignupCard } from "../../components/guest/guest-auth-forms";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CadastroPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const parametros = await searchParams;

  return (
    <PublicShell>
      <section className="grid min-h-[78svh] place-items-center px-4 py-16 sm:px-6">
        <GuestSignupCard
          mensagem={typeof parametros.erro === "string" ? parametros.erro : null}
        />
      </section>
    </PublicShell>
  );
}
