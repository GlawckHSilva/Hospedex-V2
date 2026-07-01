import {
  Banknote,
  CalendarClock,
  ChartNoAxesCombined,
  CircleDollarSign,
  Plus,
  Search,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Card, CardContent, FadeIn, Input, Label, cn } from "@hospedex/ui";

import { ModuleToast } from "../admin/module-toast";
import { EmptyState } from "../management/entity-card";
import { EntityModal } from "../management/entity-modal";
import { ActionButton } from "../management/action-button";
import {
  LABEL_STATUS_LANCAMENTO,
  LABEL_TIPO_LANCAMENTO,
  STATUS_LANCAMENTO_FINANCEIRO,
  TIPOS_LANCAMENTO_FINANCEIRO,
  type DadosModuloFinanceiro,
  type SearchParamsFinanceiro,
} from "../../lib/finance/types";
import { FinanceForm } from "./finance-form";
import {
  FinanceTransactionCard,
} from "./finance-transaction-card";

/**
 * Modulo financeiro do Gerenciamento.
 *
 * Esta tela exibe apenas dados do tenant autenticado e separa dinheiro recebido,
 * pendente e cancelado para evitar leituras erradas do caixa mensal.
 */
export type FinanceModuleProps = DadosModuloFinanceiro &
  SearchParamsFinanceiro & {
    tenantNome: string;
  };

const MENSAGENS_SUCESSO_FINANCEIRO: Record<string, string> = {
  "lancamento-atualizado": "Lançamento atualizado com sucesso.",
  "lancamento-criado": "Lançamento criado com sucesso.",
  "lancamento-excluido": "Lançamento excluído com sucesso.",
};

