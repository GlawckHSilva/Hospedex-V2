import type { ReactNode } from "react";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Home,
  Hotel,
  ShieldCheck,
  Sparkles,
  Users
} from "lucide-react";
import Link from "next/link";

import type { FeatureFlagRow, PlanFeatureRow, PlanRow } from "@hospedex/types";
import { FadeIn, GlassCard, GlassPanel, StatusBadge, buttonVariants, cn } from "@hospedex/ui";

import { PublicShell } from "../../components/layout/public-shell";
import { criarClienteSupabaseServer } from "../../lib/supabase/server";

type PlanoComercial = {
  codigo: string;
  descricao: string;
  destaque: boolean;
  limiteCasas: number;
  nome: string;
  precoAnual: number;
  precoMensal: number;
  recursos: string[];
};

type PlanoPublicoRow = Pick<
  PlanRow,
  "annual_price" | "code" | "description" | "id" | "max_properties" | "monthly_price" | "name" | "status"
>;

const ORDEM_PLANOS = ["essencial", "inicial", "profissional", "premium"] as const;

const PLANOS_FALLBACK: PlanoComercial[] = [
  {
    codigo: "essencial",
    nome: "Essencial",
    precoMensal: 99,
    precoAnual: 990,
    limiteCasas: 1,
    descricao: "Para começar com uma casa publicada e operação básica organizada.",
    destaque: false,
    recursos: ["1 casa", "Página pública opcional", "Reservas", "Calendário", "Relatórios básicos"]
  },
  {
    codigo: "inicial",
    nome: "Inicial",
    precoMensal: 179,
    precoAnual: 1790,
    limiteCasas: 3,
    descricao: "Para proprietários com até três casas e recursos comerciais essenciais.",
    destaque: false,
    recursos: ["Até 3 casas", "Mercado Pago", "Guia da região", "Serviços extras", "Página pública opcional"]
  },
  {
    codigo: "profissional",
    nome: "Profissional",
    precoMensal: 260,
    precoAnual: 2600,
    limiteCasas: 5,
    descricao: "Para operação com até cinco casas, equipe e controle avançado.",
    destaque: true,
    recursos: ["Até 5 casas", "Funcionários", "Inventário", "Limpeza", "CRM"]
  },
  {
    codigo: "premium",
    nome: "Premium",
    precoMensal: 399,
    precoAnual: 3990,
    limiteCasas: 8,
    descricao: "Para pousadas, pequenos hotéis e gestão premium com até oito casas.",
    destaque: false,
    recursos: ["Até 8 casas", "Automações", "iCal", "Avaliações", "IA em condição melhor"]
  }
];

const LABEL_RECURSO: Record<string, string> = {
  advanced_rates: "Tarifário avançado",
  ai_assistant: "IA",
  ai_pricing: "IA para precificação",
  automations: "Automações",
  cleaning: "Limpeza",
  crm: "Hóspedes e CRM",
  extra_services: "Serviços extras",
  gateway_primary: "Mercado Pago",
  ics_sync: "Calendário/iCal",
  integrations: "Integrações",
  inventory: "Inventário",
  manual_approval: "Reservas com aprovação",
  marketplace_visibility: "Página pública opcional",
  payments: "Pagamento manual",
  regional_guide: "Guia da região",
  reports: "Relatórios",
  reviews: "Avaliações",
  staff: "Funcionários"
};

const recursos = [
  {
    titulo: "Site próprio de reservas",
    texto: "Sua casa ganha página pública com fotos, comodidades, regras e solicitação de reserva.",
    icon: Home
  },
  {
    titulo: "Gestão centralizada",
    texto: "Reservas, calendário, financeiro, hóspedes e pendências ficam no mesmo painel.",
    icon: Hotel
  },
  {
    titulo: "Menos dependência",
    texto: "Você pode divulgar seu link direto e reduzir dependência de plataformas externas.",
    icon: ShieldCheck
  },
  {
    titulo: "Operação profissional",
    texto: "Check-in, check-out, pagamentos, limpeza e histórico ficam organizados.",
    icon: BadgeCheck
  }
] as const;

const passos = [
  "Cadastre suas casas no Gerenciamento.",
  "Publique fotos, regras, valores e disponibilidade.",
  "Receba solicitações pelo Marketplace Hospedex.",
  "Aprove, acompanhe pagamento, check-in e check-out pelo painel."
] as const;

