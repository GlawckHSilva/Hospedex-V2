import type { FeatureFlagRow, PlanFeatureRow, PlanRow } from "@hospedex/types";
import type { ComponentProps } from "react";

import { Input, Label } from "@hospedex/ui";

import {
  atualizarProprietarioAction,
  criarProprietarioAction
} from "../../../lib/super-admin/proprietarios/actions";
import type { ProprietarioCompleto } from "../../../lib/super-admin/proprietarios/types";
import { ActionButton } from "../../management/action-button";

/**
 * Formulario de criacao/edicao de proprietario.
 *
 * Nao envia service role ao navegador. O formulario apenas coleta dados; a regra
 * de Auth, tenant, licenca, role e feature flags fica na server action segura.
 */

export type ProprietarioFormProps = {
  featureFlags: FeatureFlagRow[];
  modo: "criar" | "editar";
  planFeatures: PlanFeatureRow[];
  planos: PlanRow[];
  proprietario?: ProprietarioCompleto;
};

const campoClasse =
  "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

const STATUS = [
  { label: "Trial", valor: "trial" },
  { label: "Ativo", valor: "active" },
  { label: "Pendente", valor: "past_due" },
  { label: "Bloqueado", valor: "suspended" },
  { label: "Cancelado", valor: "cancelled" }
];

export function ProprietarioForm({
  featureFlags,
  modo,
  planFeatures,
  planos,
  proprietario
}: ProprietarioFormProps) {
  const action = modo === "criar" ? criarProprietarioAction : atualizarProprietarioAction;
  const planoPadrao = obterPlanoPadrao(planos, proprietario);
  const bloqueado = planos.length === 0;
  const flagsAtivasDoPlano = new Set(obterFlagsDoPlano(planFeatures, planoPadrao?.id));

  return (
    <form action={action} className="grid gap-4">
      {proprietario ? (
        <>
          <input name="tenantId" type="hidden" value={proprietario.tenant.id} />
          <input name="ownerId" type="hidden" value={proprietario.tenant.owner_id} />
          {/* Campos disabled nao participam do FormData. O e-mail oculto preserva
              a identidade atual sem permitir alteracao acidental nesta tela. */}
          <input name="email" type="hidden" value={proprietario.profile?.email ?? ""} />
        </>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <CampoTexto
          defaultValue={proprietario?.profile?.full_name ?? ""}
          disabled={bloqueado}
          label="Nome do proprietario"
          name="nome"
          required
        />
        <CampoTexto
          defaultValue={proprietario?.profile?.email ?? ""}
          disabled={bloqueado || modo === "editar"}
          label="Email de login"
          name="email"
          required={modo === "criar"}
          type="email"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <CampoTexto
          defaultValue={proprietario?.profile?.phone ?? ""}
          disabled={bloqueado}
          label="Telefone"
          name="telefone"
        />
        <CampoTexto
          disabled={bloqueado || modo === "editar"}
          label="Senha inicial"
          minLength={8}
          name="senha"
          required={modo === "criar"}
          type="password"
        />
        <CampoTexto
          defaultValue={proprietario?.tenant.name ?? ""}
          disabled={bloqueado}
          label="Nome do tenant"
          name="tenantNome"
          required
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <CampoSelect
          defaultValue={proprietario?.tenant.status ?? "trial"}
          disabled={bloqueado}
          label="Status"
          name="status"
          options={STATUS}
        />
        <CampoSelect
          defaultValue={planoPadrao?.id ?? ""}
          disabled={bloqueado}
          label="Plano"
          name="planoId"
          options={planos.map((plano) => ({ label: plano.name, valor: plano.id }))}
        />
        <CampoTexto
          defaultValue={String(obterLimite(proprietario, planoPadrao, "max_properties"))}
          disabled={bloqueado}
          label="Limite de propriedades"
          min={1}
          name="limitePropriedades"
          required
          type="number"
        />
      </div>

      <CampoTexto
        defaultValue={proprietario?.license?.expires_at ?? ""}
        disabled={bloqueado}
        label="Expiracao da licenca"
        name="expiraEm"
        type="date"
      />

      <fieldset className="grid gap-3 rounded-lg border bg-background/45 p-4">
        <legend className="px-1 text-sm font-semibold">Feature flags iniciais</legend>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {featureFlags.map((flag) => (
            <label
              className="flex items-start gap-3 rounded-lg border bg-background/55 p-3 text-sm"
              key={flag.id}
            >
              <input
                className="mt-1"
                defaultChecked={flagEstaAtiva(flag.id, flag.default_enabled)}
                disabled={bloqueado}
                name="featureFlags"
                type="checkbox"
                value={flag.id}
              />
              <span className="min-w-0">
                <span className="block font-medium">{flag.key}</span>
                <span className="block text-xs text-muted-foreground">{flag.module}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {bloqueado ? (
        <p className="text-sm text-destructive">
          Cadastre ou aplique os planos iniciais antes de criar proprietarios.
        </p>
      ) : null}

      <div className="flex justify-end">
        <ActionButton disabled={bloqueado} size="md" type="submit" variant={modo === "criar" ? "add" : "edit"}>
          {modo === "criar" ? "Criar proprietario" : "Salvar proprietario"}
        </ActionButton>
      </div>
    </form>
  );

  function flagEstaAtiva(flagId: string, ativaPorPadrao: boolean) {
    const override = proprietario?.tenantFeatures.find(
      (feature) => feature.feature_flag_id === flagId
    );

    // Um override false precisa prevalecer sobre o default global. Sem esta
    // verificacao, o Super Admin nao conseguiria bloquear uma flag default true.
    if (override) return override.enabled;
    return flagsAtivasDoPlano.has(flagId) || ativaPorPadrao;
  }
}

function CampoTexto({
  label,
  name,
  ...props
}: {
  label: string;
  name: string;
} & ComponentProps<typeof Input>) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} {...props} />
    </div>
  );
}

function CampoSelect({
  defaultValue,
  disabled,
  label,
  name,
  options
}: {
  defaultValue: string;
  disabled: boolean;
  label: string;
  name: string;
  options: Array<{ label: string; valor: string }>;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <select
        className={campoClasse}
        defaultValue={defaultValue}
        disabled={disabled}
        id={name}
        name={name}
      >
        {options.map((option) => (
          <option key={option.valor} value={option.valor}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function obterPlanoPadrao(planos: PlanRow[], proprietario?: ProprietarioCompleto) {
  return (
    planos.find((plano) => plano.id === proprietario?.subscription?.plan_id) ??
    planos.find((plano) => plano.status === "active") ??
    planos[0] ??
    null
  );
}

function obterFlagsDoPlano(planFeatures: PlanFeatureRow[], planoId: string | undefined) {
  if (!planoId) return [];
  return planFeatures
    .filter((feature) => feature.plan_id === planoId && feature.enabled)
    .map((feature) => feature.feature_flag_id);
}

function obterLimite(
  proprietario: ProprietarioCompleto | undefined,
  plano: PlanRow | null,
  chave: "max_properties"
) {
  const limites = proprietario?.license?.limits;
  if (limites && typeof limites === "object" && !Array.isArray(limites)) {
    const valor = limites[chave];
    if (typeof valor === "number") return valor;
  }

  return plano?.[chave] ?? 1;
}
