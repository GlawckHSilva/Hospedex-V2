import {
  ArrowDownCircle,
  ArrowUpCircle,
  Eye,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import type { ReactNode } from "react";

import { Badge, Card, CardContent, cn } from "@hospedex/ui";

import { excluirLancamentoFinanceiroAction } from "../../lib/finance/actions";
import {
  LABEL_TIPO_LANCAMENTO,
  obterVariantStatusFinanceiro,
  type DadosModuloFinanceiro,
  type LancamentoFinanceiro,
} from "../../lib/finance/types";
import { ActionButton } from "../management/action-button";
import { EntityModal } from "../management/entity-modal";
import { FinanceForm } from "./finance-form";

/**
 * Card compacto de lancamento financeiro.
 *
 * A tela financeira usa cards em vez de tabela para preservar leitura rapida
 * em desktop e mobile sem alterar regras de tenant, permissoes ou calculos.
 */
export type FinanceTransactionCardProps = Pick<
  DadosModuloFinanceiro,
  "categorias" | "contas" | "filtros" | "podeGerenciar" | "propriedades"
> & {
  lancamento: LancamentoFinanceiro;
};

export function FinanceTransactionCard(props: FinanceTransactionCardProps) {
  const { lancamento } = props;
  const receita = lancamento.transaction_type === "income";
  const cancelado = lancamentoCanceladoOuEstornado(lancamento);

  return (
    <Card className={cn("admin-glass-card relative overflow-hidden", obterClasseCard(lancamento))}>
      <CardContent className="p-4 sm:p-5">
        <div className="grid gap-4 md:grid-cols-[4.5rem_minmax(0,1fr)_auto]">
          <div className="flex items-center gap-3 md:flex-col md:items-start">
            <span
              className={cn(
                "flex h-14 w-14 items-center justify-center rounded-2xl border shadow-sm [&_svg]:h-7 [&_svg]:w-7",
                receita
                  ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-400"
                  : "border-rose-400/25 bg-rose-500/10 text-rose-400",
                lancamento.status === "pending" &&
                  "border-orange-400/25 bg-orange-500/10 text-orange-300",
                cancelado &&
                  "border-slate-400/20 bg-slate-500/10 text-muted-foreground",
              )}
            >
              {receita ? <ArrowUpCircle /> : <ArrowDownCircle />}
            </span>

            <Badge
              className="w-fit"
              variant={cancelado ? "secondary" : receita ? "success" : "danger"}
            >
              {LABEL_TIPO_LANCAMENTO[lancamento.transaction_type]}
            </Badge>
          </div>

          <div className="min-w-0">
            <h3 className="line-clamp-2 text-base font-semibold tracking-normal">
              {obterDescricao(lancamento)}
            </h3>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {obterOrigem(lancamento)}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge
                className={cn("max-w-[190px] truncate", obterClasseCategoria(lancamento))}
                variant={obterVariantCategoria(lancamento)}
              >
                {obterCategoria(lancamento)}
              </Badge>
            </div>

            <p className="mt-3 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              <span className="truncate">{obterHospedeOuCasa(lancamento)}</span>
              <span aria-hidden="true">•</span>
              <span>{formatarData(lancamento)}</span>
            </p>
          </div>

          <div className="flex min-w-[150px] flex-row items-start justify-between gap-4 md:flex-col md:items-end">
            <div className="flex items-center gap-2">
              <Badge variant={obterVariantStatusFinanceiro(lancamento.status)}>
                {obterLabelStatus(lancamento)}
              </Badge>
              <MaisAcoesLancamento {...props} />
            </div>
            <ValorLancamento lancamento={lancamento} />
          </div>
        </div>

        <FinanceActions {...props} />
      </CardContent>
    </Card>
  );
}

function FinanceActions({
  categorias,
  contas,
  filtros,
  lancamento,
  podeGerenciar,
  propriedades,
}: FinanceTransactionCardProps) {
  const manual = !lancamento.reservation_id;
  const podeEditar = podeGerenciar && manual && !lancamentoCanceladoOuEstornado(lancamento);
  const descricao = obterDescricao(lancamento);

  return (
    <div className="mt-4 flex flex-wrap justify-end gap-2">
      <EntityModal
        description="Resumo do lançamento financeiro."
        eyebrow="Visualização"
        title={descricao}
        triggerAction="view"
        triggerClassName="h-9 justify-center px-4"
        triggerIcon={<Eye className="h-4 w-4" />}
        triggerLabel="Visualizar"
      >
        <DetalheLancamento descricao={descricao} lancamento={lancamento} />
      </EntityModal>

      <EntityModal
        description="Atualize os dados do lançamento manual."
        disabled={!podeEditar}
        eyebrow="Edição"
        title="Editar lançamento"
        triggerAction="edit"
        triggerClassName="h-9 justify-center px-4"
        triggerIcon={<Pencil className="h-4 w-4" />}
        triggerLabel="Editar"
      >
        <FinanceForm
          categorias={categorias}
          contas={contas}
          filtros={filtros}
          lancamento={lancamento}
          modo="editar"
          podeGerenciar={podeEditar}
          propriedades={propriedades}
        />
      </EntityModal>
    </div>
  );
}

function MaisAcoesLancamento({
  filtros,
  lancamento,
  podeGerenciar,
}: FinanceTransactionCardProps) {
  const podeExcluir = podeGerenciar && !lancamento.reservation_id;

  return (
    <EntityModal
      description="Ações secundárias disponíveis para este lançamento."
      eyebrow="Ações"
      title="Mais ações"
      triggerAction="settings"
      triggerClassName="h-8 w-8 border-transparent bg-transparent px-0 shadow-none"
      triggerIcon={<MoreHorizontal className="h-4 w-4" />}
      triggerLabel="Mais ações"
      triggerSize="icon"
    >
      <div className="space-y-4">
        {lancamento.reservation_id ? (
          <Info
            label="Reserva vinculada"
            valor={`Reserva ${encurtarId(lancamento.reservation_id)}`}
          />
        ) : (
          <Info label="Origem" valor="Lançamento manual" />
        )}

        {podeExcluir ? (
          <form
            action={excluirLancamentoFinanceiroAction}
            className="rounded-2xl border border-red-400/25 bg-red-500/5 p-4"
          >
            <InputsRetorno filtros={filtros} lancamentoId={lancamento.id} />
            <p className="text-sm font-semibold text-red-700 dark:text-red-200">
              Excluir lançamento
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Esta ação remove apenas lançamentos manuais deste tenant.
            </p>
            <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm text-muted-foreground">
              <input className="mt-1" required type="checkbox" />
              Confirmo que quero excluir este lançamento manual.
            </label>
            <div className="mt-4 flex justify-end">
              <ActionButton icon={<Trash2 />} type="submit" variant="delete">
                Excluir lançamento
              </ActionButton>
            </div>
          </form>
        ) : (
          <p className="rounded-xl border bg-background/55 p-3 text-sm text-muted-foreground">
            Não há ações secundárias destrutivas disponíveis para este lançamento.
          </p>
        )}
      </div>
    </EntityModal>
  );
}

function DetalheLancamento({
  descricao,
  lancamento,
}: {
  descricao: string;
  lancamento: LancamentoFinanceiro;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Info
          label="Tipo"
          valor={LABEL_TIPO_LANCAMENTO[lancamento.transaction_type]}
        />
        <Info label="Status" valor={obterLabelStatus(lancamento)} />
        <Info label="Categoria" valor={obterCategoria(lancamento)} />
        <Info
          label="Conta"
          valor={lancamento.conta?.name ?? "Conta removida"}
        />
        <Info
          label="Casa"
          valor={lancamento.propriedade?.name ?? "Sem vínculo"}
        />
        <Info
          label="Hóspede"
          valor={lancamento.guest_name ?? "Sem hóspede"}
        />
        <Info
          label="Reserva"
          valor={
            lancamento.reservation_id
              ? encurtarId(lancamento.reservation_id)
              : "Sem reserva"
          }
        />
        <Info label="Data" valor={formatarData(lancamento)} />
      </div>

      <div className="rounded-xl border bg-background/55 p-3 text-sm">
        <p className="text-xs text-muted-foreground">Descrição completa</p>
        <p className="mt-1 whitespace-pre-wrap font-medium">{descricao}</p>
      </div>
    </div>
  );
}

function Info({
  icon,
  label,
  valor,
}: {
  icon?: ReactNode;
  label: string;
  valor: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border bg-background/55 p-3 text-sm">
      <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
        <span className="[&_svg]:h-3.5 [&_svg]:w-3.5">{icon}</span>
        <span>{label}</span>
      </div>
      <p className="mt-1 truncate font-semibold">{valor}</p>
    </div>
  );
}

function InputsRetorno({
  filtros,
  lancamentoId,
}: {
  filtros: DadosModuloFinanceiro["filtros"];
  lancamentoId: string;
}) {
  return (
    <>
      <input name="lancamentoId" type="hidden" value={lancamentoId} />
      <input name="mes" type="hidden" value={filtros.mes} />
      <input name="filtroTipo" type="hidden" value={filtros.tipo} />
      <input name="filtroStatus" type="hidden" value={filtros.status} />
      <input name="filtroCategoriaId" type="hidden" value={filtros.categoriaId} />
      <input name="filtroBusca" type="hidden" value={filtros.busca} />
    </>
  );
}

function ValorLancamento({ lancamento }: { lancamento: LancamentoFinanceiro }) {
  const cancelado = lancamentoCanceladoOuEstornado(lancamento);
  const pendente = lancamento.status === "pending";
  const despesa = lancamento.transaction_type === "expense";

  return (
    <div className="min-w-[130px] text-right">
      <p
        className={cn(
          "text-xl font-semibold",
          despesa ? "text-rose-500" : "text-emerald-500",
          pendente && "text-orange-500",
          cancelado && "text-muted-foreground line-through decoration-red-400/70",
        )}
      >
        {formatarValor(lancamento)}
      </p>
      {cancelado ? (
        <p className="mt-0.5 text-xs text-muted-foreground">não contabilizado</p>
      ) : null}
    </div>
  );
}

function formatarValor(lancamento: LancamentoFinanceiro) {
  const valor = formatarMoeda(Number(lancamento.amount));
  if (lancamentoCanceladoOuEstornado(lancamento)) return valor;
  return lancamento.transaction_type === "expense" ? `- ${valor}` : `+ ${valor}`;
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(valor);
}

function formatarData(lancamento: LancamentoFinanceiro) {
  const data = (
    lancamento.paid_at ??
    lancamento.due_date ??
    lancamento.created_at
  ).slice(0, 10);
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: "UTC",
  }).format(new Date(`${data}T00:00:00Z`));
}

