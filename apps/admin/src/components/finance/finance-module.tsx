import {
  Banknote,
  CalendarClock,
  ChartNoAxesCombined,
  CircleDollarSign,
  Plus,
  Search,
  WalletCards,
} from "lucide-react";
import type { ReactNode } from "react";

import {
  Badge,
  Button,
  Card,
  CardContent,
  FadeIn,
  Input,
  Label,
} from "@hospedex/ui";

import { EntityModal } from "../management/entity-modal";
import { EmptyState, EntityGrid } from "../management/entity-card";
import { ModuleToast } from "../admin/module-toast";
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
 * Módulo financeiro inicial do proprietário.
 *
 * Entrega lançamentos manuais e indicadores do mês. Gateway, repasses, DRE e
 * exportações ficam apenas preparados no modelo, sem lógica real nesta etapa.
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
              {tenantNome} · Pagamentos online{" "}
              {pagamentosOnlineAtivo ? "ativos" : "desligados"}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Resumo
              icon={<CircleDollarSign />}
              label="Receita do mês"
              valor={formatarMoeda(resumo.receitaMes)}
            />
            <Resumo
              icon={<WalletCards />}
              label="Despesas do mês"
              valor={formatarMoeda(resumo.despesasMes)}
            />
            <Resumo
              icon={<ChartNoAxesCombined />}
              label="Lucro do mês"
              valor={formatarMoeda(resumo.lucroMes)}
            />
            <Resumo
              icon={<Banknote />}
              label="Reservas pagas"
              valor={String(resumo.reservasPagas)}
            />
            <Resumo
              icon={<CalendarClock />}
              label="Reservas pendentes"
              valor={String(resumo.reservasPendentes)}
            />
            <Resumo
              label="Ticket médio"
              valor={formatarMoeda(resumo.ticketMedio)}
            />
          </div>
        </div>
      </section>

      <Card className="admin-glass-card">
        <CardContent className="p-5">
          <form className="grid gap-4 lg:grid-cols-[0.8fr_0.8fr_0.8fr_auto]">
            <CampoMes defaultValue={filtros.mes} />
            <CampoTipoFiltro defaultValue={filtros.tipo} />
            <CampoStatusFiltro defaultValue={filtros.status} />
            <div className="flex items-end">
              <Button className="w-full" type="submit" variant="outline">
                <Search />
                Filtrar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="admin-glass-card">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">Lançamento manual</h2>
            <p className="text-sm text-muted-foreground">
              Registre receitas ou despesas em um modal central.
            </p>
          </div>
          <EntityModal
            description="Informe tipo, valor, vencimento, conta e categoria."
            disabled={!podeGerenciar}
            eyebrow="Cadastro"
            title="Novo lançamento manual"
            triggerIcon={<Plus className="h-4 w-4" />}
            triggerLabel="Novo lançamento"
            triggerVariant="default"
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
        </CardContent>
      </Card>

      {contas.length === 0 || categorias.length === 0 ? (
        <EstadoVazio mensagem="As categorias e a conta inicial ainda não foram carregadas para este tenant." />
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
        <EstadoVazio mensagem="Nenhum lançamento encontrado para o filtro atual." />
      )}
    </FadeIn>
  );
}

function Resumo({
  icon,
  label,
  valor,
}: {
  icon?: ReactNode;
  label: string;
  valor: string;
}) {
  return (
    <div className="min-w-36 rounded-lg border bg-background/55 p-3 text-sm">
      {icon ? (
        <div className="mb-2 text-primary [&_svg]:h-4 [&_svg]:w-4">{icon}</div>
      ) : null}
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate font-semibold">{valor}</p>
    </div>
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
      <Label htmlFor="mes">Mês</Label>
      <Input
        defaultValue={defaultValue}
        id="mes"
        name="mes"
        required
        type="month"
      />
    </div>
  );
}

function CampoTipoFiltro({ defaultValue }: { defaultValue: string }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="tipo">Tipo</Label>
      <select
        className={campoClasse}
        defaultValue={defaultValue}
        id="tipo"
        name="tipo"
      >
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
      <select
        className={campoClasse}
        defaultValue={defaultValue}
        id="status"
        name="status"
      >
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

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(valor);
}
