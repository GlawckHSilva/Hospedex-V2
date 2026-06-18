import type { ExtraServiceStatus } from "@hospedex/types";

import { Button, Input, Label } from "@hospedex/ui";

import {
  LABEL_STATUS_SERVICO_EXTRA,
  STATUS_SERVICO_EXTRA,
  TIPOS_COBRANCA_SERVICO_EXTRA,
  type CasaServicoExtra,
  type ServicoExtraComCasas
} from "../../lib/extra-services/types";

/**
 * Formulario reutilizavel do catalogo de Servicos Extras.
 *
 * A lista de casas vem do tenant autenticado; a action valida novamente para
 * impedir vinculos com casas de outro cliente.
 */

type ExtraServiceFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  casas: CasaServicoExtra[];
  modo: "criar" | "editar";
  podeGerenciar: boolean;
  servico?: ServicoExtraComCasas;
};

const campoClasse =
  "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
const areaClasse =
  "min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export function ExtraServiceForm({
  action,
  casas,
  modo,
  podeGerenciar,
  servico
}: ExtraServiceFormProps) {
  const casasSelecionadas = servico?.casas.map((casa) => casa.id) ?? [];

  return (
    <form action={action} className="grid gap-4">
      {servico ? <input name="servicoId" type="hidden" value={servico.id} /> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <CampoTexto
          defaultValue={servico?.name ?? ""}
          disabled={!podeGerenciar}
          label="Nome"
          name="name"
          required
        />
        <CampoTexto
          defaultValue={String(servico?.amount ?? 0)}
          disabled={!podeGerenciar}
          label="Valor"
          min="0"
          name="amount"
          required
          step="0.01"
          type="number"
        />
        <CampoTipoCobranca
          defaultValue={servico?.charge_type ?? "fixed"}
          disabled={!podeGerenciar}
        />
        <CampoStatus defaultValue={servico?.status ?? "active"} disabled={!podeGerenciar} />
      </div>

      <CampoTextoArea
        defaultValue={servico?.description ?? ""}
        disabled={!podeGerenciar}
        label="Descricao"
        name="description"
      />

      <div className="grid gap-3 md:grid-cols-2">
        <CampoCheckbox
          checked={servico?.is_required ?? false}
          disabled={!podeGerenciar}
          label="Servico obrigatorio"
          name="isRequired"
        />
        <CampoCheckbox
          checked={servico?.applies_to_all_properties ?? true}
          disabled={!podeGerenciar}
          label="Vincular a todas as casas"
          name="appliesToAllProperties"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`propertyIds-${servico?.id ?? "novo"}`}>Casas especificas</Label>
        <select
          className={`${campoClasse} h-28`}
          defaultValue={casasSelecionadas}
          disabled={!podeGerenciar}
          id={`propertyIds-${servico?.id ?? "novo"}`}
          multiple
          name="propertyIds"
        >
          {casas.map((casa) => (
            <option key={casa.id} value={casa.id}>
              {casa.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Use esta lista apenas quando o servico nao valer para todas as casas.
        </p>
      </div>

      <CampoTextoArea
        defaultValue={servico?.internal_notes ?? ""}
        disabled={!podeGerenciar}
        label="Observacoes internas"
        name="internalNotes"
      />

      <Button disabled={!podeGerenciar} type="submit">
        {modo === "criar" ? "Criar servico" : "Salvar alteracoes"}
      </Button>
    </form>
  );
}

function CampoTexto({
  defaultValue,
  disabled,
  label,
  min,
  name,
  required,
  step,
  type = "text"
}: {
  defaultValue: string;
  disabled?: boolean;
  label: string;
  min?: string;
  name: string;
  required?: boolean;
  step?: string;
  type?: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        defaultValue={defaultValue}
        disabled={disabled}
        id={name}
        min={min}
        name={name}
        required={required}
        step={step}
        type={type}
      />
    </div>
  );
}

function CampoTipoCobranca({
  defaultValue,
  disabled
}: {
  defaultValue: string;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="chargeType">Tipo de cobranca</Label>
      <select
        className={campoClasse}
        defaultValue={defaultValue}
        disabled={disabled}
        id="chargeType"
        name="chargeType"
      >
        {TIPOS_COBRANCA_SERVICO_EXTRA.map((tipo) => (
          <option key={tipo.value} value={tipo.value}>
            {tipo.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function CampoStatus({
  defaultValue,
  disabled
}: {
  defaultValue: ExtraServiceStatus;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="status">Status</Label>
      <select
        className={campoClasse}
        defaultValue={defaultValue}
        disabled={disabled}
        id="status"
        name="status"
      >
        {STATUS_SERVICO_EXTRA.filter((status) => status.value !== "todos").map((status) => (
          <option key={status.value} value={status.value}>
            {LABEL_STATUS_SERVICO_EXTRA[status.value as ExtraServiceStatus]}
          </option>
        ))}
      </select>
    </div>
  );
}

function CampoTextoArea({
  defaultValue,
  disabled,
  label,
  name
}: {
  defaultValue: string;
  disabled?: boolean;
  label: string;
  name: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <textarea
        className={areaClasse}
        defaultValue={defaultValue}
        disabled={disabled}
        id={name}
        name={name}
      />
    </div>
  );
}

function CampoCheckbox({
  checked,
  disabled,
  label,
  name
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  name: string;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-lg border bg-background/45 px-3 py-2 text-sm">
      <span>{label}</span>
      <input
        className="h-4 w-4 accent-cyan-500"
        defaultChecked={checked}
        disabled={disabled}
        name={name}
        type="checkbox"
      />
    </label>
  );
}
