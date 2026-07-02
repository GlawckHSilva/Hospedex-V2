import { type PropertyRow } from "@hospedex/types";
import { Info, Plus } from "lucide-react";
import Link from "next/link";

import { type ReservaComRelacionamentos } from "../../lib/reservations/types";
import { EmptyState } from "../management/entity-card";
import { EntityModal } from "../management/entity-modal";
import { ReservationCard } from "./reservation-card";
import { ReservationForm } from "./reservation-form";

type ReservationGridProps = {
  existemFiltrosAtivos: boolean;
  podeGerenciar: boolean;
  podeGerenciarPagamento: boolean;
  propriedades: PropertyRow[];
  reservas: ReservaComRelacionamentos[];
};

/**
 * Lista de Reservas.
 *
 * A listagem usa cards compactos em todos os tamanhos de tela para evitar
 * rolagem horizontal e manter status, pagamento e ações sempre legíveis.
 */
export function ReservationGrid({
  existemFiltrosAtivos,
  podeGerenciar,
  podeGerenciarPagamento,
  propriedades,
  reservas,
}: ReservationGridProps) {
  if (reservas.length === 0) {
    return (
      <EmptyState
        action={
          existemFiltrosAtivos ? (
            <Link
              className="inline-flex h-9 items-center justify-center rounded-lg border border-cyan-400/35 bg-cyan-500/10 px-4 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-500/15 dark:text-cyan-200"
              href="/reservas"
            >
              Limpar filtros
            </Link>
          ) : (
            <EntityModal
              description="Informe casa, período, hóspede e valores da reserva."
              disabled={!podeGerenciar}
              eyebrow="Cadastro"
              size="xl"
              title="Nova reserva manual"
              triggerIcon={<Plus className="h-4 w-4" />}
              triggerLabel="Criar reserva manual"
              triggerVariant="default"
            >
              <ReservationForm
                modo="criar"
                podeGerenciar={podeGerenciar}
                propriedades={propriedades}
              />
            </EntityModal>
          )
        }
        description={
          existemFiltrosAtivos
            ? "Limpe os filtros ou altere a busca para localizar outras reservas."
            : "Quando houver reservas, elas aparecerão aqui."
        }
        title={
          existemFiltrosAtivos
            ? "Nenhuma reserva encontrada com esses filtros"
            : "Nenhuma reserva encontrada"
        }
      />
    );
  }

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-2">
        {reservas.map((reserva) => (
          <ReservationCard
            key={reserva.id}
            podeGerenciar={podeGerenciar}
            podeGerenciarPagamento={podeGerenciarPagamento}
            propriedades={propriedades}
            reserva={reserva}
          />
        ))}
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/8 px-4 py-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-cyan-500" />
        <p>
          As reservas são exibidas em cards compactos para facilitar a leitura e
          agilizar suas ações.
        </p>
      </div>
    </>
  );
}
