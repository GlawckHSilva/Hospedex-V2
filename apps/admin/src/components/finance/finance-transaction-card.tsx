import {
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarDays,
  Eye,
  Home,
  Pencil,
  ReceiptText,
  Tag,
  Trash2,
  User,
} from "lucide-react";
import type { ReactNode } from "react";

import { Badge, Card, CardContent, cn } from "@hospedex/ui";

import { excluirLancamentoFinanceiroAction } from "../../lib/finance/actions";
import {
  LABEL_STATUS_LANCAMENTO,
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
 * Lancamentos de reserva ficam somente leitura para preservar o historico
 * financeiro quando pagamentos online e conciliacao forem implementados.
 */
export type FinanceTransactionCardProps = Pick<
  DadosModuloFinanceiro,
  "categorias" | "contas" | "filtros" | "podeGerenciar" | "propriedades"
> & {
  lancamento: LancamentoFinanceiro;
};

export function FinanceTransactionCard({
  categorias,
  contas,
  filtros,
  lancamento,
  podeGerenciar,
  propriedades,
}: FinanceTransactionCardProps) {
  const manual = !lancamento.reservation_id;
  const podeEditar = podeGerenciar && manual;
  const receita = lancamento.transaction_type === "income";
  const descricao = lancamento.description ?? "Lancamento sem descricao";
  const vinculo = obterVinculo(lancamento);

  return (
    <Card
      className={cn(
        "admin-glass-card overflow-hidden transition",
        receita
          ? "border-emerald-400/25 bg-emerald-500/5"
          : "border-rose-400/25 bg-rose-500/5",
      )}
    >
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap gap-2">
              <Badge variant={receita ? "success" : "warning"}>
                {LABEL_TIPO_LANCAMENTO[lancamento.transaction_type]}
              </Badge>
              <Badge variant={obterVariantStatusFinanceiro(lancamento.status)}>
                {LABEL_STATUS_LANCAMENTO[lancamento.status]}
              </Badge>
            </div>
            <h3 className="line-clamp-2 text-sm font-semibold tracking-normal">
              {descricao}
            </h3>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {lancamento.categoria?.name ?? "Sem categoria"}
            </p>
          </div>

          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border",
              receita
                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-600 dark:text-emerald-300"
                : "border-rose-400/30 bg-rose-400/10 text-rose-600 dark:text-rose-300",
            )}
          >
            {receita ? <ArrowUpCircle className="h-5 w-5" /> : <ArrowDownCircle className="h-5 w-5" />}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Info icon={<ReceiptText />} label="Valor" valor={formatarValor(lancamento)} destaque={receita ? "income" : "expense"} />
          <Info icon={<CalendarDays />} label="Data" valor={formatarData(lancamento)} />
          <Info icon={<Tag />} label="Categoria" valor={lancamento.categoria?.name ?? "Sem categoria"} />
          <Info icon={<User />} label="Hóspede" valor={lancamento.guest_name ?? "Sem hóspede"} />
          <Info icon={<Home />} label="Vinculo" valor={vinculo} />
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <EntityModal
            description="Resumo do lancamento financeiro."
            eyebrow="Visualizacao"
            title={descricao}
            triggerAction="view"
            triggerClassName="h-9 justify-center"
            triggerIcon={<Eye className="h-4 w-4" />}
            triggerLabel="Visualizar"
          >
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <Info label="Tipo" valor={LABEL_TIPO_LANCAMENTO[lancamento.transaction_type]} />
                <Info label="Status" valor={LABEL_STATUS_LANCAMENTO[lancamento.status]} />
                <Info label="Descricao" valor={descricao} />
                <Info label="Categoria" valor={lancamento.categoria?.name ?? "Sem categoria"} />
                <Info label="Conta" valor={lancamento.conta?.name ?? "Conta removida"} />
                <Info label="Casa" valor={lancamento.propriedade?.name ?? "Sem vinculo"} />
                <Info label="Hóspede" valor={lancamento.guest_name ?? "Sem hóspede"} />
                <Info label="Reserva" valor={lancamento.reservation_id ? encurtarId(lancamento.reservation_id) : "Sem reserva"} />
                <Info label="Data" valor={formatarData(lancamento)} />
              </div>

              {podeEditar ? (
                <form
                  action={excluirLancamentoFinanceiroAction}
                  className="rounded-2xl border border-red-400/25 bg-red-500/5 p-4"
                >
                  <InputsRetorno filtros={filtros} lancamentoId={lancamento.id} />
                  <p className="text-sm font-semibold text-red-700 dark:text-red-200">
                    Excluir lancamento
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Esta acao remove apenas lancamentos manuais deste tenant.
                  </p>
                  <label className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
                    <input className="mt-1" required type="checkbox" />
                    Confirmo que quero excluir este lancamento manual.
                  </label>
                  <div className="mt-4 flex justify-end">
                    <ActionButton icon={<Trash2 />} type="submit" variant="delete">
                      Excluir lancamento
                    </ActionButton>
                  </div>
                </form>
              ) : null}
            </div>
          </EntityModal>

          <EntityModal
            description="Atualize os dados do lancamento manual."
            disabled={!podeEditar}
            eyebrow="Edicao"
            title="Editar lancamento"
            triggerAction="edit"
            triggerClassName="h-9 justify-center"
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
      </CardContent>
    </Card>
  );
}

function Info({
  destaque,
  icon,
  label,
  valor,
}: {
  destaque?: "expense" | "income";
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
      <p
        className={cn(
          "mt-1 truncate font-semibold",
          destaque === "income" && "text-emerald-600 dark:text-emerald-300",
          destaque === "expense" && "text-rose-600 dark:text-rose-300",
        )}
      >
        {valor}
      </p>
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

function formatarValor(lancamento: LancamentoFinanceiro) {
  const valor = formatarMoeda(Number(lancamento.amount));
  return lancamento.transaction_type === "expense" ? `-${valor}` : `+${valor}`;
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(valor);
}

function formatarData(lancamento: LancamentoFinanceiro) {
  const data = (
    lancamento.due_date ??
    lancamento.paid_at ??
    lancamento.created_at
  ).slice(0, 10);
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: "UTC",
  }).format(new Date(`${data}T00:00:00Z`));
}

function obterVinculo(lancamento: LancamentoFinanceiro) {
  if (lancamento.propriedade?.name && lancamento.reservation_id) {
    return `${lancamento.propriedade.name} / Reserva ${encurtarId(lancamento.reservation_id)}`;
  }
  if (lancamento.propriedade?.name) return lancamento.propriedade.name;
  if (lancamento.reservation_id) return `Reserva ${encurtarId(lancamento.reservation_id)}`;
  return "Sem vinculo";
}

function encurtarId(id: string) {
  return id.slice(0, 8);
}
