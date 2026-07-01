import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  ClipboardCheck,
  DoorClosed,
  DoorOpen,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Badge, Button, Card, CardContent, FadeIn, cn } from "@hospedex/ui";

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
type PrioridadePendencia = "alta" | "media" | "baixa";
type FiltroPagamentoPendencia =
  | "todos"
  | "vencidos"
  | "aguardando"
  | "recebidos"
  | "confirmadas-sem-pagamento";

const MENSAGENS_SUCESSO: Record<string, string> = {
  "checkin-confirmado": "Check-in confirmado.",
  "checkout-confirmado": "Check-out confirmado.",
  "limpeza-confirmada": "Limpeza concluida.",
  "observacao-adicionada": "Observacao adicionada.",
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

const FILTROS_PAGAMENTO: Array<{
  label: string;
  value: FiltroPagamentoPendencia;
}> = [
  { label: "Todos", value: "todos" },
  { label: "Vencidos", value: "vencidos" },
  { label: "Aguardando", value: "aguardando" },
  { label: "Recebidos", value: "recebidos" },
  { label: "Sem pagamento", value: "confirmadas-sem-pagamento" },
];

/**
 * Central de pendencias do Gerenciamento.
 *
 * Esta tela mostra somente o que exige decisao ou resolucao. Historico e avisos
 * gerais continuam no sininho de notificacoes para nao misturar acao com ruido.
 */
export function PendingModule({
  aguardandoPagamento,
  checkInsHoje,
  checkOutsHoje,
  erro,
  filtroPagamento,
  limpezasPendentes,
  podeGerenciarLimpeza,
  podeGerenciarOperacao,
  podeGerenciarPagamento,
  pendentes,
  resumo,
  sucesso,
}: PendingModuleProps) {
  const totalItens =
    checkInsHoje.length +
    checkOutsHoje.length +
    pendentes.length +
    aguardandoPagamento.length +
    limpezasPendentes.length;
  const filtroPagamentoAtual = normalizarFiltroPagamento(filtroPagamento);
  const pagamentosFiltrados = filtrarPagamentos(
    aguardandoPagamento,
    filtroPagamentoAtual,
  );
  const contadoresPagamento = contarPagamentos(
    aguardandoPagamento,
    resumo.pagamentosRecebidos,
  );
  const resumoInteligente = montarResumoInteligente(resumo, totalItens);

  return (
    <FadeIn className="space-y-5">
      <ModuleToast
        erro={erro}
        mensagensSucesso={MENSAGENS_SUCESSO}
        sucesso={sucesso}
      />

      <section className="admin-glass-panel p-4 sm:p-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
          <div className="min-w-0">
            <Badge variant="info">Pendencias operacionais</Badge>
            <h1 className="mt-3 text-2xl font-semibold tracking-normal">
              Pendencias
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Acoes pendentes para hoje e proximos dias.
            </p>
            <p className="mt-3 rounded-xl border border-cyan-300/15 bg-cyan-400/10 px-3 py-2 text-sm leading-6 text-cyan-950 dark:text-cyan-100">
              {resumoInteligente}
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5 xl:w-[520px]">
            <ResumoCard
              icon={DoorOpen}
              label="Check-ins"
              status="Hoje"
              tone="verde"
              valor={resumo.checkInsHoje}
            />
            <ResumoCard
              icon={DoorClosed}
              label="Check-outs"
              status="Hoje"
              tone="laranja"
              valor={resumo.checkOutsHoje}
            />
            <ResumoCard
              icon={ClipboardCheck}
              label="Solicitacoes"
              status="Analise"
              tone="cyan"
              valor={resumo.pendentes}
            />
            <ResumoCard
              icon={Sparkles}
              label="Limpezas"
              status="Operacao"
              tone="azul"
              valor={resumo.limpezasPendentes}
            />
            <ResumoCard
              icon={Banknote}
              label="Pagamentos"
              status="Financeiro"
              tone="roxo"
              valor={resumo.aguardandoPagamento}
            />
          </div>
        </div>
      </section>

      {totalItens === 0 ? (
        <EmptyState
          description="Nenhuma acao pendente encontrada. Novas pendencias aparecerao aqui quando exigirem alguma decisao."
          icon={<CheckCircle2 className="h-5 w-5" />}
          title="Tudo certo por agora"
        />
      ) : (
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold">Acoes pendentes</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Somente itens que exigem decisao ou resolucao aparecem aqui.
              </p>
            </div>

            <SecaoPendencias
              descricao="Novas solicitacoes que ainda precisam de decisao."
              prioridade="media"
              titulo="Solicitacoes"
              total={pendentes.length}
            >
              <GrupoDecisaoReservas
                podeGerenciar={podeGerenciarOperacao}
                podeGerenciarPagamento={podeGerenciarPagamento}
                reservas={pendentes}
              />
            </SecaoPendencias>

            <SecaoPendencias
              acoes={
                <FiltrosPagamento
                  contadores={contadoresPagamento}
                  filtroAtual={filtroPagamentoAtual}
                />
              }
              descricao="Reservas aprovadas que ainda exigem registro, analise ou complemento de pagamento."
              prioridade={
                aguardandoPagamento.some(temPagamentoVencido) ? "alta" : "media"
              }
              titulo="Pagamentos"
              total={aguardandoPagamento.length}
            >
              {pagamentosFiltrados.length ? (
                <GrupoDecisaoReservas
                  podeGerenciar={podeGerenciarOperacao}
                  podeGerenciarPagamento={podeGerenciarPagamento}
                  reservas={pagamentosFiltrados}
                />
              ) : (
                <EstadoVazioCategoria mensagem={mensagemVaziaPagamento(filtroPagamentoAtual)} />
              )}
            </SecaoPendencias>

            <SecaoPendencias
              descricao="Acoes do dia para entrada e saida de hospedes."
              prioridade={checkInsHoje.length + checkOutsHoje.length > 0 ? "alta" : "baixa"}
              titulo="Operacao"
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
              prioridade={limpezasPendentes.length > 0 ? "media" : "baixa"}
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

          <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
            <ResumoUrgencia
              checkIns={resumo.checkInsHoje}
              checkOuts={resumo.checkOutsHoje}
              limpezas={resumo.limpezasPendentes}
              pagamentos={resumo.aguardandoPagamento}
              solicitacoes={resumo.pendentes}
              total={totalItens}
            />
          </aside>
        </section>
      )}
    </FadeIn>
  );
}

function SecaoPendencias({
  acoes,
  children,
  descricao,
  prioridade,
  titulo,
  total,
}: {
  acoes?: ReactNode;
  children: ReactNode;
  descricao: string;
  prioridade: PrioridadePendencia;
  titulo: string;
  total: number;
}) {
  if (total === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold">{titulo}</h2>
            <span className={classePrioridade(prioridade)}>
              {rotuloPrioridade(prioridade)}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{descricao}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {acoes}
          <Badge variant="outline">{total}</Badge>
        </div>
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
    <div className="grid gap-3 2xl:grid-cols-2">
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
      <CardContent className="space-y-3 p-4">
        <TituloGrupo
          cor={cor}
          icon={icon}
          titulo={titulo}
          total={reservas.length}
        />
        <p className="rounded-lg border border-cyan-300/15 bg-cyan-400/10 px-3 py-2 text-sm text-muted-foreground">
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
            titulo={`${reserva.code} - ${
              reserva.hospedePrincipal?.full_name ?? "Hospede nao informado"
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
      <CardContent className="space-y-3 p-4">
        <TituloGrupo
          cor="azul"
          icon={<Sparkles />}
          titulo="Limpezas pendentes"
          total={limpezas.length}
        />
        <p className="rounded-lg border border-cyan-300/15 bg-cyan-400/10 px-3 py-2 text-sm text-muted-foreground">
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
    <div className="flex flex-col gap-3 rounded-xl border bg-background/45 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="break-words text-sm font-semibold">{titulo}</p>
        <p className="mt-1 text-sm text-muted-foreground">{subtitulo}</p>
      </div>
      <ConfirmDialog
        description="Registre uma observacao opcional antes de confirmar a operacao."
        disabled={!podeGerenciar}
        title={cta}
        triggerIcon={<CheckCircle2 className="h-4 w-4" />}
        triggerLabel={cta}
        triggerVariant="default"
        triggerClassName="w-full sm:w-auto"
      >
        <form action={action} className="grid gap-3">
          <input name={idName} type="hidden" value={itemId} />
          <textarea
            className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            name="observacao"
            placeholder="Observacao opcional"
          />
          <Button disabled={!podeGerenciar} type="submit">
            <CheckCircle2 />
            {cta}
          </Button>
        </form>
      </ConfirmDialog>
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
      <h2 className="flex min-w-0 items-center gap-2 text-base font-semibold">
        <span className={classeTom(cor)}>{icon}</span>
        <span className="truncate">{titulo}</span>
      </h2>
      <Badge variant="outline">{total}</Badge>
    </div>
  );
}

function ResumoCard({
  icon: Icon,
  label,
  status,
  tone,
  valor,
}: {
  icon: LucideIcon;
  label: string;
  status: string;
  tone: "azul" | "cyan" | "laranja" | "roxo" | "verde";
  valor: number;
}) {
  return (
    <div className="min-w-0 rounded-xl border bg-background/55 p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div className={classeTom(tone)}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="rounded-full bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          {status}
        </span>
      </div>
      <p className="mt-2 truncate text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold">{valor}</p>
    </div>
  );
}

function ResumoUrgencia({
  checkIns,
  checkOuts,
  limpezas,
  pagamentos,
  solicitacoes,
  total,
}: {
  checkIns: number;
  checkOuts: number;
  limpezas: number;
  pagamentos: number;
  solicitacoes: number;
  total: number;
}) {
  return (
    <Card className="admin-glass-card">
      <CardContent className="space-y-4 p-4">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <AlertTriangle className="h-4 w-4 text-orange-400" />
            Resumo de urgencia
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {total} {total === 1 ? "acao precisa" : "acoes precisam"} de atencao.
          </p>
        </div>
        <div className="space-y-2">
          <UrgenciaLinha label="Pagamentos aguardando confirmacao" valor={pagamentos} tom="roxo" />
          <UrgenciaLinha label="Check-ins pendentes" valor={checkIns} tom="verde" />
          <UrgenciaLinha label="Check-outs pendentes" valor={checkOuts} tom="laranja" />
          <UrgenciaLinha label="Limpezas pendentes" valor={limpezas} tom="azul" />
          <UrgenciaLinha label="Solicitacoes aguardando resposta" valor={solicitacoes} tom="cyan" />
        </div>
        <p className="rounded-xl border border-cyan-300/15 bg-cyan-400/10 px-3 py-2 text-xs leading-5 text-muted-foreground">
          Avisos e historico continuam no sininho de notificacoes.
        </p>
      </CardContent>
    </Card>
  );
}

function UrgenciaLinha({
  label,
  tom,
  valor,
}: {
  label: string;
  tom: "azul" | "cyan" | "laranja" | "roxo" | "verde";
  valor: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-background/45 px-3 py-2 text-sm">
      <span className="min-w-0 truncate text-muted-foreground">{label}</span>
      <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", classeFundoTom(tom))}>
        {valor}
      </span>
    </div>
  );
}

function FiltrosPagamento({
  contadores,
  filtroAtual,
}: {
  contadores: Record<FiltroPagamentoPendencia, number>;
  filtroAtual: FiltroPagamentoPendencia;
}) {
  return (
    <div className="flex max-w-full flex-wrap gap-1.5">
      {FILTROS_PAGAMENTO.map((filtro) => {
        const ativo = filtro.value === filtroAtual;

        return (
          <Link
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors hover:border-cyan-300/50 hover:text-cyan-100",
              ativo
                ? "border-cyan-300/45 bg-cyan-400/15 text-cyan-100"
                : "border-border bg-background/40 text-muted-foreground",
            )}
            href={hrefFiltroPagamento(filtro.value)}
            key={filtro.value}
          >
            {filtro.label} {contadores[filtro.value]}
          </Link>
        );
      })}
    </div>
  );
}

function EstadoVazioCategoria({ mensagem }: { mensagem: string }) {
  return (
    <div className="rounded-xl border border-dashed bg-background/35 p-4 text-sm text-muted-foreground">
      {mensagem}
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

function classeFundoTom(tom: "azul" | "cyan" | "laranja" | "roxo" | "verde") {
  const classes = {
    azul: "bg-blue-500/15 text-blue-200",
    cyan: "bg-cyan-500/15 text-cyan-200",
    laranja: "bg-orange-500/15 text-orange-200",
    roxo: "bg-violet-500/15 text-violet-200",
    verde: "bg-emerald-500/15 text-emerald-200",
  };

  return classes[tom];
}

function classePrioridade(prioridade: PrioridadePendencia) {
  const classes: Record<PrioridadePendencia, string> = {
    alta: "rounded-full border border-red-400/30 bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-200",
    baixa:
      "rounded-full border border-cyan-400/25 bg-cyan-500/10 px-2 py-0.5 text-xs font-medium text-cyan-200",
    media:
      "rounded-full border border-orange-400/30 bg-orange-500/10 px-2 py-0.5 text-xs font-medium text-orange-200",
  };

  return classes[prioridade];
}

function rotuloPrioridade(prioridade: PrioridadePendencia) {
  const rotulos: Record<PrioridadePendencia, string> = {
    alta: "Alta prioridade",
    baixa: "Baixa prioridade",
    media: "Media prioridade",
  };

  return rotulos[prioridade];
}

function normalizarFiltroPagamento(
  valor: string | undefined,
): FiltroPagamentoPendencia {
  if (
    valor === "vencidos" ||
    valor === "aguardando" ||
    valor === "recebidos" ||
    valor === "confirmadas-sem-pagamento"
  ) {
    return valor;
  }

  return "todos";
}

function filtrarPagamentos(
  reservas: ReservaConfirmacao[],
  filtro: FiltroPagamentoPendencia,
) {
  if (filtro === "vencidos") return reservas.filter(temPagamentoVencido);
  if (filtro === "aguardando") {
    return reservas.filter((reserva) => !temPagamentoVencido(reserva));
  }
  if (filtro === "confirmadas-sem-pagamento") {
    return reservas.filter(
      (reserva) =>
        ["confirmed", "awaiting_payment"].includes(reserva.status) &&
        calcularSaldoPendente(reserva) > 0,
    );
  }
  if (filtro === "recebidos") return [];
  return reservas;
}

function contarPagamentos(
  reservas: ReservaConfirmacao[],
  pagamentosRecebidos: number,
): Record<FiltroPagamentoPendencia, number> {
  return {
    aguardando: reservas.filter((reserva) => !temPagamentoVencido(reserva)).length,
    "confirmadas-sem-pagamento": reservas.filter(
      (reserva) =>
        ["confirmed", "awaiting_payment"].includes(reserva.status) &&
        calcularSaldoPendente(reserva) > 0,
    ).length,
    recebidos: pagamentosRecebidos,
    todos: reservas.length,
    vencidos: reservas.filter(temPagamentoVencido).length,
  };
}

function mensagemVaziaPagamento(filtro: FiltroPagamentoPendencia) {
  const mensagens: Record<FiltroPagamentoPendencia, string> = {
    aguardando: "Nenhum pagamento exige acao agora.",
    "confirmadas-sem-pagamento": "Nenhuma reserva confirmada esta sem pagamento pendente.",
    recebidos: "Pagamentos recebidos nao exigem acao aqui. Consulte o financeiro ou o sininho.",
    todos: "Nenhum pagamento exige acao agora.",
    vencidos: "Nenhum pagamento vencido no momento.",
  };

  return mensagens[filtro];
}

function hrefFiltroPagamento(filtro: FiltroPagamentoPendencia) {
  return filtro === "todos" ? "/pendencias" : `/pendencias?pagamento=${filtro}`;
}

function montarResumoInteligente(
  resumo: DadosConfirmacoes["resumo"],
  totalItens: number,
) {
  if (totalItens === 0) {
    return "Tudo certo por agora. Nenhuma acao exige sua atencao no momento.";
  }

  const partes = [
    formatarParte(resumo.aguardandoPagamento, "pagamento pendente", "pagamentos pendentes"),
    formatarParte(resumo.pendentes, "solicitacao aguardando resposta", "solicitacoes aguardando resposta"),
    formatarParte(resumo.checkInsHoje, "check-in pendente", "check-ins pendentes"),
    formatarParte(resumo.checkOutsHoje, "check-out pendente", "check-outs pendentes"),
    formatarParte(resumo.limpezasPendentes, "limpeza pendente", "limpezas pendentes"),
  ].filter(Boolean);

  const semOperacao =
    resumo.checkInsHoje === 0 &&
    resumo.checkOutsHoje === 0 &&
    resumo.limpezasPendentes === 0;
  const complemento = semOperacao
    ? " Nenhum check-in, checkout ou limpeza para hoje."
    : "";

  return `Voce tem ${partes.join(", ")}.${complemento}`;
}

function formatarParte(total: number, singular: string, plural: string) {
  if (total === 0) return "";
  return `${total} ${total === 1 ? singular : plural}`;
}

function temPagamentoVencido(reserva: ReservaConfirmacao) {
  return reserva.payment_status === "overdue" || reserva.cobrancas.some((cobranca) => cobranca.status === "overdue");
}

function calcularSaldoPendente(reserva: ReservaConfirmacao) {
  const cobrancaAberta = reserva.cobrancas.find((cobranca) =>
    ["pending", "partial", "overdue"].includes(cobranca.status),
  );

  if (cobrancaAberta) {
    return Math.max(Number(cobrancaAberta.amount) - Number(cobrancaAberta.amount_paid), 0);
  }

  const valorPago = reserva.pagamentos
    .filter((pagamento) => pagamento.status === "confirmed" && pagamento.reversal_type === null)
    .reduce((total, pagamento) => total + Number(pagamento.amount), 0);

  return Math.max(Number(reserva.total_amount) - valorPago, 0);
}
