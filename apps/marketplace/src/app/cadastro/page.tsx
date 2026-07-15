import { CalendarCheck2, ShieldCheck, UserRound } from "lucide-react";

import { GuestSignupCard } from "../../components/guest/guest-auth-forms";
import { PublicShell } from "../../components/layout/public-shell";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CadastroPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const parametros = await searchParams;

  return (
    <PublicShell>
      <section className="marketplace-login-scene relative isolate overflow-hidden border-y border-border/70">
        <div className="mx-auto grid min-h-[calc(100svh-4.5rem)] max-w-7xl gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.72fr)] lg:items-stretch lg:px-8 lg:py-10">
          <div
            aria-label="Hospede criando conta para acompanhar viagens no Hospedex"
            className="marketplace-login-visual relative isolate flex min-h-[260px] overflow-hidden rounded-[1.75rem] border border-border bg-secondary shadow-2xl shadow-cyan-950/10 dark:border-cyan-300/20 dark:shadow-black/30 sm:min-h-[340px] lg:min-h-[calc(100svh-9.5rem)]"
            role="img"
          >
            <div className="marketplace-login-photo-gradient absolute inset-0 z-10" />
            <div className="marketplace-login-intro relative z-20 flex max-w-xl flex-col justify-end p-5 sm:p-7 lg:justify-center lg:p-10">
              <p className="text-xs font-bold uppercase tracking-normal text-primary dark:text-cyan-200">
                Area do Hospede
              </p>
              <h1 className="mt-4 text-3xl font-semibold leading-[1.05] text-slate-950 dark:text-white sm:text-4xl xl:text-5xl">
                Crie sua conta para{" "}
                <span className="text-primary dark:text-cyan-200">
                  acompanhar tudo.
                </span>
              </h1>
              <p className="mt-4 max-w-md text-sm leading-6 text-slate-700 dark:text-slate-200 sm:text-base">
                Use o mesmo e-mail da sua solicitacao para vincular reservas,
                pagamentos e instrucoes de viagem.
              </p>

              <div className="mt-6 grid gap-3 sm:max-w-lg lg:mt-8">
                <CadastroHighlight
                  description="Suas reservas aparecem vinculadas ao seu e-mail."
                  icon={CalendarCheck2}
                  title="Reservas conectadas"
                />
                <CadastroHighlight
                  description="Nome, telefone e dados basicos em um unico perfil."
                  icon={UserRound}
                  title="Perfil simples"
                />
                <CadastroHighlight
                  description="Acesso protegido para acompanhar a sua estadia."
                  icon={ShieldCheck}
                  title="Conta segura"
                />
              </div>
            </div>
          </div>

          <div className="marketplace-login-form-shell flex min-w-0 items-center justify-center lg:justify-end">
            <GuestSignupCard
              mensagem={typeof parametros.erro === "string" ? parametros.erro : null}
            />
          </div>
        </div>
      </section>
    </PublicShell>
  );
}

function CadastroHighlight({
  description,
  icon: Icone,
  title,
}: {
  description: string;
  icon: typeof CalendarCheck2;
  title: string;
}) {
  return (
    <div className="flex max-w-md items-center gap-3 rounded-2xl border border-white/45 bg-white/62 p-3 shadow-sm backdrop-blur-md dark:border-cyan-300/14 dark:bg-slate-950/44">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-primary dark:bg-cyan-300/10 dark:text-cyan-200">
        <Icone className="h-4 w-4" />
      </span>
      <div>
        <h2 className="text-sm font-semibold text-slate-950 dark:text-white">
          {title}
        </h2>
        <p className="mt-0.5 text-xs leading-5 text-slate-700 dark:text-slate-300">
          {description}
        </p>
      </div>
    </div>
  );
}
