import { Gift, Plus, Search, ShieldCheck, ToggleLeft } from "lucide-react";
import type { ReactNode } from "react";

import { Badge, Button, Card, CardContent, FadeIn, Label } from "@hospedex/ui";

import { EntityModal } from "../management/entity-modal";
import { EmptyState, EntityGrid } from "../management/entity-card";
import { criarServicoExtraAction } from "../../lib/extra-services/actions";
import {
  STATUS_SERVICO_EXTRA,
  type DadosModuloServicosExtras,
  type SearchParamsServicosExtras,
} from "../../lib/extra-services/types";
import { ModuleToast } from "../admin/module-toast";
import { ExtraServiceCard } from "./extra-service-card";
import { ExtraServiceForm } from "./extra-service-form";

/**
 * Modulo de Servicos Extras do Gerenciamento.
 *
 * Entrega o catalogo operacional. A selecao pelo hospede no Marketplace e o
 * calculo automatico em reservas ficam preparados, mas nao implementados aqui.
 */

export type ExtraServicesModuleProps = DadosModuloServicosExtras &
  SearchParamsServicosExtras;

const MENSAGENS_SUCESSO: Record<string, string> = {
  "servico-atualizado": "Servico extra atualizado.",
  "servico-criado": "Servico extra criado.",
  "servico-excluido": "Servico extra excluido.",
  "status-atualizado": "Status do servico extra atualizado.",
};

const campoClasse =
  "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function ExtraServicesModule({
  casas,
  erro,
  filtros,
  podeGerenciar,
  resumo,
  servicos,
  sucesso,
  tenantNome,
}: ExtraServicesModuleProps) {
  return (
    <FadeIn className="space-y-5">
      <ModuleToast
        erro={erro}
        mensagensSucesso={MENSAGENS_SUCESSO}
        sucesso={sucesso}
      />

      <section className="admin-glass-panel p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Badge variant={podeGerenciar ? "info" : "warning"}>
              {podeGerenciar ? "Catalogo editavel" : "Somente leitura"}
            </Badge>
            <h1 className="mt-3 text-2xl font-semibold tracking-normal">
              Servicos extras
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {tenantNome} · adicionais opcionais ou obrigatorios para reservas
              futuras.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Resumo
              icon={<Gift />}
              label="Total"
              valor={String(resumo.total)}
            />
            <Resumo
              icon={<ShieldCheck />}
              label="Ativos"
              valor={String(resumo.ativos)}
            />
            <Resumo
              icon={<ToggleLeft />}
              label="Inativos"
              valor={String(resumo.inativos)}
            />
            <Resumo
              icon={<Plus />}
              label="Obrigatorios"
              valor={String(resumo.obrigatorios)}
            />
          </div>
        </div>
      </section>

      <Card className="admin-glass-card">
        <CardContent className="p-5">
          <form className="grid gap-4 md:grid-cols-[1fr_auto]">
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <select
                className={campoClasse}
                defaultValue={filtros.status}
                id="status"
                name="status"
              >
                {STATUS_SERVICO_EXTRA.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
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
            <h2 className="text-base font-semibold">Catálogo de serviços</h2>
            <p className="text-sm text-muted-foreground">
              Crie adicionais opcionais ou obrigatórios por modal.
            </p>
          </div>
          <EntityModal
            description="Defina nome, preço, cobrança e casas onde o serviço se aplica."
            disabled={!podeGerenciar}
            eyebrow="Cadastro"
            title="Novo serviço extra"
            triggerIcon={<Plus className="h-4 w-4" />}
            triggerLabel="Novo serviço"
            triggerVariant="default"
          >
            <ExtraServiceForm
              action={criarServicoExtraAction}
              casas={casas}
              modo="criar"
              podeGerenciar={podeGerenciar}
            />
          </EntityModal>
        </CardContent>
      </Card>

      {servicos.length > 0 ? (
        <EntityGrid>
          {servicos.map((servico) => (
            <ExtraServiceCard
              casas={casas}
              key={servico.id}
              podeGerenciar={podeGerenciar}
              servico={servico}
            />
          ))}
        </EntityGrid>
      ) : (
        <EmptyState
          description="Ajuste o filtro ou cadastre um servico extra para reservas futuras."
          icon={<Gift className="h-5 w-5" />}
          title="Nenhum servico extra encontrado"
        />
      )}
    </FadeIn>
  );
}

function Resumo({
  icon,
  label,
  valor,
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
