import {
  Banknote,
  Bell,
  CheckCircle2,
  DoorClosed,
  DoorOpen,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { Badge, Button, Card, CardContent, FadeIn } from "@hospedex/ui";

import {
  confirmarCheckInConfirmacaoAction,
  confirmarCheckOutConfirmacaoAction,
  confirmarLimpezaConfirmacaoAction,
} from "../../lib/confirmations/actions";
import type {
  DadosConfirmacoes,
  LimpezaConfirmacao,
  ReservaConfirmacao,
  SearchParamsConfirmacoes,
} from "../../lib/confirmations/types";
import { ModuleToast } from "../admin/module-toast";
import { EmptyState, EntityGrid } from "../management/entity-card";
import { ConfirmDialog } from "../management/entity-modal";
import { MENSAGENS_PENDENCIA } from "./pending-messages";
import { ReservationDecisionCard } from "./reservation-decision-card";

type PendingModuleProps = DadosConfirmacoes & SearchParamsConfirmacoes;

const MENSAGENS_SUCESSO: Record<string, string> = {
  "checkin-confirmado": "Check-in confirmado.",
  "checkout-confirmado": "Check-out confirmado.",
  "limpeza-confirmada": "Limpeza concluída.",
  "observacao-adicionada": "Observação adicionada.",
  "pagamento-confirmado": "Pagamento marcado como recebido.",
  "pagamento-pendente": "Pagamento marcado como pendente.",
  "reserva-cancelada": "Reserva cancelada.",
  "reserva-confirmada": "Reserva confirmada.",
  "reserva-confirmada-whatsapp": "Reserva confirmada e mensagem de WhatsApp preparada.",
  "reserva-confirmada-whatsapp-pendente":
    "Reserva confirmada. Prepare a mensagem de WhatsApp manualmente.",
  "reserva-confirmada-whatsapp-revisao":
    "Reserva confirmada. Revise a mensagem de WhatsApp antes de abrir.",
};

/**
 * Central de pendências do Gerenciamento.
 *
 * Pendências mostra somente o que exige ação. Reservas pagas sem etapa
 * operacional pendente ficam fora desta tela para não criar ruído.
 */
export function PendingModule({
  aguardandoPagamento,
  checkInsHoje,
  checkOutsHoje,
  erro,
  hoje,
  limpezasPendentes,
  notificacoes,
  podeGerenciarLimpeza,
  podeGerenciarOperacao,
  podeGerenciarPagamento,
  pendentes,
  resumo,
  sucesso,
  tenantNome,
  timeline,
}: PendingModuleProps) {
  const totalItens =
    checkInsHoje.length +
    checkOutsHoje.length +
    pendentes.length +
    aguardandoPagamento.length +
    limpezasPendentes.length;

  return (
    <FadeIn className="space-y-5">
      <ModuleToast
        erro={erro}
        mensagensSucesso={MENSAGENS_SUCESSO}
        sucesso={sucesso}
      />

      <section className="admin-glass-panel p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="info">Pendências operacionais</Badge>
              {notificacoes.length ? (
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-cyan-500" />
                </span>
              ) : null}
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-normal">
              Pendências
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Acompanhe tudo que precisa de ação no gerenciamento. {tenantNome} ·{" "}
              {formatarData(hoje)}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <ResumoCard
              icon={DoorOpen}
              label="Check-ins"
              tone="verde"
              valor={resumo.checkInsHoje}
            />
            <ResumoCard
              icon={DoorClosed}
              label="Check-outs"
              tone="laranja"
              valor={resumo.checkOutsHoje}
            />
            <ResumoCard
              icon={Bell}
              label="Solicitações"
              tone="cyan"
              valor={resumo.pendentes}
            />
            <ResumoCard
              icon={Sparkles}
              label="Limpezas"
              tone="azul"
              valor={resumo.limpezasPendentes}
            />
            <ResumoCard
              icon={Banknote}
              label="Pagamentos"
              tone="roxo"
              valor={resumo.aguardandoPagamento}
            />
          </div>
        </div>
      </section>

      {totalItens === 0 ? (
        <EmptyState
          description="Tudo certo por aqui."
          icon={<CheckCircle2 className="h-5 w-5" />}
          title="Nenhuma pendência no momento"
        />
      ) : (
        <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            <SecaoPendencias
              descricao="Novas solicitações que ainda precisam de decisão."
              titulo="Solicitações"
              total={pendentes.length}
            >
              <GrupoDecisaoReservas
                podeGerenciar={podeGerenciarOperacao}
                podeGerenciarPagamento={podeGerenciarPagamento}
                reservas={pendentes}
              />
            </SecaoPendencias>

            <SecaoPendencias
              descricao="Reservas aprovadas que ainda exigem registro, análise ou complemento de pagamento."
              titulo="Pagamentos"
              total={aguardandoPagamento.length}
            >
              <GrupoDecisaoReservas
                podeGerenciar={podeGerenciarOperacao}
                podeGerenciarPagamento={podeGerenciarPagamento}
                reservas={aguardandoPagamento}
              />
            </SecaoPendencias>

            <SecaoPendencias
              descricao="Ações do dia para entrada e saída de hóspedes."
              titulo="Operação"
              total={checkInsHoje.length + checkOutsHoje.length}
            >
              <EntityGrid>
                <GrupoReservas
                  action={confirmarCheckInConfirmacaoAction}
                  cor="verde"
                  cta={MENSAGENS_PENDENCIA.checkin_pending.primaryAction}
                  descricao={MENSAGENS_PENDENCIA.checkin_pending.description}
                  icon={<DoorOpen />}
                  podeGerenciar={podeGerenciarOperacao}
                  reservas={checkInsHoje}
                  titulo="Check-ins pendentes"
                />
                <GrupoReservas
                  action={confirmarCheckOutConfirmacaoAction}
                  cor="laranja"
                  cta={MENSAGENS_PENDENCIA.checkout_pending.primaryAction}
                  descricao={MENSAGENS_PENDENCIA.checkout_pending.description}
                  icon={<DoorClosed />}
                  podeGerenciar={podeGerenciarOperacao}
                  reservas={checkOutsHoje}
                  titulo="Check-outs pendentes"
                />
              </EntityGrid>
            </SecaoPendencias>

            <SecaoPendencias
              descricao="Casas que precisam voltar ao ciclo operacional."
              titulo="Limpeza"
              total={limpezasPendentes.length}
            >
              <EntityGrid>
                <GrupoLimpeza
                  limpezas={limpezasPendentes}
                  podeGerenciar={podeGerenciarLimpeza}
                />
              </EntityGrid>
            </SecaoPendencias>
          </div>

          <aside className="space-y-4">
            <Card className="admin-glass-card">
              <CardContent className="p-5">
                <h2 className="text-base font-semibold">Notificações</h2>
                <div className="mt-4 space-y-3">
                  {notificacoes.length ? (
                    notificacoes.map((notificacao) => (
                      <div
                        className="rounded-lg border bg-background/50 p-3 text-sm"
                        key={notificacao.id}
                      >
                        {notificacao.descricao}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Sem notificações pendentes.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="admin-glass-card">
              <CardContent className="p-5">
                <h2 className="text-base font-semibold">Timeline</h2>
                <div className="mt-4 space-y-3">
                  {timeline.length ? (
                    timeline.map((evento) => (
                      <div
                        className="rounded-lg border bg-background/50 p-3 text-sm"
                        key={`${evento.tipo}-${evento.id}`}
                      >
                        <p>{evento.descricao}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {evento.autor?.full_name ??
                            evento.autor?.email ??
                            "Sistema"}{" "}
                          · {formatarDataHora(evento.data)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Sem eventos recentes.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </aside>
        </section>
      )}
    </FadeIn>
  );
}

function SecaoPendencias({
  children,
  descricao,
  titulo,
  total,
}: {
  children: ReactNode;
  descricao: string;
  titulo: string;
  total: number;
}) {
  if (total === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">{titulo}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{descricao}</p>
        </div>
        <Badge variant="outline">{total}</Badge>
      </div>
      {children}
    </section>
  );
}

function GrupoDecisaoReservas({
  podeGerenciar,
  podeGerenciarPagamento,
  reservas,
}: {
  podeGerenciar: boolean;
  podeGerenciarPagamento: boolean;
  reservas: ReservaConfirmacao[];
}) {
  return (
    <div className="grid gap-4 2xl:grid-cols-2">
      {reservas.map((reserva) => (
        <ReservationDecisionCard
          key={reserva.id}
          podeGerenciar={podeGerenciar}
          podeGerenciarPagamento={podeGerenciarPagamento}
          reserva={reserva}
        />
      ))}
    </div>
  );
}

function GrupoReservas({
  action,
  cor,
  cta,
  descricao,
  icon,
  podeGerenciar,
  reservas,
  titulo,
}: {
  action: (formData: FormData) => Promise<void>;
  cor: "laranja" | "roxo" | "verde" | "vermelho";
  cta: string;
  descricao: string;
  icon: ReactNode;
  podeGerenciar: boolean;
  reservas: ReservaConfirmacao[];
  titulo: string;
}) {
  if (!reservas.length) return null;

  return (
    <Card className="admin-glass-card">
      <CardContent className="space-y-3 p-5">
        <TituloGrupo
          cor={cor}
          icon={icon}
          titulo={titulo}
          total={reservas.length}
        />
        <p className="rounded-lg border border-cyan-300/15 bg-cyan-400/10 p-3 text-sm text-muted-foreground">
          {descricao}
        </p>
        {reservas.map((reserva) => (
          <LinhaOperacao
            action={action}
            cta={cta}
            idName="reservaId"
            itemId={reserva.id}
            key={reserva.id}
            podeGerenciar={podeGerenciar}
            subtitulo={reserva.propriedade?.name ?? "Casa"}
            titulo={`${reserva.code} · ${
              reserva.hospedePrincipal?.full_name ?? "Hóspede não informado"
            }`}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function GrupoLimpeza({
  limpezas,
  podeGerenciar,
}: {
  limpezas: LimpezaConfirmacao[];
  podeGerenciar: boolean;
}) {
  if (!limpezas.length) return null;

  return (
    <Card className="admin-glass-card">
      <CardContent className="space-y-3 p-5">
        <TituloGrupo
          cor="azul"
          icon={<Sparkles />}
          titulo="Limpezas pendentes"
          total={limpezas.length}
        />
        <p className="rounded-lg border border-cyan-300/15 bg-cyan-400/10 p-3 text-sm text-muted-foreground">
          {MENSAGENS_PENDENCIA.cleaning_pending.description}
        </p>
        {limpezas.map((limpeza) => (
          <LinhaOperacao
            action={confirmarLimpezaConfirmacaoAction}
            cta={MENSAGENS_PENDENCIA.cleaning_pending.primaryAction}
            idName="tarefaId"
            itemId={limpeza.id}
            key={limpeza.id}
            podeGerenciar={podeGerenciar}
            subtitulo={limpeza.propriedade?.name ?? "Casa"}
            titulo={limpeza.title}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function LinhaOperacao({
  action,
  cta,
  idName,
  itemId,
  podeGerenciar,
  subtitulo,
  titulo,
}: {
  action: (formData: FormData) => Promise<void>;
  cta: string;
  idName: "reservaId" | "tarefaId";
  itemId: string;
  podeGerenciar: boolean;
  subtitulo: string;
  titulo: string;
}) {
  return (
    <div className="grid gap-3 rounded-lg border bg-background/45 p-3 lg:grid-cols-[1fr_220px]">
      <div>
        <p className="font-medium">{titulo}</p>
        <p className="mt-1 text-sm text-muted-foreground">{subtitulo}</p>
      </div>
      <div className="flex items-end justify-end">
        <ConfirmDialog
          description="Registre uma observação opcional antes de confirmar a operação."
          disabled={!podeGerenciar}
          title={cta}
          triggerIcon={<CheckCircle2 className="h-4 w-4" />}
          triggerLabel={cta}
          triggerVariant="default"
        >
          <form action={action} className="grid gap-3">
            <input name={idName} type="hidden" value={itemId} />
            <textarea
              className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              name="observacao"
              placeholder="Observação opcional"
            />
            <Button disabled={!podeGerenciar} type="submit">
              <CheckCircle2 />
              {cta}
            </Button>
          </form>
        </ConfirmDialog>
      </div>
    </div>
  );
}

function TituloGrupo({
  cor,
  icon,
  titulo,
  total,
}: {
  cor: "azul" | "laranja" | "roxo" | "verde" | "vermelho";
  icon: ReactNode;
  titulo: string;
  total: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <span className={classeTom(cor)}>{icon}</span>
        {titulo}
      </h2>
      <Badge variant="outline">{total}</Badge>
    </div>
  );
}

function ResumoCard({
  icon: Icon,
  label,
  tone,
  valor,
}: {
  icon: LucideIcon;
  label: string;
  tone: "azul" | "cyan" | "laranja" | "roxo" | "verde";
  valor: number;
}) {
  return (
    <div className="min-w-32 rounded-lg border bg-background/55 p-3 text-sm">
      <div className={classeTom(tone)}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold">{valor}</p>
    </div>
  );
}

function classeTom(
  tom: "azul" | "cyan" | "laranja" | "roxo" | "verde" | "vermelho",
) {
  const classes = {
    azul: "text-blue-500",
    cyan: "text-cyan-500",
    laranja: "text-orange-500",
    roxo: "text-violet-500",
    verde: "text-emerald-500",
    vermelho: "text-red-500",
  };

  return classes[tom];
}

function formatarData(valor: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "full",
    timeZone: "UTC",
  }).format(new Date(`${valor}T00:00:00`));
}

function formatarDataHora(valor: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(valor));
}
