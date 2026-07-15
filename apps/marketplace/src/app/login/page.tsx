import { CalendarCheck2, CreditCard, ShieldCheck } from "lucide-react";

import { GuestLoginCard } from "../../components/guest/guest-auth-forms";
import { PublicShell } from "../../components/layout/public-shell";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LoginPage({
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
            aria-label="Hospede organizando a viagem pelo Hospedex"
            className="marketplace-login-visual relative isolate flex min-h-[260px] overflow-hidden rounded-[1.75rem] border border-border bg-secondary shadow-2xl shadow-cyan-950/10 dark:border-cyan-300/20 dark:shadow-black/30 sm:min-h-[340px] lg:min-h-[calc(100svh-9.5rem)]"
            role="img"
          >
            <div className="marketplace-login-photo-gradient absolute inset-0 z-10" />
            <div className="marketplace-login-intro relative z-20 flex max-w-xl flex-col justify-end p-5 sm:p-7 lg:justify-center lg:p-10">
              <p className="text-xs font-bold uppercase tracking-normal text-primary dark:text-cyan-200">
                Sua hospedagem em um so lugar
              </p>
              <h1 className="mt-4 text-3xl font-semibold leading-[1.05] text-slate-950 dark:text-white sm:text-4xl xl:text-5xl">
                Viaje com tudo{" "}
                <span className="text-primary dark:text-cyan-200">
                  organizado.
                </span>
              </h1>
              <p className="mt-4 max-w-md text-sm leading-6 text-slate-700 dark:text-slate-200 sm:text-base">
                Acompanhe reservas, pagamentos e instrucoes da sua estadia com
                seguranca e praticidade.
              </p>

              <div className="mt-6 grid gap-3 sm:max-w-lg lg:mt-8">
                <LoginHighlight
                  description="Datas, status e detalhes da hospedagem."
                  icon={CalendarCheck2}
                  title="Reservas acompanhadas"
                />
                <LoginHighlight
                  description="Valores e orientacoes em um so lugar."
                  icon={CreditCard}
                  title="Pagamentos claros"
                />
                <LoginHighlight
                  description="Acesso protegido aos dados da sua viagem."
                  icon={ShieldCheck}
                  title="Experiencia segura"
                />
              </div>
            </div>
          </div>

          <div className="marketplace-login-form-shell flex min-w-0 items-center justify-center lg:justify-end">
            <GuestLoginCard mensagem={obterMensagem(parametros)} />
          </div>
        </div>
      </section>
    </PublicShell>
  );
}

function LoginHighlight({
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

function obterMensagem(parametros: Record<string, string | string[] | undefined>) {
  if (parametros.cadastro === "sucesso") {
    return "Conta criada. Confira seu e-mail se a confirmacao estiver ativa e depois entre.";
  }

  if (parametros.cadastro === "confirmado") {
    return "E-mail confirmado. Entre para acessar suas reservas.";
  }

  if (parametros.recuperacao === "enviada") {
    return "Se existir uma conta com este e-mail, enviaremos as instrucoes de recuperacao.";
  }

  if (typeof parametros.erro === "string") return parametros.erro;
  return null;
}