export default async function AnunciarPage() {
  const planos = await carregarPlanosComerciais();

  return (
    <PublicShell>
      <section className="premium-grid-bg relative overflow-hidden border-b">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.22),transparent_34%),radial-gradient(circle_at_82%_12%,rgba(59,130,246,0.18),transparent_32%)]" />
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:py-24">
          <FadeIn className="space-y-7">
            <StatusBadge tone="info">Para proprietários</StatusBadge>
            <div className="space-y-5">
              <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-normal text-foreground sm:text-6xl">
                Anuncie suas casas e gerencie tudo em um só lugar.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
                O Hospedex cria seu canal direto de reservas e organiza a operação da hospedagem:
                casas, hóspedes, financeiro, calendário e pendências.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                className={cn(buttonVariants({ size: "lg" }), "justify-center")}
                href="https://hospedex.vercel.app/cadastro"
              >
                Começar agora
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                className={cn(buttonVariants({ size: "lg", variant: "outline" }), "justify-center")}
                href="#planos"
              >
                Ver assinaturas
              </Link>
            </div>
          </FadeIn>
          <PainelPreview />
        </div>
      </section>

      <section className="bg-background">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-normal text-primary">Como funciona</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-normal sm:text-4xl">
              Do anúncio à operação diária
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {passos.map((passo, index) => (
              <GlassCard className="p-5" key={passo}>
                <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {index + 1}
                </span>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">{passo}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y bg-secondary/35">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:py-20">
          <div>
            <p className="text-sm font-semibold uppercase tracking-normal text-primary">
              Painel de gerenciamento
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-normal sm:text-4xl">
              Controle reservas, casas e financeiro sem planilhas soltas.
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">
              O proprietário acompanha solicitações, pagamentos pendentes, check-ins, check-outs,
              limpeza e relatórios com dados da própria operação.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <MiniPrint titulo="Reservas" icon={<CalendarDays />} linhas={["Solicitações", "Pagamentos", "Check-in"]} />
            <MiniPrint titulo="Financeiro" icon={<CreditCard />} linhas={["Receitas", "Despesas", "Pendentes"]} />
            <MiniPrint titulo="Hóspedes" icon={<Users />} linhas={["Contatos", "Histórico", "CRM"]} />
            <MiniPrint titulo="Relatórios" icon={<BarChart3 />} linhas={["Receita", "Ocupação", "Ticket médio"]} />
          </div>
        </div>
      </section>

      <section className="bg-background">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-normal text-primary">Recursos</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-normal sm:text-4xl">
              Criado para casas de temporada, pousadas e pequenos hotéis
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {recursos.map((recurso) => {
              const Icone = recurso.icon;

              return (
                <GlassCard className="p-6" key={recurso.titulo}>
                  <span className="grid h-11 w-11 place-items-center rounded-md bg-primary/10 text-primary">
                    <Icone className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold">{recurso.titulo}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{recurso.texto}</p>
                </GlassCard>
              );
            })}
          </div>
        </div>
      </section>

      <GlassPanel className="rounded-none border-x-0 border-b-0" id="planos">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:py-20">
          <div className="max-w-3xl">
            <StatusBadge tone="info">Assinaturas</StatusBadge>
            <h2 className="mt-4 text-3xl font-semibold tracking-normal sm:text-4xl">
              Escolha o plano para anunciar e gerenciar suas casas
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">
              Todos os planos liberam o painel de gerenciamento. Página pública e Marketplace
              são opcionais e seguem os limites e módulos liberados pelo Super Admin.
            </p>
          </div>
          <div className="grid gap-5 lg:grid-cols-4">
            {planos.map((plano) => (
              <GlassCard
                className={cn(
                  "relative p-6",
                  plano.destaque && "border-cyan-300/50 bg-cyan-500/10 shadow-xl shadow-cyan-950/10"
                )}
                key={plano.codigo}
              >
                {plano.destaque ? (
                  <span className="absolute right-4 top-4 rounded-full border border-cyan-300/40 bg-cyan-500/15 px-3 py-1 text-xs font-semibold text-cyan-700 dark:text-cyan-100">
                    Mais escolhido
                  </span>
                ) : null}
                <h3 className="text-xl font-semibold">{plano.nome}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{plano.descricao}</p>
                <p className="mt-5 text-2xl font-semibold text-foreground">
                  {formatarMoeda(plano.precoMensal)}
                  <span className="text-sm font-medium text-muted-foreground">/mês</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Anual: {formatarMoeda(plano.precoAnual)} (pague 10 meses e use 12)
                </p>
                <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                  {plano.recursos.map((recurso) => (
                    <li className="flex gap-2" key={recurso}>
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{recurso}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  className={cn(
                    buttonVariants({ size: "lg", variant: plano.destaque ? "default" : "outline" }),
                    "mt-6 w-full justify-center"
                  )}
                  href="https://hospedex.vercel.app/cadastro"
                >
                  Assinar {plano.nome}
                </Link>
              </GlassCard>
            ))}
          </div>
          <GlassCard className="p-5 text-sm leading-7 text-muted-foreground">
            Página pública e Marketplace podem gerar comissão comercial de 2% sobre reservas
            públicas. Casa adicional custa R$ 50/mês e, nesta fase, é ajustada manualmente
            pelo Super Admin no limite da licença.
          </GlassCard>
        </div>
      </GlassPanel>
    </PublicShell>
  );
}

async function carregarPlanosComerciais(): Promise<PlanoComercial[]> {
  const supabase = await criarClienteSupabaseServer();
  if (!supabase) return PLANOS_FALLBACK;

  const { data: plans, error } = await supabase
    .from("plans")
    .select("id,code,name,description,monthly_price,annual_price,max_properties,status")
    .in("code", [...ORDEM_PLANOS])
    .eq("status", "active")
    .returns<PlanoPublicoRow[]>();

  if (error || !plans?.length) return PLANOS_FALLBACK;

  const planosBase = montarPlanosSemRecursos(plans);
  const idsPlanos = plans.map((plan) => plan.id);
  const { data: planFeatures, error: erroRecursos } = await supabase
    .from("plan_features")
    .select("plan_id,feature_flag_id,enabled")
    .in("plan_id", idsPlanos)
    .eq("enabled", true)
    .returns<Pick<PlanFeatureRow, "enabled" | "feature_flag_id" | "plan_id">[]>();

  if (erroRecursos) return planosBase;

  const idsFlags = [...new Set((planFeatures ?? []).map((feature) => feature.feature_flag_id))];
  const { data: flags } = idsFlags.length
    ? await supabase
        .from("feature_flags")
        .select("id,key,module")
        .in("id", idsFlags)
        .returns<Pick<FeatureFlagRow, "id" | "key" | "module">[]>()
    : { data: [] };

  const flagPorId = new Map((flags ?? []).map((flag) => [flag.id, flag.key]));
  const idPlanoPorCodigo = new Map(plans.map((plan) => [plan.code, plan.id]));

  return planosBase.map((plano) => {
    const recursos = (planFeatures ?? [])
      .filter((feature) => feature.plan_id === idPlanoPorCodigo.get(plano.codigo))
      .map((feature) => LABEL_RECURSO[flagPorId.get(feature.feature_flag_id) ?? ""])
      .filter((recurso): recurso is string => Boolean(recurso));

    return {
      ...plano,
      recursos: [
        plano.limiteCasas === 1 ? "1 casa" : `Até ${plano.limiteCasas} casas`,
        ...recursos
      ].slice(0, 6)
    };
  });
}

function montarPlanosSemRecursos(plans: PlanoPublicoRow[]): PlanoComercial[] {
  return [...plans]
    .sort(
      (a, b) =>
        ORDEM_PLANOS.indexOf(a.code as (typeof ORDEM_PLANOS)[number]) -
        ORDEM_PLANOS.indexOf(b.code as (typeof ORDEM_PLANOS)[number])
    )
    .map((plan) => ({
      codigo: plan.code,
      descricao: plan.description ?? "Plano comercial Hospedex.",
      destaque: plan.code === "profissional",
      limiteCasas: Number(plan.max_properties),
      nome: plan.name,
      precoAnual: Number(plan.annual_price),
      precoMensal: Number(plan.monthly_price),
      recursos: [Number(plan.max_properties) === 1 ? "1 casa" : `Até ${plan.max_properties} casas`]
    }));
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    maximumFractionDigits: 0,
    style: "currency"
  }).format(valor);
}

function PainelPreview() {
  return (
    <div className="rounded-2xl border bg-slate-950/80 p-3 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl">
      <div className="rounded-xl border border-cyan-300/15 bg-[linear-gradient(135deg,rgba(8,47,73,0.72),rgba(2,6,23,0.92))] p-4 text-white">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">Gerenciamento</p>
            <h3 className="mt-1 text-xl font-semibold">Dashboard do proprietário</h3>
          </div>
          <Sparkles className="h-5 w-5 text-cyan-300" />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            ["Reservas", "12"],
            ["Receita", "R$ 8.250"],
            ["Pendências", "3"]
          ].map(([label, value]) => (
            <div className="rounded-lg border border-cyan-300/15 bg-white/5 p-4" key={label}>
              <p className="text-xs text-cyan-100/70">{label}</p>
              <strong className="mt-2 block text-2xl">{value}</strong>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_0.7fr]">
          <div className="rounded-lg border border-cyan-300/15 bg-white/5 p-4">
            <div className="h-32 rounded-md bg-[linear-gradient(180deg,rgba(34,211,238,0.35),rgba(34,197,94,0.08))]" />
          </div>
          <div className="space-y-3">
            <PreviewLinha texto="Casa publicada no Marketplace" />
            <PreviewLinha texto="Reserva aguardando aprovação" />
            <PreviewLinha texto="Pagamento pendente" />
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniPrint({ titulo, icon, linhas }: { titulo: string; icon: ReactNode; linhas: string[] }) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
          {icon}
        </span>
        <h3 className="font-semibold">{titulo}</h3>
      </div>
      <div className="mt-5 space-y-2">
        {linhas.map((linha) => (
          <PreviewLinha key={linha} texto={linha} />
        ))}
      </div>
    </GlassCard>
  );
}

function PreviewLinha({ texto }: { texto: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-cyan-300/15 bg-cyan-500/5 px-3 py-2 text-sm">
      <span className="text-muted-foreground">{texto}</span>
      <span className="h-2 w-12 rounded-full bg-cyan-300/45" />
    </div>
  );
}