const campoClasse =
  "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function FinanceModule({
  categorias,
  contas,
  erro,
  filtros,
  lancamentos,
  podeGerenciar,
  propriedades,
  resumo,
  sucesso,
}: FinanceModuleProps) {
  const existemFiltrosAtivos =
    Boolean(filtros.busca) ||
    filtros.categoriaId !== "todas" ||
    filtros.status !== "todos" ||
    filtros.tipo !== "todos";

  return (
    <FadeIn className="space-y-5">
      <ModuleToast
        erro={erro}
        mensagensSucesso={MENSAGENS_SUCESSO_FINANCEIRO}
        sucesso={sucesso}
      />

      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal">
            Financeiro
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Controle receitas, despesas, pendências e lançamentos do mês.
          </p>
        </div>

        <EntityModal
          description="Informe tipo, valor, vencimento, conta e categoria."
          disabled={!podeGerenciar}
          eyebrow="Cadastro"
          title="Novo lançamento"
          triggerAction="add"
          triggerClassName="h-11 px-5 text-sm"
          triggerIcon={<Plus className="h-4 w-4" />}
          triggerLabel="Novo lançamento"
          triggerSize="md"
        >
          <FinanceForm
            categorias={categorias}
            contas={contas}
            filtros={filtros}
            modo="criar"
            podeGerenciar={podeGerenciar}
            propriedades={propriedades}
          />
        </EntityModal>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Resumo
          icon={<TrendingUp />}
          label="Receita do mês"
          tone="income"
          valor={formatarMoeda(resumo.receitaMes)}
          variacao="Entradas recebidas"
        />
        <Resumo
          icon={<TrendingDown />}
          label="Despesas do mês"
          tone="expense"
          valor={formatarMoeda(resumo.despesasMes)}
          variacao="Saídas pagas"
        />
        <Resumo
          icon={<ChartNoAxesCombined />}
          label="Lucro do mês"
          tone={resumo.lucroMes >= 0 ? "profit" : "expense"}
          valor={formatarMoeda(resumo.lucroMes)}
          variacao="Receitas menos despesas"
        />
        <Resumo
          icon={<Banknote />}
          label="Reservas pagas"
          tone="income"
          valor={String(resumo.reservasPagas)}
          variacao="Confirmadas no mês"
        />
        <Resumo
          icon={<CalendarClock />}
          label="Pendentes"
          tone="pending"
          valor={String(resumo.reservasPendentes)}
          variacao="Exigem atenção"
        />
        <Resumo
          icon={<WalletCards />}
          label="Ticket médio"
          tone="neutral"
          valor={formatarMoeda(resumo.ticketMedio)}
          variacao="Por reserva paga"
        />
      </section>

      <Card className="admin-glass-card">
        <CardContent className="p-4">
          <form className="hidden gap-4 lg:grid xl:grid-cols-[0.85fr_0.85fr_0.85fr_1fr_minmax(220px,1.8fr)_auto]">
            <CampoMes defaultValue={filtros.mes} />
            <CampoTipoFiltro defaultValue={filtros.tipo} />
            <CampoStatusFiltro defaultValue={filtros.status} />
            <CampoCategoriaFiltro
              categorias={categorias}
              defaultValue={filtros.categoriaId}
            />
            <CampoBusca defaultValue={filtros.busca} />
            <div className="flex items-end">
              <ActionButton
                className="h-10 w-full px-4"
                icon={<Search />}
                type="submit"
                variant="settings"
              >
                Filtrar
              </ActionButton>
            </div>
          </form>

          <form className="space-y-3 lg:hidden">
            <CampoBusca defaultValue={filtros.busca} id="busca-mobile" />
            <details className="group rounded-xl border border-cyan-400/20 bg-background/45">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-semibold text-cyan-700 marker:hidden dark:text-cyan-200">
                <span className="inline-flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filtros
                </span>
                <span className="text-xs text-muted-foreground group-open:hidden">
                  abrir
                </span>
                <span className="hidden text-xs text-muted-foreground group-open:inline">
                  fechar
                </span>
              </summary>
              <div className="grid gap-4 px-3 pb-3 pt-1">
                <CampoMes defaultValue={filtros.mes} id="mes-mobile" />
                <CampoTipoFiltro defaultValue={filtros.tipo} id="tipo-mobile" />
                <CampoStatusFiltro defaultValue={filtros.status} id="status-mobile" />
                <CampoCategoriaFiltro
                  categorias={categorias}
                  defaultValue={filtros.categoriaId}
                  id="categoria-mobile"
                />
                <ActionButton
                  className="h-10 w-full px-4"
                  icon={<Search />}
                  type="submit"
                  variant="settings"
                >
                  Filtrar
                </ActionButton>
              </div>
            </details>
          </form>
        </CardContent>
      </Card>

      {contas.length === 0 || categorias.length === 0 ? (
        <EstadoVazio
          mensagem="As categorias e a conta inicial ainda não foram carregadas para este tenant."
          titulo="Financeiro ainda não configurado"
        />
      ) : lancamentos.length > 0 ? (
        <>
          <div className="grid gap-4 xl:grid-cols-2">
            {lancamentos.map((lancamento) => (
              <FinanceTransactionCard
                categorias={categorias}
                contas={contas}
                filtros={filtros}
                key={lancamento.id}
                lancamento={lancamento}
                podeGerenciar={podeGerenciar}
                propriedades={propriedades}
              />
            ))}
          </div>

          <AvisoFinanceiro />
        </>
      ) : (
        <EstadoVazio
          acao={
            existemFiltrosAtivos ? (
              <Link
                className="inline-flex h-10 items-center justify-center rounded-xl border border-cyan-400/35 bg-cyan-500/10 px-4 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-500/20 dark:text-cyan-200"
                href={`/financeiro?mes=${filtros.mes}`}
              >
                Limpar filtros
              </Link>
            ) : (
              <EntityModal
                description="Informe tipo, valor, vencimento, conta e categoria."
                disabled={!podeGerenciar}
                eyebrow="Cadastro"
                title="Novo lançamento"
                triggerAction="add"
                triggerIcon={<Plus className="h-4 w-4" />}
                triggerLabel="Novo lançamento"
                triggerSize="md"
              >
                <FinanceForm
                  categorias={categorias}
                  contas={contas}
                  filtros={filtros}
                  modo="criar"
                  podeGerenciar={podeGerenciar}
                  propriedades={propriedades}
                />
              </EntityModal>
            )
          }
          mensagem={
            existemFiltrosAtivos
              ? "Altere a busca ou limpe os filtros para continuar."
              : "Receitas, despesas e pagamentos aparecerão aqui conforme forem registrados."
          }
          titulo={
            existemFiltrosAtivos
              ? "Nenhum lançamento encontrado com esses filtros"
              : "Nenhum lançamento encontrado"
          }
        />
      )}
    </FadeIn>
  );
}

