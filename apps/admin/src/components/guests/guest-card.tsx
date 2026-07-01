import { CalendarDays, Eye, Mail, Pencil, Phone } from "lucide-react";

import { Badge, Card, CardContent, cn } from "@hospedex/ui";

import { EntityModal, EntityViewModal } from "../management/entity-modal";
import {
  LABEL_AVALIACAO_HOSPEDE_CRM,
  LABEL_STATUS_HOSPEDE_CRM,
  type HospedeCrmCompleto,
  type ReservaHospede,
} from "../../lib/guests/types";
import { GuestDeleteDialog } from "./guest-delete-dialog";
import { GuestForm } from "./guest-form";

/**
 * Linhas e cards compactos do CRM de hóspedes.
 *
 * A tabela desktop prioriza leitura rápida. No mobile, o mesmo conteúdo vira
 * card compacto para manter ações acessíveis sem scroll horizontal forçado.
 */

export type GuestCardProps = {
  hospede: HospedeCrmCompleto;
  podeGerenciar: boolean;
};

export function GuestTableRow({ hospede, podeGerenciar }: GuestCardProps) {
  const ultimaReserva = obterUltimaReserva(hospede);

  return (
    <tr className="border-b border-border/60 transition hover:bg-cyan-500/[0.035]">
      <td className="px-5 py-5">
        <HospedeIdentidade hospede={hospede} />
      </td>
      <td className="px-5 py-5">
        <ContatoHospede hospede={hospede} />
      </td>
      <td className="px-5 py-5">
        <UltimaHospedagem reserva={ultimaReserva} />
      </td>
      <td className="px-5 py-5">
        <GuestActions hospede={hospede} podeGerenciar={podeGerenciar} />
      </td>
    </tr>
  );
}

export function GuestMobileCard({ hospede, podeGerenciar }: GuestCardProps) {
  const ultimaReserva = obterUltimaReserva(hospede);

  return (
    <Card className="admin-glass-card overflow-hidden lg:hidden">
      <CardContent className="space-y-4 p-4">
        <HospedeIdentidade hospede={hospede} />
        <ContatoHospede hospede={hospede} />
        <UltimaHospedagem reserva={ultimaReserva} />
        <GuestActions hospede={hospede} podeGerenciar={podeGerenciar} />
      </CardContent>
    </Card>
  );
}

function HospedeIdentidade({ hospede }: { hospede: HospedeCrmCompleto }) {
  return (
    <div className="flex min-w-0 items-center gap-4">
      <span
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold",
          classeAvatar(hospede)
        )}
      >
        {obterIniciais(hospede.full_name)}
      </span>
      <div className="min-w-0">
        <p className="truncate text-base font-semibold text-foreground">{hospede.full_name}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge variant={hospede.status === "blocked" ? "danger" : "success"}>
            {LABEL_STATUS_HOSPEDE_CRM[hospede.status]}
          </Badge>
          {hospede.metricas.quantidadeReservas >= 2 ? (
            <Badge variant="info">Recorrente</Badge>
          ) : null}
          <Badge
            variant={
              hospede.internal_rating === "attention"
                ? "warning"
                : hospede.internal_rating === "blocked"
                  ? "danger"
                  : "outline"
            }
          >
            {LABEL_AVALIACAO_HOSPEDE_CRM[hospede.internal_rating]}
          </Badge>
        </div>
      </div>
    </div>
  );
}

function ContatoHospede({ hospede }: { hospede: HospedeCrmCompleto }) {
  return (
    <div className="grid gap-2 text-sm text-muted-foreground">
      <span className="flex min-w-0 items-center gap-2">
        <Phone className="h-4 w-4 shrink-0 text-cyan-300" />
        <span className="truncate">{hospede.phone ?? "Sem telefone"}</span>
      </span>
      <span className="flex min-w-0 items-center gap-2">
        <Mail className="h-4 w-4 shrink-0 text-cyan-300" />
        <span className="truncate">{hospede.email ?? "Sem e-mail"}</span>
      </span>
    </div>
  );
}

