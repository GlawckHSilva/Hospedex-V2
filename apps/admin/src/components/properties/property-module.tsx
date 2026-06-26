import { Building2, Plus, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

import { Badge, Card, CardContent, FadeIn } from "@hospedex/ui";

import { EntityModal } from "../management/entity-modal";
import { EmptyState, EntityGrid } from "../management/entity-card";
import { ModuleToast } from "../admin/module-toast";
import type {
  DadosModuloPropriedades,
  SearchParamsModulo,
} from "../../lib/properties/types";
import { PropertyCard } from "./property-card";
import { PropertyForm } from "./property-form";

/**
 * Módulo base de Casas.
 *
 * Renderiza apenas a operação inicial do tenant atual. Reservas, pagamentos,
 * marketplace e calendário completo permanecem fora deste módulo por escopo.
 */

export type PropertyModuleProps = DadosModuloPropriedades &
  SearchParamsModulo & {
    tenantNome: string;
  };

const MENSAGENS_SUCESSO_PROPRIEDADES: Record<string, string> = {
  "propriedade-criada": "Casa criada com sucesso.",
  "propriedade-atualizada": "Casa atualizada com sucesso.",
  "propriedade-excluida": "Propriedade excluída com sucesso.",
  "status-propriedade": "Status da casa atualizado.",
  "galeria-atualizada": "Galeria atualizada com sucesso.",
  "imagem-principal": "Imagem principal atualizada.",
  "imagem-excluida": "Imagem excluída com sucesso.",
  "comodidades-atualizadas": "Comodidades atualizadas com sucesso.",
  "politica-cancelamento-atualizada": "Politica de cancelamento atualizada.",
  "regras-casa-atualizadas": "Regras da casa atualizadas.",
  "regras-reserva-atualizadas": "Regras de reserva atualizadas.",
};

export function PropertyModule({
  comodidadesDisponiveis,
  erro,
  limitesPlano,
  podeGerenciar,
  propriedades,
  sucesso,
  tenantNome,
}: PropertyModuleProps) {
  return (
    <FadeIn className="space-y-5">
      <ModuleToast
        erro={erro}
        mensagensSucesso={MENSAGENS_SUCESSO_PROPRIEDADES}
        sucesso={sucesso}
      />

      <section className="admin-glass-panel p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Badge variant={podeGerenciar ? "info" : "warning"}>
              {podeGerenciar ? "Gestão liberada" : "Somente leitura"}
            </Badge>
            <h1 className="mt-3 text-2xl font-semibold tracking-normal">
              Casas
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {tenantNome}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <ResumoModulo
              icon={<Building2 />}
              label="Casas"
              valor={`${limitesPlano.propriedadesUsadas}/${limitesPlano.maxPropriedades}`}
            />
            <ResumoModulo
              icon={<ShieldCheck />}
              label="Plano"
              valor={limitesPlano.nomePlano}
            />
          </div>
        </div>
      </section>

      <VisaoPropriedades
        comodidadesDisponiveis={comodidadesDisponiveis}
        podeGerenciar={podeGerenciar}
        propriedades={propriedades}
      />
    </FadeIn>
  );
}

function VisaoPropriedades({
  comodidadesDisponiveis,
  podeGerenciar,
  propriedades,
}: Pick<
  PropertyModuleProps,
  | "comodidadesDisponiveis"
  | "podeGerenciar"
  | "propriedades"
>) {
  return (
    <>
      <Card className="admin-glass-card">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">Cadastro de casas</h2>
            <p className="text-sm text-muted-foreground">
              Use o modal para criar casas sem expandir a lista.
            </p>
          </div>
          <EntityModal
            description="Preencha os dados públicos e operacionais da casa."
            disabled={!podeGerenciar}
            eyebrow="Cadastro"
            title="Nova casa"
            triggerIcon={<Plus className="h-4 w-4" />}
            triggerLabel="Nova casa"
            triggerVariant="default"
          >
            <PropertyForm
              comodidadesDisponiveis={comodidadesDisponiveis}
              modo="criar"
              podeGerenciar={podeGerenciar}
            />
          </EntityModal>
        </CardContent>
      </Card>

      {propriedades.length > 0 ? (
        <EntityGrid>
          {propriedades.map((propriedade) => (
            <PropertyCard
              key={propriedade.id}
              comodidadesDisponiveis={comodidadesDisponiveis}
              podeGerenciar={podeGerenciar}
              propriedade={propriedade}
            />
          ))}
        </EntityGrid>
      ) : (
        <EmptyState
          description="Cadastre a primeira casa para iniciar a operacao do tenant."
          icon={<Building2 className="h-5 w-5" />}
          title="Nenhuma casa cadastrada"
        />
      )}
    </>
  );
}

function ResumoModulo({
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
