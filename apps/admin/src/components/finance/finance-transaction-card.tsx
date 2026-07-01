import {
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarDays,
  Eye,
  Pencil,
  Trash2,
  User,
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
 * Representacao visual de lancamentos financeiros.
 *
 * A tabela desktop privilegia leitura operacional. No mobile, o mesmo contrato
 * vira card compacto sem alterar regra financeira, tenant ou permissoes.
 */
export type FinanceTransactionCardProps = Pick<
  DadosModuloFinanceiro,
  "categorias" | "contas" | "filtros" | "podeGerenciar" | "propriedades"
> & {
  lancamento: LancamentoFinanceiro;
};

export function FinanceTransactionRow(props: FinanceTransactionCardProps) {
  const { lancamento } = props;
  const receita = lancamento.transaction_type === "income";
  const cancelado = lancamentoCanceladoOuEstornado(lancamento);
  const descricao = obterDescricao(lancamento);

  return (
    <tr
      className={cn(
        "border-b border-border/70 transition-colors last:border-b-0 hover:bg-cyan-500/[0.04]",
        cancelado && "text-muted-foreground",
      )}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-xl border",
              receita
                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-500"
                : "border-rose-400/30 bg-rose-400/10 text-rose-500",
              cancelado && "border-slate-400/20 bg-slate-500/10 text-muted-foreground",
            )}
          >
            {receita ? (
              <ArrowUpCircle className="h-4 w-4" />
            ) : (
              <ArrowDownCircle className="h-4 w-4" />
            )}
          </span>
          <span
            className={cn(
              "font-medium",
              receita ? "text-emerald-500" : "text-rose-500",
              cancelado && "text-muted-foreground",
            )}
          >
            {LABEL_TIPO_LANCAMENTO[lancamento.transaction_type]}
          </span>
        </div>
      </td>
      <td className="max-w-[280px] px-4 py-3">
        <p className="truncate font-semibold">{descricao}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {obterOrigem(lancamento)}
        </p>
      </td>
      <td className="px-4 py-3">
        <Badge
          className="max-w-[130px] truncate"
          variant={obterVariantCategoria(lancamento)}
        >
          {obterCategoria(lancamento)}
        </Badge>
      </td>
      <td className="max-w-[180px] px-4 py-3">
        <p className="truncate">{obterHospedeOuCasa(lancamento)}</p>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
        {formatarData(lancamento)}
      </td>
      <td className="px-4 py-3">
        <Badge variant={obterVariantStatusFinanceiro(lancamento.status)}>
          {obterLabelStatus(lancamento)}
        </Badge>
      </td>
      <td className="px-4 py-3 text-right">
        <ValorLancamento lancamento={lancamento} />
      </td>
      <td className="px-4 py-3">
        <FinanceActions {...props} compact />
      </td>
    </tr>
  );
}

export function FinanceTransactionMobileCard(props: FinanceTransactionCardProps) {
  const { lancamento } = props;
  const receita = lancamento.transaction_type === "income";
  const cancelado = lancamentoCanceladoOuEstornado(lancamento);

  return (
    <Card
      className={cn(
        "admin-glass-card overflow-hidden transition",
        receita
          ? "border-emerald-400/20 bg-emerald-500/[0.04]"
          : "border-rose-400/20 bg-rose-500/[0.04]",
        cancelado && "border-slate-400/20 bg-slate-500/[0.04]",
      )}
    >
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap gap-2">
              <Badge variant={receita ? "success" : "danger"}>
                {LABEL_TIPO_LANCAMENTO[lancamento.transaction_type]}
              </Badge>
              <Badge variant={obterVariantStatusFinanceiro(lancamento.status)}>
                {obterLabelStatus(lancamento)}
              </Badge>
              <Badge variant={obterVariantCategoria(lancamento)}>
                {obterCategoria(lancamento)}
              </Badge>
            </div>
            <h3 className="line-clamp-2 text-sm font-semibold tracking-normal">
              {obterDescricao(lancamento)}
            </h3>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {obterOrigem(lancamento)}
            </p>
          </div>
          <ValorLancamento lancamento={lancamento} />
        </div>

        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <Info icon={<User />} label="Hóspede/Casa" valor={obterHospedeOuCasa(lancamento)} />
          <Info icon={<CalendarDays />} label="Data" valor={formatarData(lancamento)} />
        </div>

        <FinanceActions {...props} />
      </CardContent>
    </Card>
  );
}

export function FinanceTransactionCard(props: FinanceTransactionCardProps) {
  return <FinanceTransactionMobileCard {...props} />;
}

function FinanceActions({
  categorias,
  compact = false,
  contas,
  filtros,
  lancamento,
  podeGerenciar,
  propriedades,
}: FinanceTransactionCardProps & { compact?: boolean }) {
  const manual = !lancamento.reservation_id;
  const podeEditar = podeGerenciar && manual;
  const descricao = obterDescricao(lancamento);

  return (
    <div
      className={cn(
        "flex flex-wrap gap-2",
        compact ? "justify-end" : "justify-end",
      )}
    >
      <EntityModal
        description="Resumo do lançamento financeiro."
        eyebrow="Visualização"
        title={descricao}
        triggerAction="view"
        triggerClassName={cn(compact ? "h-8 px-2.5" : "h-9 justify-center")}
        triggerIcon={<Eye className="h-4 w-4" />}
        triggerLabel={compact ? "Ver" : "Visualizar"}
      >
        <DetalheLancamento
          descricao={descricao}
          filtros={filtros}
          lancamento={lancamento}
          podeEditar={podeEditar}
        />
      </EntityModal>

      <EntityModal
        description="Atualize os dados do lançamento manual."
        disabled={!podeEditar}
        eyebrow="Edição"
        title="Editar lançamento"
        triggerAction="edit"
        triggerClassName={cn(compact ? "h-8 px-2.5" : "h-9 justify-center")}
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

function DetalheLancamento({
  descricao,
  filtros,
  lancamento,
  podeEditar,
}: {
  descricao: string;
  filtros: DadosModuloFinanceiro["filtros"];
  lancamento: LancamentoFinanceiro;
  podeEditar: boolean;
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

      {podeEditar ? (
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
      ) : null}
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
    <div className="min-w-[110px] text-right">
      <p
        className={cn(
          "font-semibold",
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
  return lancamento.transaction_type === "expense" ? `- ${valor}` : valor;
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
  if (nome.includes("servico") || nome.includes("serviço")) return "warning";
  if (nome.includes("extra")) return "info";
  if (nome.includes("manutencao") || nome.includes("manutenção")) return "warning";
  return "secondary";
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
