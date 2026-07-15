import { CalendarCheck2, CreditCard, ShieldCheck } from "lucide-react";

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
      <section className="marketplace-login-scene relative isolate overflow-hidden border-y border-border/70">
        <span aria-hidden="true" className="marketplace-login-beam marketplace-login-beam-one" />
        <span aria-hidden="true" className="marketplace-login-beam marketplace-login-beam-two" />

        <div className="relative z-10 mx-auto grid min-h-[calc(100svh-4.5rem)] max-w-7xl items-center gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:py-16">
          <div className="marketplace-login-intro hidden max-w-2xl lg:block">
            <p className="text-xs font-bold uppercase tracking-normal text-primary dark:text-cyan-300">
              Sua hospedagem em um só lugar
            </p>
            <h1 className="mt-5 text-5xl font-semibold leading-[1.05] text-foreground dark:text-white xl:text-6xl">
              Viaje com tudo{" "}
              <span className="text-primary dark:text-cyan-300">organizado.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground dark:text-slate-300">
              Acompanhe reservas, pagamentos e instruções da sua estadia com
              segurança e praticidade.
            </p>

            <div className="mt-10 grid gap-5">
              <LoginHighlight
                description="Consulte datas, status e detalhes da hospedagem."
                icon={CalendarCheck2}
                title="Reservas acompanhadas"
              />
              <LoginHighlight
                description="Visualize valores e orientações de pagamento."
                icon={CreditCard}
                title="Informações organizadas"
              />
              <LoginHighlight
                description="Acesso protegido aos dados da sua viagem."
                icon={ShieldCheck}
                title="Experiência segura"
              />
            </div>
          </div>

          <div className="marketplace-login-form-shell flex min-w-0 justify-center lg:justify-end">
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
    <div className="flex max-w-lg items-center gap-4 border-b border-border/70 pb-5 last:border-b-0 dark:border-cyan-300/12">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-primary dark:bg-cyan-300/10 dark:text-cyan-300">
        <Icone className="h-5 w-5" />
      </span>
      <div>
        <h2 className="text-sm font-semibold text-foreground dark:text-white">{title}</h2>
        <p className="mt-1 text-sm leading-5 text-muted-foreground dark:text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
}

function obterMensagem(parametros: Record<string, string | string[] | undefined>) {
  if (parametros.cadastro === "sucesso") {
    return "Conta criada. Confira seu e-mail se a confirmação estiver ativa e depois entre.";
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
