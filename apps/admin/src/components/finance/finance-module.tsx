import {
  Banknote,
  CalendarClock,
  ChartNoAxesCombined,
  CircleDollarSign,
  Filter,
  Plus,
  Search,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import type { ReactNode } from "react";

import { Badge, Card, CardContent, FadeIn, Input, Label, cn } from "@hospedex/ui";

import { ModuleToast } from "../admin/module-toast";
import { EmptyState, EntityGrid } from "../management/entity-card";
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
import { FinanceTransactionCard } from "./finance-transaction-card";

/**
 * Modulo financeiro do Gerenciamento.
 *
 * Esta tela foca controle mensal manual por tenant. Pagamento online, repasse e
 * conciliacao continuam fora do fluxo para evitar expor regras futuras antes da
 * infraestrutura segura estar pronta.
 */
export type FinanceModuleProps = DadosModuloFinanceiro &
  SearchParamsFinanceiro & {
    tenantNome: string;
  };

const MENSAGENS_SUCESSO_FINANCEIRO: Record<string, string> = {
  "lancamento-atualizado": "Lancamento atualizado com sucesso.",
  "lancamento-criado": "Lancamento criado com sucesso.",
  "lancamento-excluido": "Lancamento excluido com sucesso.",
};

const campoClasse =
  "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function FinanceModule({
  categorias,
  contas,
  erro,
  filtros,
  lancamentos,
  pagamentosOnlineAtivo,
  podeGerenciar,
  propriedades,
  resumo,
  sucesso,
  tenantNome,
}: FinanceModuleProps) {
  return (
    <FadeIn className="space-y-5">
      <ModuleToast
        erro={erro}
        mensagensSucesso={MENSAGENS_SUCESSO_FINANCEIRO}
        sucesso={sucesso}
      />

      <section className="admin-glass-panel p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Badge variant={podeGerenciar ? "info" : "warning"}>
              {podeGerenciar ? "Financeiro manual" : "Somente leitura"}
            </Badge>
            <h1 className="mt-3 text-2xl font-semibold tracking-normal">
              Financeiro
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {tenantNome} - controle mensal sem pagamento online. Pagamentos{" "}
              {pagamentosOnlineAtivo ? "liberados por feature flag" : "desligados"}.
            </p>
          </div>

          <EntityModal
            description="Informe tipo, valor, vencimento, conta e categoria."
            disabled={!podeGerenciar}
            eyebrow="Cadastro"
            title="Novo lancamento manual"
            triggerAction="add"
            triggerIcon={<Plus className="h-4 w-4" />}
            triggerLabel="Novo lancamento"
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
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Resumo
          icon={<TrendingUp />}
          label="Receita do mes"
          tone="income"
          valor={formatarMoeda(resumo.receitaMes)}
        />
        <Resumo
          icon={<TrendingDown />}
          label="Despesas do mes"
          tone="expense"
          valor={formatarMoeda(resumo.despesasMes)}
        />
        <Resumo
          icon={<ChartNoAxesCombined />}
          label="Lucro do mes"
          tone={resumo.lucroMes >= 0 ? "income" : "expense"}
          valor={formatarMoeda(resumo.lucroMes)}
        />
        <Resumo icon={<Banknote />} label="Reservas pagas" valor={String(resumo.reservasPagas)} />
        <Resumo
          icon={<CalendarClock />}
          label="Pendentes"
          valor={String(resumo.reservasPendentes)}
        />
        <Resumo
          icon={<WalletCards />}
          label="Ticket medio"
          valor={formatarMoeda(resumo.ticketMedio)}
        />
      </section>

      <Card className="admin-glass-card">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Filter className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
            Filtros do mes
          </div>
          <form className="grid gap-4 xl:grid-cols-[0.8fr_0.8fr_0.8fr_1fr_1.2fr_auto]">
            <CampoMes defaultValue={filtros.mes} />
            <CampoTipoFiltro defaultValue={filtros.tipo} />
            <CampoStatusFiltro defaultValue={filtros.status} />
            <CampoCategoriaFiltro categorias={categorias} defaultValue={filtros.categoriaId} />
            <CampoBusca defaultValue={filtros.busca} />
            <div className="flex items-end">
              <ActionButton className="w-full" icon={<Search />} type="submit" variant="settings">
                Filtrar
              </ActionButton>
            </div>
          </form>
        </CardContent>
      </Card>

      {contas.length === 0 || categorias.length === 0 ? (
        <EstadoVazio mensagem="As categorias e a conta inicial ainda nao foram carregadas para este tenant." />
      ) : lancamentos.length > 0 ? (
        <EntityGrid>
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
        </EntityGrid>
      ) : (
        <EstadoVazio mensagem="Nenhum lancamento encontrado para o filtro atual." />
      )}
    </FadeIn>
  );
}

function Resumo({
  icon,
  label,
  tone = "neutral",
  valor,
}: {
  icon?: ReactNode;
  label: string;
  tone?: "expense" | "income" | "neutral";
  valor: string;
}) {
  return (
    <Card
      className={cn(
        "admin-glass-card overflow-hidden transition",
        tone === "income" && "border-emerald-400/30 bg-emerald-500/5",
        tone === "expense" && "border-rose-400/30 bg-rose-500/5",
      )}
    >
      <CardContent className="min-h-28 p-4">
        <div
          className={cn(
            "mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl border [&_svg]:h-4 [&_svg]:w-4",
            tone === "income" && "border-emerald-400/30 bg-emerald-400/10 text-emerald-600 dark:text-emerald-300",
            tone === "expense" && "border-rose-400/30 bg-rose-400/10 text-rose-600 dark:text-rose-300",
            tone === "neutral" && "border-cyan-400/25 bg-cyan-400/10 text-cyan-600 dark:text-cyan-300",
          )}
        >
          {icon ?? <CircleDollarSign />}
        </div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 truncate text-lg font-semibold">{valor}</p>
      </CardContent>
    </Card>
  );
}

function EstadoVazio({ mensagem }: { mensagem: string }) {
  return (
    <EmptyState
      description={mensagem}
      icon={<CircleDollarSign className="h-5 w-5" />}
      title="Nenhum lancamento encontrado"
    />
  );
}

function CampoMes({ defaultValue }: { defaultValue: string }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="mes">Mes</Label>
      <Input defaultValue={defaultValue} id="mes" name="mes" required type="month" />
    </div>
  );
}

function CampoTipoFiltro({ defaultValue }: { defaultValue: string }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="tipo">Tipo</Label>
      <select className={campoClasse} defaultValue={defaultValue} id="tipo" name="tipo">
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

function CampoStatusFiltro({ defaultValue }: { defaultValue: string }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="status">Status</Label>
      <select className={campoClasse} defaultValue={defaultValue} id="status" name="status">
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
}: {
  categorias: DadosModuloFinanceiro["categorias"];
  defaultValue: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="categoriaId">Categoria</Label>
      <select
        className={campoClasse}
        defaultValue={defaultValue}
        id="categoriaId"
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

function CampoBusca({ defaultValue }: { defaultValue: string }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="busca">Busca</Label>
      <Input
        defaultValue={defaultValue}
        id="busca"
        name="busca"
        placeholder="Descricao, casa, reserva..."
      />
    </div>
  );
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(valor);
}
