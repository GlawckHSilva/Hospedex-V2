"use client";

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
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { FadeIn, GlassCard, GlassPanel, StatusBadge } from "@hospedex/ui";

import { obterPerfilMenuAdmin, obterTituloPerfilAdmin } from "../../config/navigation";
import type { ContextoAutenticacao } from "../../lib/auth/types";
import type {
  AlertaDashboard,
  CardDashboard,
  DadosDashboardProprietario,
  EventoReservaDashboard,
  IconeCardDashboard,
  ReceitaPeriodoDashboard,
  ReservaStatusDashboard
} from "../../lib/dashboard/data";

export type AdminHomeProps = {
  contexto: ContextoAutenticacao;
  dashboard: DadosDashboardProprietario;
};

/**
 * Dashboard inicial do proprietario.
 *
 * A tela renderiza apenas dados calculados no servidor para o tenant atual.
 * Graficos vazios exibem estado discreto em vez de barras falsas, preservando a
 * confianca operacional do proprietario.
 */
export function AdminHome({ contexto, dashboard }: AdminHomeProps) {
  const perfil = obterPerfilMenuAdmin(contexto.role);
  const tituloPerfil = obterTituloPerfilAdmin(perfil);

  if (dashboard.erro) {
    return <EstadoErro mensagem={dashboard.erro} />;
  }

  return (
    <FadeIn className="admin-dashboard space-y-5">
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

      {dashboard.erros.length > 0 ? <PainelErros erros={dashboard.erros.map((erro) => erro.mensagem)} /> : null}
      {dashboard.estadoVazio ? <EstadoVazio /> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {dashboard.cards.map((card) => (
          <CartaoMetrica card={card} key={card.titulo} />
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {dashboard.alertas.map((alerta) => (
          <AlertaOperacional alerta={alerta} key={alerta.titulo} />
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <GraficoReceitaPeriodo dados={dashboard.receitaPorPeriodo} />
        <GraficoStatusReservas dados={dashboard.reservasPorStatus} />
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <ListaEventos
          descricao="Entradas futuras confirmadas no tenant."
          eventos={dashboard.proximosCheckIns}
          icone={<LogIn />}
          titulo="Próximos check-ins"
        />
        <ListaEventos
          descricao="Saídas futuras previstas no tenant."
          eventos={dashboard.proximosCheckOuts}
          icone={<LogOut />}
          titulo="Próximos check-outs"
        />
      </section>
    </FadeIn>
  );
}

function CartaoMetrica({ card }: { card: CardDashboard }) {
  return (
    <div className="h-full">
      <GlassCard className="group h-full overflow-hidden p-5 transition duration-200">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="dashboard-card-title text-sm">{card.titulo}</p>
            <p className="dashboard-card-value mt-2 text-2xl font-bold">{card.valor}</p>
          </div>
          <div className="dashboard-card-icon flex h-10 w-10 items-center justify-center rounded-lg border transition">
            {obterIconeCard(card.icone)}
          </div>
        </div>
        <p className="dashboard-card-description mt-4 text-sm">{card.descricao}</p>
        <MiniGrafico estadoVazio={card.estadoVazioGrafico} serie={card.serie} />
      </GlassCard>
    </div>
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

function PainelErros({ erros }: { erros: string[] }) {
  const mensagens = Array.from(new Set(erros));

  return (
    <GlassCard className="border-amber-300/40 bg-amber-500/10 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-300" />
        <div>
          <h2 className="text-sm font-semibold">Alguns dados não foram carregados</h2>
          <div className="mt-1 space-y-1 text-sm text-muted-foreground">
            {mensagens.map((mensagem) => (
              <p key={mensagem}>{mensagem}</p>
            ))}
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

function EstadoVazio() {
  return (
    <GlassCard className="p-5">
      <StatusBadge tone="warning">Sem dados operacionais</StatusBadge>
      <h2 className="mt-3 text-lg font-semibold">Cadastre propriedades para ativar o dashboard</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        As métricas passam a ganhar valor quando existirem propriedades, reservas ou
        lançamentos financeiros no tenant.
      </p>
    </GlassCard>
  );
}

function AlertaOperacional({ alerta }: { alerta: AlertaDashboard }) {
  const Icone = alerta.tipo === "warning" ? AlertTriangle : CheckCircle2;

  return (
    <div className="h-full">
      <GlassCard className="h-full p-5 transition duration-200">
        <div className="flex items-start justify-between gap-3">
          <div>
            <StatusBadge tone={alerta.tipo}>{alerta.valor}</StatusBadge>
            <h2 className="dashboard-card-title mt-3 font-semibold">{alerta.titulo}</h2>
          </div>
          <Icone className="h-5 w-5 text-primary" />
        </div>
        <p className="dashboard-card-description mt-3 text-sm">{alerta.descricao}</p>
      </GlassCard>
    </div>
  );
}

function MiniGrafico({
  estadoVazio,
  serie
}: {
  estadoVazio: string;
  serie: CardDashboard["serie"];
}) {
  const maiorValor = Math.max(...serie.map((ponto) => ponto.valor), 0);

  if (maiorValor <= 0) {
    return (
      <div className="dashboard-inner-surface dashboard-card-helper mt-5 rounded-lg border px-3 py-4 text-xs">
        {estadoVazio}
      </div>
    );
  }

  return (
    <div className="dashboard-inner-surface mt-5 flex h-16 items-end gap-1.5 rounded-lg border px-3 py-2">
      {serie.map((ponto) => (
        <span
          aria-label={`${ponto.rotulo}: ${ponto.valor}`}
          className={`dashboard-mini-bar flex-1 rounded-t-sm${ponto.valor === maiorValor ? " dashboard-mini-bar--max" : ""}`}
          key={ponto.rotulo}
          style={{ height: `${Math.max(12, (ponto.valor / maiorValor) * 100)}%` }}
          title={`${ponto.rotulo}: ${formatarNumero(ponto.valor)}`}
        />
      ))}
    </div>
  );
}

function GraficoReceitaPeriodo({ dados }: { dados: ReceitaPeriodoDashboard[] }) {
  const possuiReceita = dados.some((ponto) => ponto.receita > 0);

  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="dashboard-card-title text-base font-semibold">Receita por período</h2>
          <p className="dashboard-card-description mt-1 text-sm">Transações pagas dos últimos 6 meses.</p>
        </div>
        <CircleDollarSign className="h-5 w-5 text-primary" />
      </div>
      <div className="mt-4 h-72">
        {possuiReceita ? (
          <ResponsiveContainer height="100%" width="100%">
            <AreaChart data={dados}>
              <defs>
                <linearGradient id="dashboardReceita" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="var(--dashboard-chart-secondary)" />
                  <stop offset="95%" stopColor="var(--dashboard-chart-fill)" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--dashboard-chart-grid)" />
              <XAxis dataKey="rotulo" tick={{ fill: "var(--dashboard-chart-text)", fontSize: 12 }} tickLine={false} />
              <YAxis tick={{ fill: "var(--dashboard-chart-text)", fontSize: 12 }} tickFormatter={(valor) => formatarNumeroCurto(Number(valor))} width={72} />
              <Tooltip contentStyle={{ background: "var(--dashboard-tooltip-bg)", border: "1px solid var(--dashboard-chart-grid)", color: "var(--dashboard-tooltip-text)" }} formatter={(valor) => formatarMoeda(Number(valor))} />
              <Area
                dataKey="receita"
                fill="url(#dashboardReceita)"
                name="Receita"
                stroke="var(--dashboard-chart-primary)"
                strokeWidth={3}
                type="monotone"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <EstadoVazioInterno mensagem="Sem receitas pagas no período." />
        )}
      </div>
    </GlassCard>
  );
}

function GraficoStatusReservas({ dados }: { dados: ReservaStatusDashboard[] }) {
  const total = dados.reduce((soma, item) => soma + item.total, 0);

  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="dashboard-card-title text-base font-semibold">Reservas por status</h2>
          <p className="dashboard-card-description mt-1 text-sm">Distribuição das reservas do mês.</p>
        </div>
        <CalendarCheck2 className="h-5 w-5 text-primary" />
      </div>

      {total > 0 ? (
        <div className="mt-5 space-y-3">
          {dados.map((item) => (
            <div key={item.status}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="dashboard-card-description">{item.label}</span>
                <span className="dashboard-card-value font-semibold">{item.total}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted/70">
                <div
                  className="h-full rounded-full"
                  style={{
                    backgroundColor: item.cor,
                    width: `${Math.max(5, (item.total / total) * 100)}%`
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EstadoVazioInterno mensagem="Sem reservas no mês para montar o status." />
      )}
    </GlassCard>
  );
}

function ListaEventos({
  descricao,
  eventos,
  icone,
  titulo
}: {
  descricao: string;
  eventos: EventoReservaDashboard[];
  icone: ReactNode;
  titulo: string;
}) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="dashboard-card-title text-base font-semibold">{titulo}</h2>
          <p className="dashboard-card-description mt-1 text-sm">{descricao}</p>
        </div>
        <div className="text-primary [&_svg]:h-5 [&_svg]:w-5">{icone}</div>
      </div>

      {eventos.length > 0 ? (
        <div className="dashboard-inner-surface mt-4 divide-y rounded-lg border">
          {eventos.map((evento) => (
            <div className="grid gap-2 p-3 text-sm sm:grid-cols-[auto_1fr_auto]" key={evento.id}>
              <div className="dashboard-card-value font-semibold">{formatarData(evento.data)}</div>
              <div className="min-w-0">
                <p className="dashboard-card-value truncate font-semibold">{evento.hospede}</p>
                <p className="dashboard-card-helper truncate text-xs">
                  {evento.propriedade}
                </p>
              </div>
              <StatusBadge className="justify-self-start sm:justify-self-end" tone="info">
                {evento.codigo}
              </StatusBadge>
            </div>
          ))}
        </div>
      ) : (
        <EstadoVazioInterno mensagem="Nenhuma reserva futura encontrada." />
      )}
    </GlassCard>
  );
}

function EstadoVazioInterno({ mensagem }: { mensagem: string }) {
  return (
    <div className="dashboard-inner-surface dashboard-card-helper mt-4 rounded-lg border p-5 text-sm">
      {mensagem}
    </div>
  );
}

function obterIconeCard(icone: IconeCardDashboard): ReactNode {
  const icones: Record<IconeCardDashboard, ReactNode> = {
    casas: <Hotel />,
    check_in: <LogIn />,
    check_out: <LogOut />,
    ocupacao: <Percent />,
    receita: <CircleDollarSign />,
    reservas: <CalendarCheck2 />
  };

  return icones[icone] ?? <Home />;
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency"
  }).format(valor);
}

function formatarNumeroCurto(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 0,
    notation: "compact"
  }).format(valor);
}

function formatarNumero(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2
  }).format(valor);
}

function formatarData(valor: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(
    new Date(`${valor}T00:00:00`)
  );
}