function lancamentoCanceladoOuEstornado(lancamento: LancamentoFinanceiro) {
  return lancamento.status === "cancelled" || lancamento.status === "refunded";
}

function obterClasseCard(lancamento: LancamentoFinanceiro) {
  if (lancamentoCanceladoOuEstornado(lancamento)) {
    return "border-slate-400/25 bg-slate-500/[0.04] before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-slate-400/70";
  }
  if (lancamento.status === "pending") {
    return "border-orange-400/25 bg-orange-500/[0.04] before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-orange-400/80";
  }
  if (lancamento.transaction_type === "expense") {
    return "border-rose-400/25 bg-rose-500/[0.04] before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-rose-400/80";
  }
  return "border-emerald-400/25 bg-emerald-500/[0.04] before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-emerald-400/80";
}

function obterDescricao(lancamento: LancamentoFinanceiro) {
  return lancamento.description ?? "Lançamento sem descrição";
}

function obterCategoria(lancamento: LancamentoFinanceiro) {
  return lancamento.categoria?.name ?? (lancamento.reservation_id ? "Reserva" : "Manual");
}

function obterOrigem(lancamento: LancamentoFinanceiro) {
  if (lancamento.reservation_id) return `Reserva ${encurtarId(lancamento.reservation_id)}`;
  return lancamento.conta?.name ?? "Lançamento manual";
}

