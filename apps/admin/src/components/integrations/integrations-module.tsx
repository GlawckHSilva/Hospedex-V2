import { Cable, CircleCheck, Clock3, Layers3, PlugZap } from "lucide-react";
import type { ReactNode } from "react";

import { Badge, FadeIn, PremiumEmptyState } from "@hospedex/ui";

import type {
  DadosCentralIntegracoes,
  SearchParamsIntegracoes,
} from "../../lib/integrations/types";
import { ModuleToast } from "../admin/module-toast";
import { IntegrationCard } from "./integration-card";

const MENSAGENS_SUCESSO: Record<string, string> = {
  "configuracao-salva": "Configuracao da integracao salva.",
  "status-atualizado": "Status da integracao atualizado.",
};

/** Central visual das integracoes do tenant, sem executar conectores externos. */
export function IntegrationsModule({
  erro,
  erroCarregamento,
  integracoes,
  podeGerenciar,
  resumo,
  sucesso,
  tenantNome,
}: DadosCentralIntegracoes & SearchParamsIntegracoes) {
  return (
    <FadeIn className="space-y-5">
      <ModuleToast
        erro={erro ?? erroCarregamento ?? undefined}
        mensagensSucesso={MENSAGENS_SUCESSO}
        sucesso={sucesso}
      />

      <section className="admin-glass-panel p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <Badge variant={podeGerenciar ? "info" : "warning"}>
              {podeGerenciar ? "Central editavel" : "Somente leitura"}
            </Badge>
            <h1 className="mt-3 text-2xl font-semibold tracking-normal">
              Integracoes
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {tenantNome} - escolha como deseja usar os recursos liberados
              para sua operacao.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Resumo icon={<Layers3 />} label="Total" valor={resumo.total} />
            <Resumo icon={<Cable />} label="Ativas" valor={resumo.ativas} />
            <Resumo
              icon={<Clock3 />}
              label="Pendentes"
              valor={resumo.pendentes}
            />
            <Resumo
              icon={<CircleCheck />}
              label="Configuradas"
              valor={resumo.configuradas}
            />
          </div>
        </div>
      </section>

      {integracoes.length ? (
        <section className="grid auto-rows-fr gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {integracoes.map((integracao) => (
            <IntegrationCard
              integracao={integracao}
              key={integracao.provider}
              podeGerenciar={podeGerenciar}
            />
          ))}
        </section>
      ) : (
        <PremiumEmptyState
          description="O Super Admin ainda nao liberou integracoes para este plano ou licenca."
          icon={<PlugZap className="h-5 w-5" />}
          title="Nenhuma integracao disponivel"
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
  valor: number;
}) {
  return (
    <div className="min-w-28 rounded-lg border bg-background/55 p-3 text-sm">
      <div className="mb-2 text-primary [&_svg]:h-4 [&_svg]:w-4">{icon}</div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold">{valor}</p>
    </div>
  );
}
