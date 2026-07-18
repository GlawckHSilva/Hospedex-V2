import { PublicShell } from "../../components/layout/public-shell";
import { GuestProfileForm } from "../../components/guest/guest-profile-form";
import { GuestStateCard } from "../../components/guest/guest-state-card";
import { carregarPerfilHospede } from "../../lib/guest/data";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function PerfilPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const [resultado, parametros] = await Promise.all([
    carregarPerfilHospede(),
    searchParams
  ]);

  return (
    <PublicShell>
      <section className="mx-auto grid max-w-4xl gap-6 px-4 py-10 sm:px-6 lg:py-14">
        {resultado.estado !== "ok" ? (
          <GuestStateCard estado={resultado.estado} mensagem={resultado.mensagem} />
        ) : !resultado.dados ? (
          <GuestStateCard
            estado="erro"
            mensagem="Não foi possível carregar seu perfil."
          />
        ) : (
          <GuestProfileForm
            mensagem={obterMensagem(parametros)}
            perfil={resultado.dados}
          />
        )}
      </section>
    </PublicShell>
  );
}

function obterMensagem(parametros: Record<string, string | string[] | undefined>) {
  if (parametros.sucesso === "perfil") return "Perfil atualizado com sucesso.";
  if (parametros.erro === "avatar-formato") return "Envie uma foto JPG, PNG ou WebP valida.";
  if (parametros.erro === "avatar-tamanho") return "A foto deve ter ate 5 MB.";
  if (parametros.erro === "avatar-upload") return "Nao foi possivel enviar a foto agora.";
  if (parametros.erro === "perfil") return "Não foi possível atualizar o perfil.";
  return null;
}
