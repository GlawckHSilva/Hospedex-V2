import type { RegionalGuideLocationRow, RegionalGuideStatus } from "@hospedex/types";

import { Button, Input, Label } from "@hospedex/ui";

import {
  CATEGORIAS_GUIA_REGIAO,
  STATUS_GUIA_REGIAO
} from "../../lib/regional-guide/types";

/**
 * Formulario reutilizavel do Guia da Regiao.
 *
 * A foto principal e armazenada como URL nesta etapa para evitar introduzir novo
 * fluxo de storage antes de existir exibicao publica do guia.
 */

type RegionalGuideFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  local?: RegionalGuideLocationRow;
  modo: "criar" | "editar";
  podeGerenciar: boolean;
};

const campoClasse =
  "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
const areaClasse =
  "min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export function RegionalGuideForm({
  action,
  local,
  modo,
  podeGerenciar
}: RegionalGuideFormProps) {
  return (
    <form action={action} className="grid gap-4">
      {local ? <input name="localId" type="hidden" value={local.id} /> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <CampoTexto
          defaultValue={local?.name ?? ""}
          disabled={!podeGerenciar}
          label="Nome"
          name="name"
          required
        />
        <CampoCategoria defaultValue={local?.category ?? "restaurants"} disabled={!podeGerenciar} />
        <CampoTexto
          defaultValue={String(local?.display_order ?? 0)}
          disabled={!podeGerenciar}
          label="Ordem de exibicao"
          min="0"
          name="displayOrder"
          required
          type="number"
        />
        <CampoStatus defaultValue={local?.status ?? "active"} disabled={!podeGerenciar} />
      </div>

      <CampoTextoArea
        defaultValue={local?.description ?? ""}
        disabled={!podeGerenciar}
        label="Descricao"
        name="description"
      />

      <div className="grid gap-4 md:grid-cols-2">
        <CampoTexto
          defaultValue={local?.address ?? ""}
          disabled={!podeGerenciar}
          label="Endereco"
          name="address"
        />
        <CampoTexto
          defaultValue={local?.opening_hours ?? ""}
          disabled={!podeGerenciar}
          label="Horario de funcionamento"
          name="openingHours"
        />
        <CampoTexto
          defaultValue={local?.phone ?? ""}
          disabled={!podeGerenciar}
          label="Telefone"
          name="phone"
        />
        <CampoTexto
          defaultValue={local?.whatsapp ?? ""}
          disabled={!podeGerenciar}
          label="WhatsApp"
          name="whatsapp"
        />
        <CampoTexto
          defaultValue={local?.website_url ?? ""}
          disabled={!podeGerenciar}
          label="Site"
          name="websiteUrl"
          placeholder="https://..."
          type="url"
        />
        <CampoTexto
          defaultValue={local?.cover_image_url ?? ""}
          disabled={!podeGerenciar}
          label="Foto principal"
          name="coverImageUrl"
          placeholder="https://..."
          type="url"
        />
      </div>

      <Button disabled={!podeGerenciar} type="submit">
        {modo === "criar" ? "Criar local" : "Salvar local"}
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
  placeholder,
  required,
  type = "text"
}: {
  defaultValue: string;
  disabled?: boolean;
  label: string;
  min?: string;
  name: string;
  placeholder?: string;
  required?: boolean;
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
        placeholder={placeholder}
        required={required}
        type={type}
      />
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

function CampoCategoria({
  defaultValue,
  disabled
}: {
  defaultValue: string;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="category">Categoria</Label>
      <select
        className={campoClasse}
        defaultValue={defaultValue}
        disabled={disabled}
        id="category"
        name="category"
      >
        {CATEGORIAS_GUIA_REGIAO.filter((categoria) => categoria.value !== "todas").map(
          (categoria) => (
            <option key={categoria.value} value={categoria.value}>
              {categoria.label}
            </option>
          )
        )}
      </select>
    </div>
  );
}

function CampoStatus({
  defaultValue,
  disabled
}: {
  defaultValue: RegionalGuideStatus;
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
        {STATUS_GUIA_REGIAO.filter((status) => status.value !== "todos").map((status) => (
          <option key={status.value} value={status.value}>
            {status.label}
          </option>
        ))}
      </select>
    </div>
  );
}
