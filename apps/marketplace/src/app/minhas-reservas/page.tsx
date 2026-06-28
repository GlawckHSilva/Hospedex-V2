import { CalendarCheck, Search } from "lucide-react";
import Link from "next/link";

import { GlassCard, PremiumEmptyState, buttonVariants, cn } from "@hospedex/ui";

import { PublicShell } from "../../components/layout/public-shell";
import { GuestReservationCard } from "../../components/guest/guest-reservation-card";
import { GuestStateCard } from "../../components/guest/guest-state-card";
import { carregarReservasHospede } from "../../lib/guest/data";

export default async function MinhasReservasPage() {
  const resultado = await carregarReservasHospede();

  return (
    <PublicShell>
      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:py-14">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            Area do Hospede
          </p>
          <h1 className="mt-3 text-4xl font-semibold">Minhas reservas</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Acompanhe solicitacoes, status de pagamento, voucher e instrucoes da viagem.
          </p>
        </div>

        {resultado.estado !== "ok" ? (
          <GuestStateCard estado={resultado.estado} mensagem={resultado.mensagem} />
        ) : resultado.dados?.length ? (
          <div className="grid gap-5">
            {resultado.dados.map((reserva) => (
              <GuestReservationCard key={reserva.id} reserva={reserva} />
            ))}
          </div>
        ) : (
          <GlassCard className="p-8">
            <PremiumEmptyState
              action={
                <Link className={cn(buttonVariants({ variant: "default" }))} href="/propriedades">
                  <Search className="h-4 w-4" />
                  Buscar hospedagens
                </Link>
              }
              description="Voce ainda nao possui reservas vinculadas a esta conta."
              icon={<CalendarCheck className="h-5 w-5" />}
              title="Nenhuma reserva encontrada"
            />
          </GlassCard>
        )}
      </section>
    </PublicShell>
  );
}