function UltimaHospedagem({ reserva }: { reserva: ReservaHospede | null }) {
  if (!reserva) {
    return (
      <div className="text-sm">
        <p className="font-medium text-foreground">Sem histórico</p>
        <p className="mt-1 text-muted-foreground">Nenhuma hospedagem</p>
      </div>
    );
  }

  return (
    <div className="text-sm">
      <p className="flex items-center gap-2 font-medium text-foreground">
        <CalendarDays className="h-4 w-4 text-cyan-300" />
        {formatarData(reserva.check_out)}
      </p>
      <p className="mt-1 text-muted-foreground">{reserva.propriedade?.name ?? "Casa removida"}</p>
      <p className="text-muted-foreground">{calcularDiarias(reserva)} diária(s)</p>
    </div>
  );
}

function GuestActions({ hospede, podeGerenciar }: GuestCardProps) {
  const motivoBloqueio =
    hospede.remocaoCrm.motivo ??
    "Não é possível apagar hóspedes com histórico operacional ativo.";

  return (
    <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
      <GuestViewModal hospede={hospede} />

      <EntityModal
        description="Atualize dados do perfil e observações internas."
        disabled={!podeGerenciar}
        eyebrow="Edição"
        title="Perfil do hóspede"
        triggerAction="edit"
        triggerClassName="h-10 px-4"
        triggerIcon={<Pencil className="h-4 w-4" />}
        triggerLabel="Editar"
      >
        <GuestForm hospede={hospede} modo="editar" podeGerenciar={podeGerenciar} />
      </EntityModal>

      <GuestDeleteDialog
        disabled={!podeGerenciar || !hospede.remocaoCrm.permitida}
        hospedeId={hospede.id}
        motivo={motivoBloqueio}
        nome={hospede.full_name}
      />
    </div>
  );
}

function GuestViewModal({ hospede }: { hospede: HospedeCrmCompleto }) {
  const ultimaReserva = obterUltimaReserva(hospede);

  return (
    <EntityViewModal
      description="Resumo do perfil, reservas e timeline do hóspede."
      title={`Perfil de ${hospede.full_name}`}
      triggerClassName="h-10 px-4"
      triggerIcon={<Eye className="h-4 w-4" />}
      triggerLabel="Visualizar"
    >
      <section className="grid gap-3 md:grid-cols-2">
        <Info label="Telefone" valor={hospede.phone ?? "Não informado"} />
        <Info label="E-mail" valor={hospede.email ?? "Não informado"} />
        <Info label="Documento" valor={hospede.document_number ?? "Não informado"} />
        <Info label="Cidade" valor={hospede.city ?? "Não informada"} />
        <Info label="Estado" valor={hospede.state ?? "Não informado"} />
        <Info
          label="Última hospedagem"
          valor={ultimaReserva ? formatarData(ultimaReserva.check_out) : "Sem histórico"}
        />
        <Info label="Reservas" valor={String(hospede.metricas.quantidadeReservas)} />
        <Info label="Cancelamentos" valor={String(hospede.metricas.cancelamentos)} />
      </section>

      <div className="mt-5 space-y-2">
        <h3 className="flex items-center gap-2 font-semibold">
          <CalendarDays className="h-4 w-4 text-primary" />
          Histórico recente
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

function obterUltimaReserva(hospede: HospedeCrmCompleto) {
  if (!hospede.metricas.ultimaHospedagem) return null;
  return (
    hospede.reservas.find(
      (reserva) => reserva.check_out === hospede.metricas.ultimaHospedagem
    ) ?? null
  );
}

function classeAvatar(hospede: HospedeCrmCompleto) {
  if (hospede.status === "blocked") return "bg-red-500/15 text-red-300";
  if (hospede.internal_rating === "attention") return "bg-orange-500/15 text-orange-300";
  if (hospede.metricas.quantidadeReservas >= 2) return "bg-cyan-500/15 text-cyan-300";
  return "bg-emerald-500/15 text-emerald-300";
}

function obterIniciais(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("");
}

function calcularDiarias(reserva: ReservaHospede) {
  const entrada = Date.parse(`${reserva.check_in}T12:00:00Z`);
  const saida = Date.parse(`${reserva.check_out}T12:00:00Z`);
  return Math.max(1, Math.round((saida - entrada) / 86_400_000));
}

function formatarData(valor: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: "UTC",
  }).format(new Date(`${valor}T00:00:00Z`));
}
