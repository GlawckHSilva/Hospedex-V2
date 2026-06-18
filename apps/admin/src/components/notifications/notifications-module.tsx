import {
  Banknote,
  Bell,
  CalendarCheck,
  CheckCheck,
  DoorClosed,
  DoorOpen,
  KeyRound,
  Sparkles,
  XCircle
} from "lucide-react";
import Link from "next/link";

import { Badge, Button, Card, CardContent, FadeIn, cn } from "@hospedex/ui";

import { marcarTodasNotificacoesLidasAction } from "../../lib/notifications/actions";
import type {
  DadosNotificacoesGerenciamento,
  FiltroStatusNotificacao,
  FiltroTipoNotificacao,
  NotificacaoGerenciamento
} from "../../lib/notifications/types";
import { ModuleToast } from "../admin/module-toast";
import { EmptyState, EntityGrid } from "../management/entity-card";
import { NotificationRowActions } from "./notification-row-actions";

type NotificationsModuleProps = DadosNotificacoesGerenciamento & {
  erro?: string | undefined;
  sucesso?: string | undefined;
  tenantNome: string;
};

const MENSAGENS_SUCESSO: Record<string, string> = {
  "notificacao-excluida": "Notificacao excluida.",
  "notificacao-lida": "Notificacao marcada como lida.",
  "todas-lidas": "Todas as notificacoes foram marcadas como lidas."
};

const STATUS_FILTROS: Array<{ label: string; status: FiltroStatusNotificacao }> = [
  { label: "Todas", status: "todas" },
  { label: "Nao lidas", status: "nao_lidas" },
  { label: "Lidas", status: "lidas" }
];

export function NotificationsModule({
  erro,
  filtros,
  itens,
  sucesso,
  tenantNome,
  tiposDisponiveis,
  total,
  totalNaoLidas
}: NotificationsModuleProps) {
  return (
    <FadeIn className="space-y-5">
      <ModuleToast erro={erro} mensagensSucesso={MENSAGENS_SUCESSO} sucesso={sucesso} />

      <section className="admin-glass-panel p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Badge variant="info">Gerenciamento</Badge>
            <h1 className="mt-3 text-2xl font-semibold tracking-normal">Notificacoes</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Alertas internos do tenant {tenantNome}, gerados a partir de reservas,
              limpeza, financeiro e licenca.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <ResumoCard icon={<Bell />} label="Nao lidas" valor={totalNaoLidas} />
            <ResumoCard icon={<CalendarCheck />} label="Listadas" valor={total} />
          </div>
        </div>
      </section>

      <Card className="admin-glass-card">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {STATUS_FILTROS.map((item) => (
                  <FiltroLink
                    ativo={filtros.status === item.status}
                    href={montarHref({ status: item.status, tipo: filtros.tipo })}
                    key={item.status}
                  >
                    {item.label}
                  </FiltroLink>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {tiposDisponiveis.map((item) => (
                  <FiltroLink
                    ativo={filtros.tipo === item.tipo}
                    href={montarHref({ status: filtros.status, tipo: item.tipo })}
                    key={item.tipo}
                  >
                    {item.label}
                  </FiltroLink>
                ))}
              </div>
            </div>

            {totalNaoLidas ? (
              <form action={marcarTodasNotificacoesLidasAction}>
                <Button type="submit" variant="outline">
                  <CheckCheck className="h-4 w-4" />
                  Marcar todas como lidas
                </Button>
              </form>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {itens.length ? (
        <EntityGrid>
          {itens.map((notificacao) => (
            <NotificationCard key={notificacao.key} notificacao={notificacao} />
          ))}
        </EntityGrid>
      ) : (
        <EmptyState
          description="Quando houver eventos reais de reservas, limpeza, pagamentos ou licenca, eles aparecem aqui conforme suas permissoes."
          icon={<Bell className="h-5 w-5" />}
          title="Nenhuma notificacao encontrada"
        />
      )}
    </FadeIn>
  );
}

function NotificationCard({ notificacao }: { notificacao: NotificacaoGerenciamento }) {
  const Icone = iconePorTipo(notificacao.tipo);

  return (
    <Card className={cn("admin-glass-card", !notificacao.lida && "ring-1 ring-cyan-300/30")}>
      <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-3">
          <div className={cn("mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border", tomClasses(notificacao.tom))}>
            <Icone className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold">{notificacao.titulo}</h2>
              {!notificacao.lida ? <Badge variant="info">nao lida</Badge> : null}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{notificacao.descricao}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>{formatarDataHora(notificacao.data)}</span>
              <Link className="font-medium text-cyan-700 hover:underline dark:text-cyan-200" href={notificacao.href}>
                Abrir origem
              </Link>
            </div>
          </div>
        </div>

        <NotificationRowActions
          lida={notificacao.lida}
          notificationKey={notificacao.key}
        />
      </CardContent>
    </Card>
  );
}

function ResumoCard({ icon, label, valor }: { icon: React.ReactNode; label: string; valor: number }) {
  return (
    <div className="rounded-xl border border-cyan-300/20 bg-background/55 p-4 shadow-sm">
      <div className="flex items-center gap-2 text-cyan-700 dark:text-cyan-200">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-[0.16em]">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold">{valor}</p>
    </div>
  );
}

function FiltroLink({
  ativo,
  children,
  href
}: {
  ativo: boolean;
  children: React.ReactNode;
  href: string;
}) {
  return (
    <Link
      className={cn(
        "rounded-lg border px-3 py-2 text-sm transition",
        ativo
          ? "border-cyan-300/50 bg-cyan-500/15 text-cyan-700 dark:text-cyan-200"
          : "border-border bg-background/45 text-muted-foreground hover:bg-cyan-500/10 hover:text-foreground"
      )}
      href={href}
    >
      {children}
    </Link>
  );
}

function montarHref(filtros: { status: FiltroStatusNotificacao; tipo: FiltroTipoNotificacao }) {
  const params = new URLSearchParams();
  if (filtros.status !== "todas") params.set("status", filtros.status);
  if (filtros.tipo !== "todos") params.set("tipo", filtros.tipo);
  const query = params.toString();
  return query ? `/notificacoes?${query}` : "/notificacoes";
}

function iconePorTipo(tipo: NotificacaoGerenciamento["tipo"]) {
  const icones = {
    checkin_today: DoorOpen,
    checkout_today: DoorClosed,
    cleaning_pending: Sparkles,
    license_expiring: KeyRound,
    new_reservation: CalendarCheck,
    payment_awaiting_confirmation: Banknote,
    payment_confirmed: Banknote,
    reservation_cancelled: XCircle
  };

  return icones[tipo];
}

function tomClasses(tom: NotificacaoGerenciamento["tom"]) {
  const classes = {
    azul: "border-sky-300/30 bg-sky-500/10 text-sky-600 dark:text-sky-200",
    laranja: "border-orange-300/30 bg-orange-500/10 text-orange-600 dark:text-orange-200",
    roxo: "border-violet-300/30 bg-violet-500/10 text-violet-600 dark:text-violet-200",
    verde: "border-emerald-300/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-200",
    vermelho: "border-red-300/30 bg-red-500/10 text-red-600 dark:text-red-200"
  };

  return classes[tom];
}

function formatarDataHora(data: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo"
  }).format(new Date(data));
}
