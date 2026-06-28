import Link from "next/link";

import { buttonVariants, cn } from "@hospedex/ui";

import { PublicShell } from "../../../components/layout/public-shell";
import { GuestReservationDetail } from "../../../components/guest/guest-reservation-detail";
import { GuestStateCard } from "../../../components/guest/guest-state-card";
import { carregarReservaHospede } from "../../../lib/guest/data";

type Params = Promise<{ id: string }>;

export default async function ReservaDetalhePage({ params }: { params: Params }) {
  const { id } = await params;
  const resultado = await carregarReservaHospede(id);

  return (
    <PublicShell>
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:py-14">
        <Link
          className={cn(buttonVariants({ size: "sm", variant: "secondary" }), "w-fit")}
          href="/minhas-reservas"
        >
          Voltar para minhas reservas
        </Link>

        {resultado.estado !== "ok" ? (
          <GuestStateCard estado={resultado.estado} mensagem={resultado.mensagem} />
        ) : !resultado.dados ? (
          <GuestStateCard
            estado="sem_permissao"
            mensagem="Reserva nao encontrada ou sem permissao para esta conta."
          />
        ) : (
          <GuestReservationDetail reserva={resultado.dados} />
        )}
      </section>
    </PublicShell>
  );
}