function Resumo({
  icon,
  label,
  tone = "neutral",
  valor,
  variacao,
}: {
  icon?: ReactNode;
  label: string;
  tone?: "expense" | "income" | "neutral" | "pending" | "profit";
  valor: string;
  variacao: string;
}) {
  return (
    <Card
      className={cn(
        "admin-glass-card overflow-hidden transition",
        tone === "income" && "border-emerald-400/25 bg-emerald-500/5",
        tone === "profit" && "border-cyan-400/25 bg-cyan-500/5",
        tone === "expense" && "border-rose-400/25 bg-rose-500/5",
        tone === "pending" && "border-orange-400/25 bg-orange-500/5",
      )}
    >
      <CardContent className="min-h-28 p-4">
        <div
          className={cn(
            "mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl border [&_svg]:h-4 [&_svg]:w-4",
            tone === "income" &&
              "border-emerald-400/30 bg-emerald-400/10 text-emerald-600 dark:text-emerald-300",
            tone === "profit" &&
              "border-cyan-400/30 bg-cyan-400/10 text-cyan-600 dark:text-cyan-300",
            tone === "expense" &&
              "border-rose-400/30 bg-rose-400/10 text-rose-600 dark:text-rose-300",
            tone === "pending" &&
              "border-orange-400/30 bg-orange-400/10 text-orange-600 dark:text-orange-300",
            tone === "neutral" &&
              "border-cyan-400/25 bg-cyan-400/10 text-cyan-600 dark:text-cyan-300",
          )}
        >
          {icon ?? <CircleDollarSign />}
        </div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p
          className={cn(
            "mt-1 truncate text-xl font-semibold",
            tone === "income" && "text-emerald-500 dark:text-emerald-300",
            tone === "profit" && "text-cyan-500 dark:text-cyan-300",
            tone === "expense" && "text-rose-500 dark:text-rose-300",
            tone === "pending" && "text-orange-500 dark:text-orange-300",
          )}
        >
          {valor}
        </p>
        <p className="mt-1 truncate text-xs text-muted-foreground">{variacao}</p>
      </CardContent>
    </Card>
  );
}

function AvisoFinanceiro() {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/[0.04] px-4 py-3 text-sm text-muted-foreground">
      <CircleDollarSign className="mt-0.5 h-4 w-4 shrink-0 text-cyan-500 dark:text-cyan-300" />
      <span>Lançamentos cancelados ou estornados não entram no total financeiro.</span>
    </div>
  );
}

function EstadoVazio({
  acao,
  mensagem,
  titulo = "Nenhum lançamento encontrado",
}: {
  acao?: ReactNode;
  mensagem: string;
  titulo?: string;
}) {
  return (
    <EmptyState
      action={acao}
      description={mensagem}
      icon={<CircleDollarSign className="h-5 w-5" />}
      title={titulo}
    />
  );
}

function CampoMes({
  defaultValue,
  id = "mes",
}: {
  defaultValue: string;
  id?: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>Mês</Label>
      <Input defaultValue={defaultValue} id={id} name="mes" required type="month" />
    </div>
  );
}

function CampoTipoFiltro({
  defaultValue,
  id = "tipo",
}: {
  defaultValue: string;
  id?: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>Tipo</Label>
      <select className={campoClasse} defaultValue={defaultValue} id={id} name="tipo">
        <option value="todos">Todos</option>
        {TIPOS_LANCAMENTO_FINANCEIRO.map((tipo) => (
          <option key={tipo} value={tipo}>
            {LABEL_TIPO_LANCAMENTO[tipo]}
          </option>
        ))}
      </select>
    </div>
  );
}

function CampoStatusFiltro({
  defaultValue,
  id = "status",
}: {
  defaultValue: string;
  id?: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>Status</Label>
      <select className={campoClasse} defaultValue={defaultValue} id={id} name="status">
        <option value="todos">Todos</option>
        {STATUS_LANCAMENTO_FINANCEIRO.map((status) => (
          <option key={status} value={status}>
            {LABEL_STATUS_LANCAMENTO[status]}
          </option>
        ))}
      </select>
    </div>
  );
}

function CampoCategoriaFiltro({
  categorias,
  defaultValue,
  id = "categoriaId",
}: {
  categorias: DadosModuloFinanceiro["categorias"];
  defaultValue: string;
  id?: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>Categoria</Label>
      <select
        className={campoClasse}
        defaultValue={defaultValue}
        id={id}
        name="categoriaId"
      >
        <option value="todas">Todas</option>
        {categorias.map((categoria) => (
          <option key={categoria.id} value={categoria.id}>
            {categoria.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function CampoBusca({
  defaultValue,
  id = "busca",
}: {
  defaultValue: string;
  id?: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>Busca</Label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          defaultValue={defaultValue}
          id={id}
          name="busca"
          placeholder="Buscar por descrição, casa, reserva ou hóspede"
        />
      </div>
    </div>
  );
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(valor);
}
