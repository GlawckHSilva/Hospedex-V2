import { Pencil, Trash2 } from "lucide-react";

import { Badge, Button, Card, CardContent } from "@hospedex/ui";

import { ConfirmDialog, EntityModal } from "../management/entity-modal";
import { excluirLancamentoFinanceiroAction } from "../../lib/finance/actions";
import {
  LABEL_TIPO_LANCAMENTO,
  obterVariantStatusFinanceiro,
  type DadosModuloFinanceiro,
  type LancamentoFinanceiro,
} from "../../lib/finance/types";
import { LABEL_STATUS_LANCAMENTO } from "../../lib/finance/types";
import { FinanceForm } from "./finance-form";

/**
 * Card de lançamento financeiro.
 *
 * A exclusão exige confirmação em modal para evitar remoção acidental.
 * Lançamentos vinculados a reserva ficam protegidos contra edição manual.
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

  return (
    <Card className="admin-glass-card">
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={
                  lancamento.transaction_type === "income"
                    ? "success"
                    : "warning"
                }
              >
                {LABEL_TIPO_LANCAMENTO[lancamento.transaction_type]}
              </Badge>
              <Badge variant={obterVariantStatusFinanceiro(lancamento.status)}>
                {LABEL_STATUS_LANCAMENTO[lancamento.status]}
              </Badge>
              {!manual ? <Badge variant="outline">Reserva</Badge> : null}
            </div>
            <h2 className="mt-3 text-lg font-semibold">
              {lancamento.description ?? "Lançamento sem descrição"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {lancamento.categoria?.name ?? "Sem categoria"} ·{" "}
              {lancamento.conta?.name ?? "Conta removida"}
            </p>
          </div>

          <div className="text-left lg:text-right">
            <p className="text-2xl font-semibold">
              {formatarMoeda(Number(lancamento.amount))}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatarData(lancamento)}
            </p>
          </div>
        </div>

        <div className="grid gap-3 text-sm md:grid-cols-3">
          <Info
            label="Propriedade"
            valor={lancamento.propriedade?.name ?? "Sem vínculo"}
          />
          <Info
            label="Conta"
            valor={lancamento.conta?.name ?? "Conta removida"}
          />
          <Info
            label="Categoria"
            valor={lancamento.categoria?.name ?? "Sem categoria"}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <EntityModal
            description="Atualize os dados do lançamento manual."
            disabled={!podeEditar}
            eyebrow="Edição"
            title="Editar lançamento"
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

          <ConfirmDialog
            description="Confirme apenas se este lançamento manual deve sair do financeiro."
            disabled={!podeEditar}
            title="Excluir lançamento"
            triggerIcon={<Trash2 className="h-4 w-4" />}
            triggerLabel="Excluir"
          >
            <form
              action={excluirLancamentoFinanceiroAction}
              className="grid gap-3"
            >
              <input name="lancamentoId" type="hidden" value={lancamento.id} />
              <input name="mes" type="hidden" value={filtros.mes} />
              <input name="filtroTipo" type="hidden" value={filtros.tipo} />
              <input name="filtroStatus" type="hidden" value={filtros.status} />
              <p className="text-sm text-muted-foreground">
                Confirme apenas se este lançamento manual deve sair do
                financeiro.
              </p>
              <Button
                disabled={!podeEditar}
                type="submit"
                variant="destructive"
              >
                Confirmar exclusão
              </Button>
            </form>
          </ConfirmDialog>
        </div>
      </CardContent>
    </Card>
  );
}

function Info({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-lg border bg-background/45 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-medium">{valor}</p>
    </div>
  );
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
