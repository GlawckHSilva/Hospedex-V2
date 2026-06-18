import type { PropertyRow, UnitRow } from "@hospedex/types";

import { Card, CardContent } from "@hospedex/ui";

import type { ReservaComRelacionamentos } from "../../lib/reservations/types";
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
      <Card className="admin-glass-card">
        <CardContent className="grid min-h-52 place-items-center p-8 text-center">
          <div>
            <p className="text-base font-semibold">
              Nenhuma reserva encontrada
            </p>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Ajuste os filtros ou registre uma nova reserva manual quando
              houver demanda confirmada.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {reservas.map((reserva) => (
        <ReservationCard
          key={reserva.id}
          podeGerenciar={podeGerenciar}
          propriedades={propriedades}
          reserva={reserva}
          unidades={unidades}
        />
      ))}
    </section>
  );
}
