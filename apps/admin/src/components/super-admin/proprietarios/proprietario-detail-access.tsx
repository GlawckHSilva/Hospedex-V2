import { Building2, Code2, PlugZap, Power } from "lucide-react";

import { StatusBadge } from "@hospedex/ui";

import { CATALOGO_INTEGRACOES } from "../../../lib/integrations/catalog";
import {
  alternarIntegracaoProprietarioAction,
  alternarModuloProprietarioAction
} from "../../../lib/super-admin/proprietarios/actions";
import type {
  DadosModuloProprietarios,
  ProprietarioCompleto
} from "../../../lib/super-admin/proprietarios/types";
import { ActionButton } from "../../management/action-button";
import { ConfirmDialog } from "../../management/entity-modal";
import {
  CabecalhoAba,
  EstadoVazio,
  formatarData,
  labelModulo
} from "./proprietario-detail-shared";

/** Abas de liberacao de modulos, integracoes e APIs por tenant. */

type DadosAcesso = {
  featureFlags: DadosModuloProprietarios["featureFlags"];
  planFeatures: DadosModuloProprietarios["planFeatures"];
  proprietario: ProprietarioCompleto;
};

export function AbaModulos({ featureFlags, planFeatures, proprietario }: DadosAcesso) {
  return (
    <div className="space-y-4">
      <CabecalhoAba
        descricao="Liberacoes por tenant controladas exclusivamente pelo Super Admin."
        icon={<Building2 />}
        titulo="Modulos"
      />
      {featureFlags.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {featureFlags.map((flag) => {
            const override = proprietario.tenantFeatures.find(
              (item) => item.feature_flag_id === flag.id
            );
            const inclusoNoPlano = planFeatures.some(
              (item) =>
                item.plan_id === proprietario.plan?.id &&
                item.feature_flag_id === flag.id &&
                item.enabled
            );
            const ativo = override?.enabled ?? (inclusoNoPlano || flag.default_enabled);

            return (
              <div className="rounded-xl border bg-background/45 p-4" key={flag.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{labelModulo(flag.key)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {flag.description ?? flag.module}
                    </p>
                  </div>
                  <StatusBadge tone={ativo ? "success" : "neutral"}>
                    {ativo ? "Liberado" : "Bloqueado"}
                  </StatusBadge>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">
                    {override ? "Override do tenant" : inclusoNoPlano ? "Incluido no plano" : "Padrao global"}
                  </span>
                  <ConfirmDialog
                    description="A alteracao afeta somente este tenant e preserva o plano global."
                    title={`${ativo ? "Desativar" : "Ativar"} ${labelModulo(flag.key)}`}
                    triggerAction="status"
                    triggerIcon={<Power />}
                    triggerLabel={ativo ? "Desativar" : "Ativar"}
                  >
                    <form action={alternarModuloProprietarioAction} className="space-y-4">
                      <input name="tenantId" type="hidden" value={proprietario.tenant.id} />
                      <input name="ownerId" type="hidden" value={proprietario.tenant.owner_id} />
                      <input name="featureFlagId" type="hidden" value={flag.id} />
                      <input name="habilitar" type="hidden" value={String(!ativo)} />
                      <p className="text-sm text-muted-foreground">
                        Confirme o override administrativo para {proprietario.tenant.name}.
                      </p>
                      <ActionButton className="w-full" icon={<Power />} type="submit" variant="status">
                        Confirmar alteracao
                      </ActionButton>
                    </form>
                  </ConfirmDialog>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EstadoVazio texto="Nenhum modulo configurado na plataforma." />
      )}
    </div>
  );
}

export function AbaIntegracoes({ proprietario }: { proprietario: ProprietarioCompleto }) {
  return (
    <div className="space-y-4">
      <CabecalhoAba
        descricao="Disponibilidade administrativa sem chaves ou secrets no navegador."
        icon={<PlugZap />}
        titulo="Integracoes"
      />
      <div className="grid gap-3 md:grid-cols-2">
        {CATALOGO_INTEGRACOES.map((definicao) => {
          const integracao = proprietario.integrations.find(
            (item) => item.provider === definicao.provider
          );
          const ativa = Boolean(integracao?.enabled);

          return (
            <div className="rounded-xl border bg-background/45 p-4" key={definicao.provider}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{definicao.nome}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{definicao.descricao}</p>
                </div>
                <StatusBadge tone={definicao.futura ? "neutral" : ativa ? "success" : "warning"}>
                  {definicao.futura ? "Futuro" : ativa ? "Liberada" : "Desativada"}
                </StatusBadge>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">
                  {integracao?.last_synced_at
                    ? `Ultima sincronizacao: ${formatarData(integracao.last_synced_at)}`
                    : "Sem sincronizacao"}
                </span>
                <ConfirmDialog
                  description="Apenas a disponibilidade sera alterada. Nenhuma credencial sera exposta ou criada."
                  disabled={definicao.futura}
                  title={`${ativa ? "Desativar" : "Ativar"} ${definicao.nome}`}
                  triggerAction="status"
                  triggerIcon={<Power />}
                  triggerLabel={ativa ? "Desativar" : "Ativar"}
                >
                  <form action={alternarIntegracaoProprietarioAction} className="space-y-4">
                    <input name="tenantId" type="hidden" value={proprietario.tenant.id} />
                    <input name="ownerId" type="hidden" value={proprietario.tenant.owner_id} />
                    <input name="provider" type="hidden" value={definicao.provider} />
                    <input name="habilitar" type="hidden" value={String(!ativa)} />
                    <p className="text-sm text-muted-foreground">
                      Confirme a liberacao administrativa para {proprietario.tenant.name}.
                    </p>
                    <ActionButton className="w-full" icon={<Power />} type="submit" variant="status">
                      Confirmar alteracao
                    </ActionButton>
                  </form>
                </ConfirmDialog>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AbaApis({
  featureFlags,
  proprietario
}: Pick<DadosAcesso, "featureFlags" | "proprietario">) {
  const apis = featureFlags.filter(
    (flag) => flag.module.toLowerCase() === "api" || flag.key.toLowerCase().includes("api")
  );

  return (
    <div className="space-y-4">
      <CabecalhoAba
        descricao="Credenciais e configuracoes sensiveis permanecem protegidas no backend."
        icon={<Code2 />}
        titulo="APIs"
      />
      {apis.length ? (
        <div className="space-y-3">
          {apis.map((api) => {
            const registro = proprietario.tenantFeatures.find(
              (item) => item.feature_flag_id === api.id
            );
            return (
              <div
                className="grid gap-3 rounded-xl border bg-background/45 p-4 sm:grid-cols-[1fr_auto] sm:items-center"
                key={api.id}
              >
                <div>
                  <p className="font-semibold">{labelModulo(api.key)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Ambiente protegido - configuracao pendente de backend.
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Ultima atualizacao: {registro ? formatarData(registro.updated_at) : "Nao configurada"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge tone={registro?.enabled ? "warning" : "neutral"}>
                    {registro?.enabled ? "Liberada / pendente" : "Nao liberada"}
                  </StatusBadge>
                  <ConfirmDialog
                    description="A liberacao nao cria chaves nem ativa uma API real."
                    title={registro?.enabled ? "Desativar API" : "Liberar API futura"}
                    triggerAction="status"
                    triggerIcon={<Power />}
                    triggerLabel={registro?.enabled ? "Desativar" : "Liberar"}
                  >
                    <form action={alternarModuloProprietarioAction} className="space-y-4">
                      <input name="tenantId" type="hidden" value={proprietario.tenant.id} />
                      <input name="ownerId" type="hidden" value={proprietario.tenant.owner_id} />
                      <input name="featureFlagId" type="hidden" value={api.id} />
                      <input name="habilitar" type="hidden" value={String(!registro?.enabled)} />
                      <p className="text-sm text-muted-foreground">
                        Confirme a disponibilidade estrutural desta API para o tenant.
                      </p>
                      <ActionButton className="w-full" icon={<Power />} type="submit" variant="status">
                        Confirmar alteracao
                      </ActionButton>
                    </form>
                  </ConfirmDialog>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EstadoVazio texto="Nenhuma API foi preparada para este tenant." />
      )}
    </div>
  );
}
