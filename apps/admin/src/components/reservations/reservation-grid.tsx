import type { PropertyRow } from "@hospedex/types";

import type { ReservaComRelacionamentos } from "../../lib/reservations/types";
import { EmptyState, EntityGrid } from "../management/entity-card";
import { ReservationCard } from "./reservation-card";

type ReservationGridProps = {
  podeGerenciar: boolean;
  podeGerenciarPagamento: boolean;
  propriedades: PropertyRow[];
  reservas: ReservaComRelacionamentos[];
};

export function ReservationGrid({
  podeGerenciar,
  podeGerenciarPagamento,
  propriedades,
  reservas,
}: ReservationGridProps) {
  if (reservas.length === 0) {
    return (
      <EmptyState
        description="Quando um hospede solicitar uma hospedagem, ela aparecera aqui. Ajuste os filtros se estiver procurando uma reserva especifica."
        title="Nenhuma reserva encontrada"
      />
    );
  }

  return (
    <EntityGrid className="lg:grid-cols-3">
      {reservas.map((reserva) => (
        <ReservationCard
          key={reserva.id}
          podeGerenciar={podeGerenciar}
          podeGerenciarPagamento={podeGerenciarPagamento}
          propriedades={propriedades}
          reserva={reserva}
        />
      ))}
    </EntityGrid>
  );
}
