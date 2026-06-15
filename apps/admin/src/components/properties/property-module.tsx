import { Building2, Flag, Home, Plus, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

import { Badge, Card, CardContent, FadeIn } from "@hospedex/ui";

import { ModuleToast } from "../admin/module-toast";
import type { DadosModuloPropriedades, SearchParamsModulo } from "../../lib/properties/types";
import { PropertyCard } from "./property-card";
import { PropertyForm } from "./property-form";
import { UnitCard } from "./unit-card";
import { UnitForm } from "./unit-form";

/**
 * Módulo base de Propriedades e Unidades.
 *
 * Renderiza apenas a operação inicial do tenant atual. Reservas, pagamentos,
 * marketplace e calendário completo permanecem fora deste módulo por escopo.
 */

export type PropertyModuleProps = DadosModuloPropriedades &
  SearchParamsModulo & {
    modo: "propriedades" | "unidades";
    tenantNome: string;
  };

const MENSAGENS_SUCESSO_PROPRIEDADES: Record<string, string> = {
  "propriedade-criada": "Propriedade criada com sucesso.",
  "propriedade-atualizada": "Propriedade atualizada com sucesso.",
  "status-propriedade": "Status da propriedade atualizado.",
  "unidade-criada": "Unidade criada com sucesso.",
  "unidade-atualizada": "Unidade atualizada com sucesso.",
  "status-unidade": "Status da unidade atualizado.",
  "galeria-atualizada": "Galeria atualizada com sucesso.",
  "imagem-principal": "Imagem principal atualizada.",
  "imagem-excluida": "Imagem excluída com sucesso.",
  "comodidades-atualizadas": "Comodidades atualizadas com sucesso."
};

export function PropertyModule({
  comodidadesDisponiveis,
  erro,
  limitesPlano,
  modo,
  multiUnidadesAtivo,
  podeGerenciar,
  propriedades,
  sucesso,
  tenantNome
}: PropertyModuleProps) {
  const unidades = propriedades.flatMap((propriedade) => propriedade.unidades);
  const titulo = modo === "propriedades" ? "Propriedades" : "Unidades";

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
            <h1 className="mt-3 text-2xl font-semibold tracking-normal">{titulo}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {tenantNome}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ResumoModulo
              icon={<Building2 />}
              label="Propriedades"
              valor={`${limitesPlano.propriedadesUsadas}/${limitesPlano.maxPropriedades}`}
            />
            <ResumoModulo
              icon={<Home />}
              label="Unidades"
              valor={`${limitesPlano.unidadesUsadas}/${limitesPlano.maxUnidades}`}
            />
            <ResumoModulo icon={<ShieldCheck />} label="Plano" valor={limitesPlano.nomePlano} />
            <ResumoModulo
              icon={<Flag />}
              label="Multiunidades"
              valor={multiUnidadesAtivo ? "Ativo" : "Desligado"}
            />
          </div>
        </div>
      </section>

      {modo === "propriedades" ? (
        <VisaoPropriedades
          comodidadesDisponiveis={comodidadesDisponiveis}
          multiUnidadesAtivo={multiUnidadesAtivo}
          podeGerenciar={podeGerenciar}
          propriedades={propriedades}
        />
      ) : (
        <VisaoUnidades
          podeGerenciar={podeGerenciar}
          propriedades={propriedades}
          unidadesTotais={unidades.length}
        />
      )}
    </FadeIn>
  );
}

function VisaoPropriedades({
  comodidadesDisponiveis,
  multiUnidadesAtivo,
  podeGerenciar,
  propriedades
}: Pick<
  PropertyModuleProps,
  "comodidadesDisponiveis" | "multiUnidadesAtivo" | "podeGerenciar" | "propriedades"
>) {
  return (
    <>
      <Card className="admin-glass-card">
        <CardContent className="p-5">
          <details open={propriedades.length === 0}>
            <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
              <Plus className="h-4 w-4" />
              Nova propriedade
            </summary>
            <div className="mt-5">
              <PropertyForm modo="criar" podeGerenciar={podeGerenciar} />
            </div>
          </details>
        </CardContent>
      </Card>

      {propriedades.length > 0 ? (
        <section className="grid gap-5">
          {propriedades.map((propriedade) => (
            <PropertyCard
              key={propriedade.id}
              comodidadesDisponiveis={comodidadesDisponiveis}
              multiUnidadesAtivo={multiUnidadesAtivo}
              podeGerenciar={podeGerenciar}
              propriedade={propriedade}
              propriedades={propriedades}
            />
          ))}
        </section>
      ) : (
        <Card className="admin-glass-card">
          <CardContent className="p-5 text-sm text-muted-foreground">
            Nenhuma propriedade cadastrada.
          </CardContent>
        </Card>
      )}
    </>
  );
}

function VisaoUnidades({
  podeGerenciar,
  propriedades,
  unidadesTotais
}: Pick<PropertyModuleProps, "podeGerenciar" | "propriedades"> & {
  unidadesTotais: number;
}) {
  return (
    <>
      <Card className="admin-glass-card">
        <CardContent className="p-5">
          <details open={unidadesTotais === 0 && propriedades.length > 0}>
            <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
              <Plus className="h-4 w-4" />
              Nova unidade
            </summary>
            <div className="mt-5">
              <UnitForm
                modo="criar"
                podeGerenciar={podeGerenciar}
                propriedades={propriedades}
                retorno="/unidades"
              />
            </div>
          </details>
        </CardContent>
      </Card>

      {propriedades.length === 0 ? (
        <Card className="admin-glass-card">
          <CardContent className="p-5 text-sm text-muted-foreground">
            Cadastre uma propriedade antes de criar unidades.
          </CardContent>
        </Card>
      ) : (
        <section className="grid gap-5">
          {propriedades.map((propriedade) => (
            <Card className="admin-glass-card" key={propriedade.id}>
              <CardContent className="space-y-4 p-5">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-lg font-semibold">{propriedade.name}</h2>
                  <Badge variant="outline">
                    {propriedade.unidades.length} unidade(s)
                  </Badge>
                </div>

                {propriedade.unidades.length > 0 ? (
                  <div className="grid gap-3">
                    {propriedade.unidades.map((unidade) => (
                      <UnitCard
                        key={unidade.id}
                        podeGerenciar={podeGerenciar}
                        propriedades={propriedades}
                        retorno="/unidades"
                        unidade={unidade}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed bg-background/45 p-4 text-sm text-muted-foreground">
                    Nenhuma unidade cadastrada nesta propriedade.
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </section>
      )}
    </>
  );
}

function ResumoModulo({
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
