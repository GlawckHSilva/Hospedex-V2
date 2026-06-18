import { Button, Input, Label } from "@hospedex/ui";

import {
  atualizarPoliticaCancelamentoAction,
  atualizarRegrasCasaAction,
  atualizarRegrasReservaAction
} from "../../lib/properties/actions";
import type { PropriedadeComRelacionamentos } from "../../lib/properties/types";

/**
 * Painel de politicas e regras por casa.
 *
 * Estes dados ficam apenas no Gerenciamento nesta etapa. Marketplace, calculo
 * de disponibilidade e cancelamento real consumirao estes campos futuramente.
 */

type PropertyRulesPanelProps = {
  podeGerenciar: boolean;
  propriedade: PropriedadeComRelacionamentos;
};

const campoClasse =
  "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
const areaClasse =
  "min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export function PropertyRulesPanel({ podeGerenciar, propriedade }: PropertyRulesPanelProps) {
  const regras = propriedade.regras;

  return (
    <section className="grid gap-3 lg:grid-cols-3">
      <details className="rounded-lg border bg-background/45 p-3">
        <summary className="cursor-pointer text-sm font-semibold">Regras</summary>
        <form action={atualizarRegrasCasaAction} className="mt-4 grid gap-4">
          <input name="propriedadeId" type="hidden" value={propriedade.id} />
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoTexto
              defaultValue={formatarHora(regras.check_in_time)}
              disabled={!podeGerenciar}
              label="Check-in"
              name="checkInTime"
              type="time"
            />
            <CampoTexto
              defaultValue={formatarHora(regras.check_out_time)}
              disabled={!podeGerenciar}
              label="Check-out"
              name="checkOutTime"
              type="time"
            />
            <CampoTexto
              defaultValue={String(regras.max_guests)}
              disabled={!podeGerenciar}
              label="Capacidade maxima"
              min="1"
              name="maxGuests"
              required
              type="number"
            />
            <CampoTexto
              defaultValue={String(regras.min_responsible_age)}
              disabled={!podeGerenciar}
              label="Idade minima"
              min="0"
              name="minResponsibleAge"
              required
              type="number"
            />
          </div>
          <div className="grid gap-3">
            <CampoCheckbox checked={regras.allow_pets} disabled={!podeGerenciar} label="Permite pets" name="allowPets" />
            <CampoCheckbox checked={regras.allow_smoking} disabled={!podeGerenciar} label="Permite fumantes" name="allowSmoking" />
            <CampoCheckbox checked={regras.allow_events} disabled={!podeGerenciar} label="Permite festas/eventos" name="allowEvents" />
          </div>
          <CampoTextoArea
            defaultValue={regras.additional_rules ?? ""}
            disabled={!podeGerenciar}
            label="Regras adicionais"
            name="additionalRules"
          />
          <Button disabled={!podeGerenciar} type="submit">
            Salvar regras
          </Button>
        </form>
      </details>

      <details className="rounded-lg border bg-background/45 p-3">
        <summary className="cursor-pointer text-sm font-semibold">Cancelamento</summary>
        <form action={atualizarPoliticaCancelamentoAction} className="mt-4 grid gap-4">
          <input name="propriedadeId" type="hidden" value={propriedade.id} />
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoTexto
              defaultValue={String(regras.cancellation_refund_until_days)}
              disabled={!podeGerenciar}
              label="Ate X dias antes"
              min="0"
              name="refundUntilDays"
              required
              type="number"
            />
            <CampoTexto
              defaultValue={String(regras.cancellation_refund_until_percentage)}
              disabled={!podeGerenciar}
              label="% reembolso"
              max="100"
              min="0"
              name="refundUntilPercentage"
              required
              step="0.01"
              type="number"
            />
            <CampoTexto
              defaultValue={String(regras.cancellation_late_until_days)}
              disabled={!podeGerenciar}
              label="Menos de X dias"
              min="0"
              name="lateUntilDays"
              required
              type="number"
            />
            <CampoTexto
              defaultValue={String(regras.cancellation_late_refund_percentage)}
              disabled={!podeGerenciar}
              label="% reembolso tardio"
              max="100"
              min="0"
              name="lateRefundPercentage"
              required
              step="0.01"
              type="number"
            />
            <CampoTexto
              defaultValue={String(regras.cancellation_no_refund_within_days)}
              disabled={!podeGerenciar}
              label="Sem reembolso em X dias"
              min="0"
              name="noRefundWithinDays"
              required
              type="number"
            />
          </div>
          <CampoTextoArea
            defaultValue={regras.cancellation_notes ?? ""}
            disabled={!podeGerenciar}
            label="Observacoes"
            name="cancellationNotes"
          />
          <Button disabled={!podeGerenciar} type="submit">
            Salvar cancelamento
          </Button>
        </form>
      </details>

      <details className="rounded-lg border bg-background/45 p-3">
        <summary className="cursor-pointer text-sm font-semibold">Reserva</summary>
        <form action={atualizarRegrasReservaAction} className="mt-4 grid gap-4">
          <input name="propriedadeId" type="hidden" value={propriedade.id} />
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoTexto
              defaultValue={String(regras.min_nights)}
              disabled={!podeGerenciar}
              label="Minimo de diarias"
              min="1"
              name="minNights"
              required
              type="number"
            />
            <CampoTexto
              defaultValue={regras.max_nights ? String(regras.max_nights) : ""}
              disabled={!podeGerenciar}
              label="Maximo de diarias"
              min="1"
              name="maxNights"
              type="number"
            />
            <CampoTexto
              defaultValue={String(regras.min_advance_days)}
              disabled={!podeGerenciar}
              label="Antecedencia minima"
              min="0"
              name="minAdvanceDays"
              required
              type="number"
            />
            <CampoTexto
              defaultValue={regras.max_advance_days ? String(regras.max_advance_days) : ""}
              disabled={!podeGerenciar}
              label="Antecedencia maxima"
              min="0"
              name="maxAdvanceDays"
              type="number"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`bookingMode-${propriedade.id}`}>Modo de reserva</Label>
            <select
              className={campoClasse}
              defaultValue={regras.booking_mode}
              disabled={!podeGerenciar}
              id={`bookingMode-${propriedade.id}`}
              name="bookingMode"
            >
              <option value="manual_approval">Exigir aprovacao manual</option>
              <option value="instant_booking">Permitir reserva automatica futuramente</option>
            </select>
          </div>
          <Button disabled={!podeGerenciar} type="submit">
            Salvar reserva
          </Button>
        </form>
      </details>
    </section>
  );
}

function CampoTexto({
  defaultValue,
  disabled,
  label,
  max,
  min,
  name,
  required,
  step,
  type = "text"
}: {
  defaultValue: string;
  disabled?: boolean;
  label: string;
  max?: string;
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
        max={max}
        min={min}
        name={name}
        required={required}
        step={step}
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

function formatarHora(valor: string | null): string {
  return valor?.slice(0, 5) ?? "";
}
