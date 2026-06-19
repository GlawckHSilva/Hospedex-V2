import type { PropertyRow, UnitRow } from "@hospedex/types";

import type { ReservaComRelacionamentos } from "../../lib/reservations/types";
import { EmptyState, EntityGrid } from "../management/entity-card";
import { ReservationCard } from "./reservation-card";

type ReservationGridProps = {
  podeGerenciar: boolean;
  propriedades: PropertyRow[];
  reservas: ReservaComRelacionamentos[];
  unidades: UnitRow[];
};

export function ReservationGrid({
  podeGerenciar,
  propriedades,
  reservas,
  unidades,
}: ReservationGridProps) {
  if (reservas.length === 0) {
    return (
      <EmptyState
        description="Ajuste os filtros ou registre uma nova reserva manual quando houver demanda confirmada."
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
          propriedades={propriedades}
          reserva={reserva}
          unidades={unidades}
        />
      ))}
    </EntityGrid>
  );
}
