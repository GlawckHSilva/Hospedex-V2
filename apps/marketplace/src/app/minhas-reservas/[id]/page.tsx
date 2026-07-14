import Link from "next/link";

import { buttonVariants, cn } from "@hospedex/ui";

import { PublicShell } from "../../../components/layout/public-shell";
import { GuestReservationDetail } from "../../../components/guest/guest-reservation-detail";
import { GuestStateCard } from "../../../components/guest/guest-state-card";
import { carregarReservaHospede } from "../../../lib/guest/data";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ erro?: string; sucesso?: string }>;

export default async function ReservaDetalhePage({
  params,
  searchParams
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const query = await searchParams;
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

        {query.sucesso === "reserva-cancelada" ? (
          <div className="rounded-xl border border-success/25 bg-success/10 p-4 text-sm text-success dark:border-emerald-400/25 dark:bg-emerald-500/10 dark:text-emerald-100">
            Reserva cancelada com sucesso. O proprietário foi notificado no
            gerenciamento.
          </div>
        ) : null}

        {query.erro ? (
          <div className="rounded-xl border border-destructive/25 bg-destructive/10 p-4 text-sm text-destructive dark:border-red-400/25 dark:bg-red-500/10 dark:text-red-100">
            {query.erro}
          </div>
        ) : null}

        {resultado.estado !== "ok" ? (
          <GuestStateCard estado={resultado.estado} mensagem={resultado.mensagem} />
        ) : !resultado.dados ? (
          <GuestStateCard
            estado="sem_permissao"
            mensagem="Reserva não encontrada ou sem permissão para esta conta."
          />
        ) : (
          <GuestReservationDetail reserva={resultado.dados} />
        )}
      </section>
    </PublicShell>
  );
}
