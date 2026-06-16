import type { ExpenseCategoryRow, FinancialAccountRow, PropertyRow } from "@hospedex/types";
import type { ComponentProps } from "react";

import { Button, Input, Label } from "@hospedex/ui";

import {
  atualizarLancamentoFinanceiroAction,
  criarLancamentoFinanceiroAction
} from "../../lib/finance/actions";
import {
  LABEL_STATUS_LANCAMENTO,
  LABEL_TIPO_LANCAMENTO,
  STATUS_LANCAMENTO_FINANCEIRO,
  TIPOS_LANCAMENTO_FINANCEIRO,
  type FiltrosFinanceiro,
  type LancamentoFinanceiro
} from "../../lib/finance/types";

/**
 * Formulário de lançamento financeiro manual.
 *
 * A categoria é validada novamente no servidor para impedir que uma despesa use
 * categoria de receita ou vice-versa apenas manipulando o HTML.
 */

export type FinanceFormProps = {
  categorias: ExpenseCategoryRow[];
  contas: FinancialAccountRow[];
  filtros: FiltrosFinanceiro;
  lancamento?: LancamentoFinanceiro;
  modo: "criar" | "editar";
  podeGerenciar: boolean;
  propriedades: PropertyRow[];
};

const campoClasse =
  "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export function FinanceForm({
  categorias,
  contas,
  filtros,
  lancamento,
  modo,
  podeGerenciar,
  propriedades
}: FinanceFormProps) {
  const action =
    modo === "criar"
      ? criarLancamentoFinanceiroAction
      : atualizarLancamentoFinanceiroAction;
  const bloqueado = !podeGerenciar || contas.length === 0 || categorias.length === 0;

  return (
    <form action={action} className="grid gap-4">
      <input name="mes" type="hidden" value={filtros.mes} />
      <input name="filtroTipo" type="hidden" value={filtros.tipo} />
      <input name="filtroStatus" type="hidden" value={filtros.status} />
      {lancamento ? <input name="lancamentoId" type="hidden" value={lancamento.id} /> : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <CampoTipo defaultValue={obterTipoPadrao(lancamento)} disabled={bloqueado} />
        <CampoStatus defaultValue={lancamento?.status ?? "pending"} disabled={bloqueado} />
        <CampoTexto
          defaultValue={obterDataPadrao(lancamento)}
          disabled={bloqueado}
          label="Data"
          name="dataReferencia"
          required
          type="date"
        />
        <CampoTexto
          defaultValue={lancamento ? String(Number(lancamento.amount).toFixed(2)) : ""}
          disabled={bloqueado}
          label="Valor"
          min="0.01"
          name="valor"
          required
          step="0.01"
          type="number"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <CampoConta
          contas={contas}
          defaultValue={lancamento?.financial_account_id ?? contas[0]?.id ?? ""}
          disabled={bloqueado}
        />
        <CampoCategoria
          categorias={categorias}
          defaultValue={lancamento?.expense_category_id ?? categorias[0]?.id ?? ""}
          disabled={bloqueado}
        />
        <CampoPropriedade
          defaultValue={lancamento?.property_id ?? ""}
          disabled={bloqueado}
          propriedades={propriedades}
        />
      </div>

      <CampoTexto
        defaultValue={lancamento?.description ?? ""}
        disabled={bloqueado}
        label="Descrição"
        name="descricao"
        placeholder="Ex.: compra de produtos de limpeza"
        required
      />

      <div className="flex justify-end">
        <Button disabled={bloqueado} type="submit">
          {modo === "criar" ? "Criar lançamento" : "Salvar lançamento"}
        </Button>
      </div>
    </form>
  );
}

function CampoTexto({
  label,
  name,
  ...props
}: {
  label: string;
  name: string;
} & ComponentProps<typeof Input>) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} {...props} />
    </div>
  );
}

function CampoTipo({ defaultValue, disabled }: { defaultValue: string; disabled: boolean }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="tipo">Tipo</Label>
      <select className={campoClasse} defaultValue={defaultValue} disabled={disabled} id="tipo" name="tipo">
        {TIPOS_LANCAMENTO_FINANCEIRO.map((tipo) => (
          <option key={tipo} value={tipo}>
            {LABEL_TIPO_LANCAMENTO[tipo]}
          </option>
        ))}
      </select>
    </div>
  );
}

function CampoStatus({ defaultValue, disabled }: { defaultValue: string; disabled: boolean }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="status">Status</Label>
      <select
        className={campoClasse}
        defaultValue={defaultValue}
        disabled={disabled}
        id="status"
        name="status"
      >
        {STATUS_LANCAMENTO_FINANCEIRO.map((status) => (
          <option key={status} value={status}>
            {LABEL_STATUS_LANCAMENTO[status]}
          </option>
        ))}
      </select>
    </div>
  );
}

function CampoConta({
  contas,
  defaultValue,
  disabled
}: {
  contas: FinancialAccountRow[];
  defaultValue: string;
  disabled: boolean;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="contaId">Conta</Label>
      <select className={campoClasse} defaultValue={defaultValue} disabled={disabled} id="contaId" name="contaId">
        {contas.map((conta) => (
          <option key={conta.id} value={conta.id}>
            {conta.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function CampoCategoria({
  categorias,
  defaultValue,
  disabled
}: {
  categorias: ExpenseCategoryRow[];
  defaultValue: string;
  disabled: boolean;
}) {
  const receitas = categorias.filter((categoria) => categoria.kind === "income");
  const despesas = categorias.filter((categoria) => categoria.kind === "expense");

  return (
    <div className="grid gap-2">
      <Label htmlFor="categoriaId">Categoria</Label>
      <select
        className={campoClasse}
        defaultValue={defaultValue}
        disabled={disabled}
        id="categoriaId"
        name="categoriaId"
      >
        <optgroup label="Receitas">
          {receitas.map((categoria) => (
            <option key={categoria.id} value={categoria.id}>
              {categoria.name}
            </option>
          ))}
        </optgroup>
        <optgroup label="Despesas">
          {despesas.map((categoria) => (
            <option key={categoria.id} value={categoria.id}>
              {categoria.name}
            </option>
          ))}
        </optgroup>
      </select>
    </div>
  );
}

function CampoPropriedade({
  defaultValue,
  disabled,
  propriedades
}: {
  defaultValue: string;
  disabled: boolean;
  propriedades: PropertyRow[];
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="propriedadeId">Propriedade</Label>
      <select
        className={campoClasse}
        defaultValue={defaultValue}
        disabled={disabled}
        id="propriedadeId"
        name="propriedadeId"
      >
        <option value="">Sem vínculo</option>
        {propriedades.map((propriedade) => (
          <option key={propriedade.id} value={propriedade.id}>
            {propriedade.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function obterTipoPadrao(lancamento?: LancamentoFinanceiro) {
  return lancamento?.transaction_type === "expense" ? "expense" : "income";
}

function obterDataPadrao(lancamento?: LancamentoFinanceiro) {
  return (lancamento?.due_date ?? lancamento?.paid_at ?? new Date().toISOString()).slice(0, 10);
}
