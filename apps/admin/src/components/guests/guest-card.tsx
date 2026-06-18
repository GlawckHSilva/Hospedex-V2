import { CalendarDays, Eye, Pencil, UserRound } from "lucide-react";

import { Badge } from "@hospedex/ui";

import {
  EntityCard,
  EntityCardActions,
  EntityCardHeader,
} from "../management/entity-card";
import { EntityModal, EntityViewModal } from "../management/entity-modal";
import {
  LABEL_AVALIACAO_HOSPEDE_CRM,
  LABEL_STATUS_HOSPEDE_CRM,
  type HospedeCrmCompleto,
} from "../../lib/guests/types";
import { GuestForm } from "./guest-form";

/**
 * Card compacto de hospede/CRM.
 */
export type GuestCardProps = {
  hospede: HospedeCrmCompleto;
  podeGerenciar: boolean;
};

export function GuestCard({ hospede, podeGerenciar }: GuestCardProps) {
  const ultimaHospedagem = hospede.metricas.ultimaHospedagem
    ? formatarData(hospede.metricas.ultimaHospedagem)
    : "Sem historico";

  return (
    <EntityCard>
      <EntityCardHeader
        badges={
          <>
            <Badge variant={hospede.status === "blocked" ? "warning" : "success"}>
              {LABEL_STATUS_HOSPEDE_CRM[hospede.status]}
            </Badge>
            <Badge
              variant={hospede.internal_rating === "attention" ? "warning" : "outline"}
            >
              {LABEL_AVALIACAO_HOSPEDE_CRM[hospede.internal_rating]}
            </Badge>
          </>
        }
        icon={<UserRound />}
        subtitle={hospede.phone ?? "Sem telefone"}
        title={hospede.full_name}
      />

      <div className="grid gap-3 text-sm">
        <Info label="E-mail" valor={hospede.email ?? "Sem e-mail"} />
        <Info label="Ultima hospedagem" valor={ultimaHospedagem} />
      </div>

      <EntityCardActions>
        <EntityViewModal
          description="Resumo do perfil, reservas e timeline do hospede."
          title={`Perfil de ${hospede.full_name}`}
          triggerClassName="h-9 justify-center"
          triggerIcon={<Eye className="h-4 w-4" />}
          triggerLabel="Visualizar"
        >
          <section className="grid gap-3 md:grid-cols-2">
            <Info label="Telefone" valor={hospede.phone ?? "Nao informado"} />
            <Info label="E-mail" valor={hospede.email ?? "Nao informado"} />
            <Info label="Documento" valor={hospede.document_number ?? "Nao informado"} />
            <Info label="Cidade" valor={hospede.city ?? "Nao informada"} />
            <Info label="Estado" valor={hospede.state ?? "Nao informado"} />
            <Info label="Ultima hospedagem" valor={ultimaHospedagem} />
            <Info label="Reservas" valor={String(hospede.metricas.quantidadeReservas)} />
            <Info label="Cancelamentos" valor={String(hospede.metricas.cancelamentos)} />
          </section>

          <div className="mt-5 space-y-2">
            <h3 className="flex items-center gap-2 font-semibold">
              <CalendarDays className="h-4 w-4 text-primary" />
              Historico recente
            </h3>
            {hospede.reservas.length > 0 ? (
              hospede.reservas.slice(0, 5).map((reserva) => (
                <div className="rounded-lg border bg-background/55 p-3 text-sm" key={reserva.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">{reserva.code}</span>
                    <Badge variant="outline">{reserva.status}</Badge>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    {reserva.propriedade?.name ?? "Propriedade"}
                  </p>
                </div>
              ))
            ) : (
              <p className="rounded-lg border border-dashed bg-background/45 p-3 text-sm text-muted-foreground">
                Sem reservas vinculadas.
              </p>
            )}
          </div>
        </EntityViewModal>

        <EntityModal
          description="Atualize dados do perfil e observacoes internas."
          disabled={!podeGerenciar}
          eyebrow="Edicao"
          title="Perfil do hospede"
          triggerClassName="h-9 justify-center"
          triggerIcon={<Pencil className="h-4 w-4" />}
          triggerLabel="Editar"
        >
          <GuestForm hospede={hospede} podeGerenciar={podeGerenciar} />
        </EntityModal>
      </EntityCardActions>
    </EntityCard>
  );
}

function Info({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-lg border bg-background/45 p-3 text-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-medium">{valor}</p>
    </div>
  );
}

function formatarData(valor: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: "UTC",
  }).format(new Date(`${valor}T00:00:00Z`));
}
