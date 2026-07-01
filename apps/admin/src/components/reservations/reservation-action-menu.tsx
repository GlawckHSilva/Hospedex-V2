import { type PropertyRow } from "@hospedex/types";
import { MoreHorizontal, Pencil } from "lucide-react";

import {
  reservaEstaEncerrada,
  type ReservaComRelacionamentos,
} from "../../lib/reservations/types";
import { EntityModal } from "../management/entity-modal";
import { ReservationForm } from "./reservation-form";
import { ReservationStatusActions } from "./reservation-status-actions";

type ReservationActionMenuProps = {
  podeGerenciar: boolean;
  podeGerenciarPagamento: boolean;
  propriedades: PropertyRow[];
  reserva: ReservaComRelacionamentos;
};

/**
 * Menu compacto de ações da reserva.
 *
 * Mantém a tabela limpa: a ação primária continua sendo "Ver detalhes" e as
 * ações de edição/status ficam agrupadas no botão de três pontos.
 */
export function ReservationActionMenu({
  podeGerenciar,
  podeGerenciarPagamento,
  propriedades,
  reserva,
}: ReservationActionMenuProps) {
  const encerrada = reservaEstaEncerrada(reserva.status);

  return (
    <EntityModal
      description="Edite dados e acesse ações operacionais disponíveis para esta reserva."
      eyebrow="Ações"
      size="md"
      title={`Ações da reserva ${reserva.code}`}
      triggerAction="settings"
      triggerClassName="h-9 w-9 px-0"
      triggerIcon={<MoreHorizontal className="h-4 w-4" />}
      triggerLabel="Mais ações"
      triggerSize="icon"
    >
      <div className="grid gap-3">
        {!encerrada ? (
          <EntityModal
            description="Atualize período, hóspede e valores da reserva."
            disabled={!podeGerenciar}
            eyebrow="Edição"
            size="xl"
            title="Editar reserva"
            triggerAction="edit"
            triggerClassName="w-full justify-center"
            triggerIcon={<Pencil className="h-4 w-4" />}
            triggerLabel="Editar reserva"
          >
            <ReservationForm
              modo="editar"
              podeGerenciar={podeGerenciar}
              propriedades={propriedades}
              reserva={reserva}
            />
          </EntityModal>
        ) : (
          <p className="rounded-lg border border-dashed bg-background/45 p-3 text-sm text-muted-foreground">
            Reserva finalizada ou cancelada. Apenas a visualização fica disponível.
          </p>
        )}

        {!encerrada ? (
          <ReservationStatusActions
            podeGerenciar={podeGerenciar}
            podeGerenciarPagamento={podeGerenciarPagamento}
            reserva={reserva}
          />
        ) : null}
      </div>
    </EntityModal>
  );
}
