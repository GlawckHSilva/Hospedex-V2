import { Boxes, Search, ShieldAlert, Wrench } from "lucide-react";
import type { ReactNode } from "react";

import { Badge, Button, Card, CardContent, FadeIn, Label } from "@hospedex/ui";

import { ModuleToast } from "../admin/module-toast";
import type { DadosModuloInventario, SearchParamsInventario } from "../../lib/inventory/types";
import { InventoryItemCard } from "./inventory-item-card";
import { InventoryItemForm } from "./inventory-item-form";
import { MaintenanceTaskCard } from "./maintenance-task-card";
import { MaintenanceTaskForm } from "./maintenance-task-form";

/**
 * Modulo visual de Inventario e Manutencao.
 *
 * Entrega controle operacional inicial sem custos, notificacoes reais ou
 * relatorios avancados, mantendo a estrutura preparada para evolucao.
 */

export type InventoryModuleProps = DadosModuloInventario & SearchParamsInventario;

const MENSAGENS_SUCESSO_INVENTARIO: Record<string, string> = {
  "item-atualizado": "Item atualizado com sucesso.",
  "item-criado": "Item criado com sucesso.",
  "item-excluido": "Item excluido com sucesso.",
  "manutencao-atualizada": "Manutencao atualizada com sucesso.",
  "manutencao-criada": "Manutencao criada com sucesso.",
  "status-manutencao": "Status da manutencao atualizado."
};

const campoClasse =
  "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function InventoryModule({
  erro,
  filtros,
  itens,
  podeGerenciar,
  propriedades,
  responsaveis,
  resumo,
  sucesso,
  tarefas,
  tenantNome,
  unidades
}: InventoryModuleProps) {
  return (
    <FadeIn className="space-y-5">
      <ModuleToast
        erro={erro}
        mensagensSucesso={MENSAGENS_SUCESSO_INVENTARIO}
        sucesso={sucesso}
      />

      <section className="admin-glass-panel p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Badge variant={podeGerenciar ? "info" : "warning"}>
              {podeGerenciar ? "Inventario editavel" : "Somente leitura"}
            </Badge>
            <h1 className="mt-3 text-2xl font-semibold tracking-normal">
              Inventario e manutencao
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {tenantNome} · garantias, fotos antes/depois, custos e notificacoes preparados.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Resumo icon={<Boxes />} label="Itens" valor={String(resumo.itens)} />
            <Resumo icon={<ShieldAlert />} label="Danificados" valor={String(resumo.danificados)} />
            <Resumo icon={<ShieldAlert />} label="Faltando" valor={String(resumo.faltando)} />
            <Resumo icon={<Wrench />} label="Manutencoes" valor={String(resumo.manutencoesPendentes)} />
          </div>
        </div>
      </section>

      <Card className="admin-glass-card">
        <CardContent className="p-5">
          <form className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
            <CampoPropriedade defaultValue={filtros.propriedadeId ?? ""} propriedades={propriedades} />
            <CampoUnidade defaultValue={filtros.unidadeId ?? ""} unidades={unidades} />
            <div className="flex items-end">
              <Button className="w-full" type="submit" variant="outline">
                <Search />
                Filtrar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="admin-glass-card">
          <CardContent className="p-5">
            <details open={itens.length === 0}>
              <summary className="cursor-pointer text-sm font-semibold">Novo item</summary>
              <div className="mt-5">
                <InventoryItemForm
                  modo="criar"
                  podeGerenciar={podeGerenciar}
                  propriedades={propriedades}
                  unidades={unidades}
                />
              </div>
            </details>
          </CardContent>
        </Card>

        <Card className="admin-glass-card">
          <CardContent className="p-5">
            <details open={tarefas.length === 0}>
              <summary className="cursor-pointer text-sm font-semibold">
                Nova manutencao
              </summary>
              <div className="mt-5">
                <MaintenanceTaskForm
                  itens={itens}
                  modo="criar"
                  podeGerenciar={podeGerenciar}
                  propriedades={propriedades}
                  responsaveis={responsaveis}
                  unidades={unidades}
                />
              </div>
            </details>
          </CardContent>
        </Card>
      </div>

      <section className="grid gap-5">
        <h2 className="text-lg font-semibold">Itens de inventario</h2>
        {itens.length > 0 ? (
          itens.map((item) => (
            <InventoryItemCard
              item={item}
              key={item.id}
              podeGerenciar={podeGerenciar}
              propriedades={propriedades}
              unidades={unidades}
            />
          ))
        ) : (
          <EstadoVazio mensagem="Nenhum item encontrado para o filtro atual." />
        )}
      </section>

      <section className="grid gap-5">
        <h2 className="text-lg font-semibold">Agenda de manutencao</h2>
        {tarefas.length > 0 ? (
          tarefas.map((tarefa) => (
            <MaintenanceTaskCard
              itens={itens}
              key={tarefa.id}
              podeGerenciar={podeGerenciar}
              propriedades={propriedades}
              responsaveis={responsaveis}
              tarefa={tarefa}
              unidades={unidades}
            />
          ))
        ) : (
          <EstadoVazio mensagem="Nenhuma manutencao encontrada para o filtro atual." />
        )}
      </section>
    </FadeIn>
  );
}

function Resumo({
  icon,
  label,
  valor
}: {
  icon: ReactNode;
  label: string;
  valor: string;
}) {
  return (
    <div className="min-w-36 rounded-lg border bg-background/55 p-3 text-sm">
      <div className="mb-2 text-primary [&_svg]:h-4 [&_svg]:w-4">{icon}</div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate font-semibold">{valor}</p>
    </div>
  );
}

function EstadoVazio({ mensagem }: { mensagem: string }) {
  return (
    <Card className="admin-glass-card">
      <CardContent className="p-5 text-sm text-muted-foreground">{mensagem}</CardContent>
    </Card>
  );
}

function CampoPropriedade({
  defaultValue,
  propriedades
}: {
  defaultValue: string;
  propriedades: Array<{ id: string; name: string }>;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="propriedadeId">Propriedade</Label>
      <select className={campoClasse} defaultValue={defaultValue} id="propriedadeId" name="propriedadeId">
        <option value="">Todas</option>
        {propriedades.map((propriedade) => (
          <option key={propriedade.id} value={propriedade.id}>
            {propriedade.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function CampoUnidade({
  defaultValue,
  unidades
}: {
  defaultValue: string;
  unidades: Array<{ id: string; name: string }>;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="unidadeId">Unidade</Label>
      <select className={campoClasse} defaultValue={defaultValue} id="unidadeId" name="unidadeId">
        <option value="">Todas</option>
        {unidades.map((unidade) => (
          <option key={unidade.id} value={unidade.id}>
            {unidade.name}
          </option>
        ))}
      </select>
    </div>
  );
}
