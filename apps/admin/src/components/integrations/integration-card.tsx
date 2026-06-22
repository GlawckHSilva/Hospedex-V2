import {
  BedDouble,
  CalendarSync,
  CloudSun,
  CreditCard,
  Home,
  Mail,
  MapPin,
  MessageCircle,
  Power,
  Settings,
  type LucideIcon,
} from "lucide-react";

import { Badge, type BadgeProps } from "@hospedex/ui";

import { alternarIntegracaoAction } from "../../lib/integrations/actions";
import type { IntegracaoGerenciamento } from "../../lib/integrations/types";
import { ActionButton } from "../management/action-button";
import { EntityCard, EntityCardHeader } from "../management/entity-card";
import { EntityModal } from "../management/entity-modal";
import { IntegrationConfigForm } from "./integration-config-form";

const ICONES: Record<IntegracaoGerenciamento["provider"], LucideIcon> = {
  airbnb: Home,
  booking: BedDouble,
  email: Mail,
  google_maps: MapPin,
  ical: CalendarSync,
  payments: CreditCard,
  weather: CloudSun,
  whatsapp: MessageCircle,
};

export function IntegrationCard({
  integracao,
  podeGerenciar,
}: {
  integracao: IntegracaoGerenciamento;
  podeGerenciar: boolean;
}) {
  const Icone = ICONES[integracao.provider];
  const bloqueada = integracao.futura || !podeGerenciar;

  return (
    <EntityCard contentClassName="gap-3">
      <EntityCardHeader
        badges={
          <>
            <Badge variant={obterVarianteStatus(integracao)}>
              {obterLabelStatus(integracao)}
            </Badge>
            <Badge variant="outline">{integracao.categoria}</Badge>
          </>
        }
        icon={<Icone />}
        subtitle={integracao.configuracao.nomeInterno ?? integracao.categoria}
        title={integracao.nome}
      />

      <p className="min-h-12 text-sm leading-6 text-muted-foreground">
        {integracao.descricao}
      </p>

      <dl className="grid gap-2 rounded-lg border bg-background/45 p-3 text-xs">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Estado</dt>
          <dd className="font-medium">
            {integracao.enabled ? "Ativada" : "Desativada"}
          </dd>
        </div>
        {integracao.sincronizavel ? (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Ultima sincronizacao</dt>
            <dd className="text-right font-medium">
              {formatarSincronizacao(integracao.lastSyncedAt)}
            </dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-auto grid grid-cols-2 gap-2 [&>button]:w-full [&>form>button]:w-full">
        <EntityModal
          description={`Preferencias nao sensiveis de ${integracao.nome}.`}
          disabled={bloqueada}
          eyebrow="Integracao"
          size="md"
          title={`Configurar ${integracao.nome}`}
          triggerAction="settings"
          triggerIcon={<Settings />}
          triggerLabel="Configurar"
        >
          <IntegrationConfigForm
            integracao={integracao}
            podeGerenciar={podeGerenciar}
          />
        </EntityModal>

        <form action={alternarIntegracaoAction}>
          <input name="provider" type="hidden" value={integracao.provider} />
          <input
            name="ativo"
            type="hidden"
            value={String(!integracao.enabled)}
          />
          <ActionButton
            disabled={bloqueada}
            icon={<Power />}
            type="submit"
            variant={integracao.enabled ? "cancel" : "status"}
          >
            {integracao.enabled ? "Desativar" : "Ativar"}
          </ActionButton>
        </form>
      </div>
    </EntityCard>
  );
}

function obterLabelStatus(integracao: IntegracaoGerenciamento): string {
  if (integracao.futura) return "Em breve";
  if (integracao.status === "connected") return "Conectada";
  if (integracao.status === "error") return "Erro";
  if (integracao.status === "pending_backend") return "Aguardando backend";
  if (integracao.status === "not_configured") return "Configuracao pendente";
  return "Desativada";
}

function obterVarianteStatus(
  integracao: IntegracaoGerenciamento,
): BadgeProps["variant"] {
  if (integracao.futura) return "secondary";
  if (integracao.status === "connected") return "success";
  if (integracao.status === "error") return "danger";
  if (["pending_backend", "not_configured"].includes(integracao.status)) {
    return "warning";
  }
  return "outline";
}

function formatarSincronizacao(valor: string | null): string {
  if (!valor) return "Nunca sincronizada";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(valor));
}
