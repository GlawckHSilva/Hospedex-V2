import type { ComponentProps } from "react";

import { Button, Input, Label } from "@hospedex/ui";

import {
  atualizarPlanoAction,
  criarPlanoAction
} from "../../../lib/super-admin/planos/actions";
import type { DadosModuloPlanos, PlanoCompleto } from "../../../lib/super-admin/planos/types";

export type PlanoFormProps = {
  featureFlags: DadosModuloPlanos["featureFlags"];
  modo: "criar" | "editar";
  plano?: PlanoCompleto;
};

const campoClasse =
  "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const areaClasse =
  "min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const STATUS = [
  { label: "Rascunho", valor: "draft" },
  { label: "Ativo", valor: "active" },
  { label: "Arquivado", valor: "archived" }
];

/**
 * Formulario administrativo de planos.
 *
 * A regra de persistencia e auditoria fica nas server actions; o componente
 * apenas monta campos reutilizaveis para criacao e edicao.
 */
export function PlanoForm({ featureFlags, modo, plano }: PlanoFormProps) {
  const action = modo === "criar" ? criarPlanoAction : atualizarPlanoAction;
  const recursosAtivos = new Set(plano?.recursos.map((recurso) => recurso.id) ?? []);

  return (
    <form action={action} className="grid gap-4">
      {plano ? <input name="planId" type="hidden" value={plano.plan.id} /> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <CampoTexto
          defaultValue={plano?.plan.name ?? ""}
          label="Nome do plano"
          name="nome"
          required
        />
        <CampoTexto
          defaultValue={plano?.plan.code ?? ""}
          label="Codigo"
          name="codigo"
          required
        />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <CampoTexto
          defaultValue={formatarValorInput(plano?.plan.monthly_price)}
          label="Valor mensal"
          min={0}
          name="valorMensal"
          required
          step="0.01"
          type="number"
        />
        <CampoTexto
          defaultValue={String(plano?.plan.max_properties ?? 1)}
          label="Limite de propriedades"
          min={1}
          name="limitePropriedades"
          required
          type="number"
        />
        <CampoTexto
          defaultValue={String(plano?.plan.max_units ?? 1)}
          label="Limite de unidades"
          min={1}
          name="limiteUnidades"
          required
          type="number"
        />
        <CampoSelect
          defaultValue={plano?.plan.status ?? "active"}
          label="Status"
          name="status"
          options={STATUS}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`descricao-${plano?.plan.id ?? "novo"}`}>Descricao</Label>
        <textarea
          className={areaClasse}
          defaultValue={plano?.plan.description ?? ""}
          id={`descricao-${plano?.plan.id ?? "novo"}`}
          name="descricao"
          placeholder="Resumo comercial do plano"
        />
      </div>

      <fieldset className="grid gap-3 rounded-lg border bg-background/45 p-4">
        <legend className="px-1 text-sm font-semibold">Recursos incluidos</legend>
        {featureFlags.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {featureFlags.map((flag) => (
              <label
                className="flex items-start gap-3 rounded-lg border bg-background/55 p-3 text-sm"
                key={flag.id}
              >
                <input
                  className="mt-1"
                  defaultChecked={modo === "criar" ? flag.default_enabled : recursosAtivos.has(flag.id)}
                  name="recursos"
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
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhuma feature flag cadastrada para associar ao plano.
          </p>
        )}
      </fieldset>

      <div className="flex justify-end">
        <Button type="submit">{modo === "criar" ? "Criar plano" : "Salvar plano"}</Button>
      </div>
    </form>
  );
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
  label,
  name,
  options
}: {
  defaultValue: string;
  label: string;
  name: string;
  options: Array<{ label: string; valor: string }>;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <select className={campoClasse} defaultValue={defaultValue} id={name} name={name}>
        {options.map((option) => (
          <option key={option.valor} value={option.valor}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function formatarValorInput(valor: number | undefined) {
  if (typeof valor !== "number") return "0.00";
  return valor.toFixed(2);
}
