import { Eye, Pencil } from "lucide-react";

import { Badge } from "@hospedex/ui";

import {
  EntityCard,
  EntityCardActions,
  EntityCardHeader,
} from "../management/entity-card";
import { EntityModal, EntityViewModal } from "../management/entity-modal";
import {
  LABEL_TIPO_LANCAMENTO,
  obterVariantStatusFinanceiro,
  type DadosModuloFinanceiro,
  type LancamentoFinanceiro,
} from "../../lib/finance/types";
import { LABEL_STATUS_LANCAMENTO } from "../../lib/finance/types";
import { FinanceForm } from "./finance-form";

/**
 * Card compacto de lancamento financeiro.
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
  const descricao = lancamento.description ?? "Lancamento sem descricao";

  return (
    <EntityCard>
      <EntityCardHeader
        badges={
          <>
            <Badge
              variant={lancamento.transaction_type === "income" ? "success" : "warning"}
            >
              {LABEL_TIPO_LANCAMENTO[lancamento.transaction_type]}
            </Badge>
            <Badge variant={obterVariantStatusFinanceiro(lancamento.status)}>
              {LABEL_STATUS_LANCAMENTO[lancamento.status]}
            </Badge>
          </>
        }
        subtitle={lancamento.categoria?.name ?? "Sem categoria"}
        title={descricao}
      />

      <div className="rounded-lg border bg-background/55 p-3 text-sm">
        <p className="text-xs text-muted-foreground">Valor</p>
        <p className="mt-1 text-xl font-semibold">
          {formatarMoeda(Number(lancamento.amount))}
        </p>
      </div>

      <EntityCardActions>
        <EntityViewModal
          description="Resumo do lancamento financeiro."
          title={descricao}
          triggerClassName="h-9 justify-center"
          triggerIcon={<Eye className="h-4 w-4" />}
          triggerLabel="Visualizar"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <Info label="Categoria" valor={lancamento.categoria?.name ?? "Sem categoria"} />
            <Info label="Status" valor={LABEL_STATUS_LANCAMENTO[lancamento.status]} />
            <Info label="Conta" valor={lancamento.conta?.name ?? "Conta removida"} />
            <Info label="Propriedade" valor={lancamento.propriedade?.name ?? "Sem vinculo"} />
            <Info label="Data" valor={formatarData(lancamento)} />
            <Info label="Origem" valor={manual ? "Manual" : "Reserva"} />
          </div>
        </EntityViewModal>

        <EntityModal
          description="Atualize os dados do lancamento manual."
          disabled={!podeEditar}
          eyebrow="Edicao"
          title="Editar lancamento"
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
      </EntityCardActions>
    </EntityCard>
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
