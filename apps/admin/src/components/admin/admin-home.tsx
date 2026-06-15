import {
  AlertTriangle,
  CalendarCheck2,
  CheckCircle2,
  CircleDollarSign,
  Home,
  Hotel,
  LogIn,
  LogOut,
  Percent,
  ShieldAlert
} from "lucide-react";
import type { ReactNode } from "react";

import { FadeIn, GlassCard, GlassPanel, StatusBadge } from "@hospedex/ui";

import {
  obterPerfilMenuAdmin,
  obterTituloPerfilAdmin
} from "../../config/navigation";
import type { ContextoAutenticacao } from "../../lib/auth/types";
import type { AlertaDashboard, DadosDashboardProprietario } from "../../lib/dashboard/data";

export type AdminHomeProps = {
  contexto: ContextoAutenticacao;
  dashboard: DadosDashboardProprietario;
};

/**
 * Dashboard inicial do proprietário.
 *
 * Os indicadores são calculados pelo tenant atual. Isso evita misturar dados de
 * clientes diferentes e prepara a evolução para calendário, pagamentos e limpeza.
 */
export function AdminHome({ contexto, dashboard }: AdminHomeProps) {
  const perfil = obterPerfilMenuAdmin(contexto.role);
  const tituloPerfil = obterTituloPerfilAdmin(perfil);

  if (dashboard.erro) {
    return <EstadoErro mensagem={dashboard.erro} />;
  }

  return (
    <FadeIn className="space-y-5">
      <GlassPanel className="overflow-hidden p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <StatusBadge tone="info">{tituloPerfil}</StatusBadge>
            <h1 className="mt-3 text-2xl font-semibold tracking-normal sm:text-3xl">
              Dashboard do proprietário
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {contexto.tenant?.name ?? "Tenant atual"} · {dashboard.periodo}
            </p>
          </div>
          <div className="rounded-lg border bg-cyan-400/10 p-3 text-sm text-cyan-800 dark:text-cyan-100">
            Operação em tempo real do tenant autenticado.
          </div>
        </div>
      </GlassPanel>

      {dashboard.estadoVazio ? <EstadoVazio /> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {dashboard.cards.map((card, index) => (
          <GlassCard className="overflow-hidden p-5" key={card.titulo}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">{card.titulo}</p>
                  <p className="mt-2 text-2xl font-semibold">{card.valor}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-300/40 bg-cyan-400/15 text-cyan-700 dark:text-cyan-200">
                  {obterIconeCard(index)}
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">{card.descricao}</p>
              <MiniGrafico indice={index} />
          </GlassCard>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {dashboard.alertas.map((alerta) => (
          <AlertaOperacional alerta={alerta} key={alerta.titulo} />
        ))}
      </section>
    </FadeIn>
  );
}

function EstadoErro({ mensagem }: { mensagem: string }) {
  return (
    <FadeIn>
      <GlassCard className="flex items-start gap-3 p-5">
          <ShieldAlert className="mt-1 h-5 w-5 text-destructive" />
          <div>
            <h1 className="text-lg font-semibold">Dashboard indisponível</h1>
            <p className="mt-1 text-sm text-muted-foreground">{mensagem}</p>
          </div>
      </GlassCard>
    </FadeIn>
  );
}

function EstadoVazio() {
  return (
    <GlassCard className="p-5">
        <StatusBadge tone="warning">Sem dados operacionais</StatusBadge>
        <h2 className="mt-3 text-lg font-semibold">Cadastre propriedades para ativar o dashboard</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          As métricas passam a ganhar valor quando existirem propriedades, unidades e reservas no tenant.
        </p>
    </GlassCard>
  );
}

function AlertaOperacional({ alerta }: { alerta: AlertaDashboard }) {
  const Icone = alerta.tipo === "warning" ? AlertTriangle : CheckCircle2;

  return (
    <GlassCard className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <StatusBadge tone={alerta.tipo === "warning" ? "warning" : "success"}>
              {alerta.valor}
            </StatusBadge>
            <h2 className="mt-3 font-semibold">{alerta.titulo}</h2>
          </div>
          <Icone className="h-5 w-5 text-primary" />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{alerta.descricao}</p>
    </GlassCard>
  );
}

function MiniGrafico({ indice }: { indice: number }) {
  const alturas = [
    [42, 62, 48, 72, 58, 84],
    [34, 46, 72, 64, 78, 88],
    [58, 44, 66, 52, 74, 68],
    [38, 52, 48, 70, 76, 64],
    [46, 64, 82, 74, 88, 92],
    [52, 68, 58, 76, 72, 86]
  ][indice % 6] ?? [44, 62, 54, 70, 66, 82];

  return (
    <div className="mt-5 flex h-16 items-end gap-1.5 rounded-lg border bg-background/45 px-3 py-2">
      {alturas.map((altura, index) => (
        <span
          className="flex-1 rounded-t-sm bg-gradient-to-t from-cyan-500/35 to-cyan-300/80"
          key={`${altura}-${index}`}
          style={{ height: `${altura}%` }}
        />
      ))}
    </div>
  );
}

function obterIconeCard(index: number): ReactNode {
  const icones = [
    <CalendarCheck2 key="reservas" />,
    <CircleDollarSign key="receita" />,
    <LogIn key="check-in" />,
    <LogOut key="check-out" />,
    <Percent key="ocupacao" />,
    <Hotel key="propriedades" />
  ];

  return icones[index] ?? <Home />;
}
