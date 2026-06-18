import type { PropertyRow, UnitRow } from "@hospedex/types";
import { Button, Input, Label } from "@hospedex/ui";
import type { ComponentProps } from "react";

import {
  atualizarReservaAction,
  criarReservaManualAction,
} from "../../lib/reservations/actions";
import type { ReservaComRelacionamentos } from "../../lib/reservations/types";

/**
 * Formulário de reserva manual.
 *
 * O formulário não define tenant nem owner. Esses vínculos são resolvidos nas
 * server actions para impedir criação de reservas fora do cliente autenticado.
 */

export type ReservationFormProps = {
  modo: "criar" | "editar";
  podeGerenciar: boolean;
  propriedades: PropertyRow[];
  reserva?: ReservaComRelacionamentos;
  unidades: UnitRow[];
};

const campoClasse =
  "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
const areaClasse =
  "min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export function ReservationForm({
  modo,
  podeGerenciar,
  propriedades,
  reserva,
  unidades,
}: ReservationFormProps) {
  const action =
    modo === "editar" ? atualizarReservaAction : criarReservaManualAction;
  const bloqueado = !podeGerenciar || propriedades.length === 0;
  const propriedadeSelecionada =
    reserva?.property_id ?? propriedades[0]?.id ?? "";

  return (
    <form action={action} className="grid gap-4">
      {reserva ? (
        <input name="reservaId" type="hidden" value={reserva.id} />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <CampoPropriedade
          defaultValue={propriedadeSelecionada}
          disabled={bloqueado}
          propriedades={propriedades}
        />
        <CampoUnidade
          defaultValue={reserva?.unit_id ?? ""}
          disabled={bloqueado}
          unidades={unidades}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <CampoTexto
          defaultValue={reserva?.hospedes[0]?.full_name}
          disabled={bloqueado}
          label="Hóspede principal"
          name="hospedeNome"
          required
        />
        <CampoTexto
          defaultValue={reserva?.hospedes[0]?.email ?? ""}
          disabled={bloqueado}
          label="E-mail"
          name="hospedeEmail"
          type="email"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <CampoTexto
          defaultValue={reserva?.hospedes[0]?.phone ?? ""}
          disabled={bloqueado}
          label="Telefone"
          name="hospedeTelefone"
        />
        <CampoTexto
          defaultValue={reserva?.hospedes[0]?.document_number ?? ""}
          disabled={bloqueado}
          label="Documento"
          name="hospedeDocumento"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <CampoTexto
          defaultValue={reserva?.check_in}
          disabled={bloqueado}
          label="Check-in"
          name="checkIn"
          required
          type="date"
        />
        <CampoTexto
          defaultValue={reserva?.check_out}
          disabled={bloqueado}
          label="Check-out"
          name="checkOut"
          required
          type="date"
        />
        <CampoTexto
          defaultValue={String(reserva?.guests_count ?? 1)}
          disabled={bloqueado}
          label="Hóspedes"
          min={1}
          name="quantidadeHospedes"
          required
          type="number"
        />
        <CampoTexto
          defaultValue={String(reserva?.total_amount ?? 0)}
          disabled={bloqueado}
          label="Valor base"
          min={0}
          name="valorBase"
          required
          step="0.01"
          type="number"
        />
      </div>

      <CampoArea
        defaultValue={reserva?.notes ?? ""}
        disabled={bloqueado}
        label="Observações gerais"
        name="observacoes"
      />

      <div className="grid gap-4 md:grid-cols-2">
        <CampoArea
          defaultValue={reserva?.guest_notes ?? ""}
          disabled={bloqueado}
          label="Observações para hóspede"
          name="observacoesHospede"
        />
        <CampoArea
          defaultValue={reserva?.internal_notes ?? ""}
          disabled={bloqueado}
          label="Observações internas"
          name="observacoesInternas"
        />
      </div>

      {modo === "criar" ? <CamposServicoExtra disabled={bloqueado} /> : null}

      <div className="flex justify-end">
        <Button disabled={bloqueado} type="submit">
          {modo === "editar" ? "Salvar reserva" : "Criar reserva"}
        </Button>
      </div>
    </form>
  );
}

function CamposServicoExtra({ disabled }: { disabled: boolean }) {
  return (
    <div className="rounded-lg border bg-background/45 p-3">
      <p className="text-sm font-semibold">Serviço extra inicial</p>
      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_0.5fr_0.5fr]">
        <CampoTexto disabled={disabled} label="Nome" name="servicoExtraNome" />
        <CampoTexto
          defaultValue="1"
          disabled={disabled}
          label="Quantidade"
          min={1}
          name="servicoExtraQuantidade"
          type="number"
        />
        <CampoTexto
          defaultValue="0"
          disabled={disabled}
          label="Valor"
          min={0}
          name="servicoExtraValor"
          step="0.01"
          type="number"
        />
        <div className="md:col-span-3">
          <CampoArea
            disabled={disabled}
            label="Descrição"
            name="servicoExtraDescricao"
          />
        </div>
      </div>
    </div>
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
  name,
}: {
  defaultValue?: string;
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

function CampoPropriedade({
  defaultValue,
  disabled,
  propriedades,
}: {
  defaultValue: string;
  disabled: boolean;
  propriedades: PropertyRow[];
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="propriedadeId">Propriedade</Label>
      <select
        className={campoClasse}
        defaultValue={defaultValue}
        disabled={disabled}
        id="propriedadeId"
        name="propriedadeId"
      >
        {propriedades.map((propriedade) => (
          <option key={propriedade.id} value={propriedade.id}>
            {propriedade.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function CampoUnidade({
  defaultValue,
  disabled,
  unidades,
}: {
  defaultValue: string;
  disabled: boolean;
  unidades: UnitRow[];
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="unidadeId">Unidade</Label>
      <select
        className={campoClasse}
        defaultValue={defaultValue}
        disabled={disabled}
        id="unidadeId"
        name="unidadeId"
      >
        <option value="">Sem unidade específica</option>
        {unidades.map((unidade) => (
          <option key={unidade.id} value={unidade.id}>
            {unidade.name}
          </option>
        ))}
      </select>
    </div>
  );
}