function obterHospedeOuCasa(lancamento: LancamentoFinanceiro) {
  if (lancamento.guest_name) return lancamento.guest_name;
  if (lancamento.propriedade?.name) return lancamento.propriedade.name;
  return "Geral";
}

function obterLabelStatus(lancamento: LancamentoFinanceiro) {
  if (lancamento.status === "paid") {
    return lancamento.transaction_type === "income" ? "Recebido" : "Pago";
  }
  if (lancamento.status === "pending") return "Pendente";
  if (lancamento.status === "refunded") return "Estornado";
  return "Cancelado";
}

function obterVariantCategoria(lancamento: LancamentoFinanceiro) {
  const nome = normalizarTexto(obterCategoria(lancamento));
  if (nome.includes("reserva")) return "info";
  if (nome.includes("servico") || nome.includes("serviço")) return "info";
  if (nome.includes("extra")) return "info";
  if (nome.includes("manutencao") || nome.includes("manutenção")) return "warning";
  if (nome.includes("compra") || nome.includes("suprimento")) return "danger";
  return "secondary";
}

function obterClasseCategoria(lancamento: LancamentoFinanceiro) {
  const nome = normalizarTexto(obterCategoria(lancamento));
  if (nome.includes("compra") || nome.includes("suprimento")) {
    return "border-orange-400/35 bg-orange-500/10 text-orange-300";
  }
  if (nome.includes("manutencao") || nome.includes("manutenção")) {
    return "border-purple-400/35 bg-purple-500/10 text-purple-300";
  }
  return "";
}

function normalizarTexto(valor: string) {
  return valor
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function encurtarId(id: string) {
  return id.slice(0, 8);
}
