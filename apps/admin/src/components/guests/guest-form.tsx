import { Button, Input, Label } from "@hospedex/ui";
import type { ComponentProps } from "react";

import { atualizarHospedeAction, criarHospedeAction } from "../../lib/guests/actions";
import {
  AVALIACOES_HOSPEDE_CRM,
  LABEL_AVALIACAO_HOSPEDE_CRM,
  type HospedeCrmCompleto
} from "../../lib/guests/types";

/**
 * Formulario de perfil do hospede.
 *
 * Edita apenas dados do CRM do tenant atual. Reservas continuam imutaveis aqui
 * para preservar historico operacional e financeiro.
 */

export type GuestFormProps = {
  hospede?: HospedeCrmCompleto;
  modo?: "criar" | "editar";
  podeGerenciar: boolean;
};

const campoClasse =
  "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
const areaClasse =
  "min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export function GuestForm({ hospede, modo = "editar", podeGerenciar }: GuestFormProps) {
  const editando = modo === "editar";

  return (
    <form action={editando ? atualizarHospedeAction : criarHospedeAction} className="grid gap-4">
      {editando && hospede ? <input name="hospedeId" type="hidden" value={hospede.id} /> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <CampoTexto
          defaultValue={hospede?.full_name ?? ""}
          disabled={!podeGerenciar}
          label="Nome"
          name="fullName"
          required
        />
        <CampoAvaliacao
          defaultValue={hospede?.internal_rating ?? "neutral"}
          disabled={!podeGerenciar}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <CampoTexto
          defaultValue={hospede?.phone ?? ""}
          disabled={!podeGerenciar}
          label="Telefone"
          name="phone"
        />
        <CampoTexto
          defaultValue={hospede?.email ?? ""}
          disabled={!podeGerenciar}
          label="E-mail"
          name="email"
          type="email"
        />
        <CampoTexto
          defaultValue={hospede?.document_number ?? ""}
          disabled={!podeGerenciar}
          label="Documento"
          name="documentNumber"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <CampoTexto
          defaultValue={hospede?.city ?? ""}
          disabled={!podeGerenciar}
          label="Cidade"
          name="city"
        />
        <CampoTexto
          defaultValue={hospede?.state ?? ""}
          disabled={!podeGerenciar}
          label="Estado"
          name="state"
        />
        <CampoTexto
          defaultValue={hospede?.birth_date ?? ""}
          disabled={!podeGerenciar}
          label="Aniversario"
          name="birthDate"
          type="date"
        />
      </div>

      <CampoArea
        defaultValue={hospede?.private_notes ?? ""}
        disabled={!podeGerenciar}
        label="Observacoes privadas"
        name="privateNotes"
      />

      <div className="flex justify-end">
        <Button disabled={!podeGerenciar} type="submit">
          {editando ? "Salvar hospede" : "Criar hospede"}
        </Button>
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

function CampoArea({
  defaultValue,
  disabled,
  label,
  name
}: {
  defaultValue: string;
  disabled: boolean;
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

function CampoAvaliacao({
  defaultValue,
  disabled
}: {
  defaultValue: string;
  disabled: boolean;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="internalRating">Avaliacao interna</Label>
      <select
        className={campoClasse}
        defaultValue={defaultValue}
        disabled={disabled}
        id="internalRating"
        name="internalRating"
      >
        {AVALIACOES_HOSPEDE_CRM.map((avaliacao) => (
          <option key={avaliacao} value={avaliacao}>
            {LABEL_AVALIACAO_HOSPEDE_CRM[avaliacao]}
          </option>
        ))}
      </select>
    </div>
  );
}
