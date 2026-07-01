import { CalendarDays, Eye, Mail, MoreHorizontal, Pencil, Phone } from "lucide-react";
import Link from "next/link";

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
 * Card compacto do CRM de hóspedes.
 *
 * As ações perigosas ficam no menu secundário e dependem das regras de remoção
 * do backend. Remover do CRM nunca exclui conta pública/global do hóspede.
 */

export type GuestCardProps = {
  hospede: HospedeCrmCompleto;
  podeGerenciar: boolean;
};

export function GuestCard({ hospede, podeGerenciar }: GuestCardProps) {
  const ultimaReserva = obterUltimaReserva(hospede);

  return (
    <Card className={cn("admin-glass-card relative overflow-hidden", classeCard(hospede))}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 gap-3">
            <AvatarHospede hospede={hospede} />
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold tracking-normal">
                {hospede.full_name}
              </h2>
              <ContatoHospede hospede={hospede} />
            </div>
          </div>
          <div className="flex shrink-0 items-start gap-2">
            <Badge variant={hospede.status === "blocked" ? "danger" : "success"}>
              {LABEL_STATUS_HOSPEDE_CRM[hospede.status]}
            </Badge>
            <GuestMoreActions hospede={hospede} podeGerenciar={podeGerenciar} />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <BadgesComplementares hospede={hospede} />
        </div>

        <UltimaHospedagem reserva={ultimaReserva} />

        <GuestActions hospede={hospede} podeGerenciar={podeGerenciar} />
      </CardContent>
    </Card>
  );
}

function AvatarHospede({ hospede }: { hospede: HospedeCrmCompleto }) {
  return (
    <span
      className={cn(
        "flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold",
        classeAvatar(hospede)
      )}
    >
      {obterIniciais(hospede.full_name)}
    </span>
  );
}

function BadgesComplementares({ hospede }: { hospede: HospedeCrmCompleto }) {
  const semHistorico = hospede.metricas.quantidadeReservas === 0;

  return (
    <>
      {hospede.metricas.quantidadeReservas >= 2 ? (
        <Badge variant="info">Recorrente</Badge>
      ) : null}
      {semHistorico ? <Badge variant="outline">Sem histórico</Badge> : null}
      <Badge variant={variantAvaliacao(hospede)}>
        {LABEL_AVALIACAO_HOSPEDE_CRM[hospede.internal_rating]}
      </Badge>
    </>
  );
}

function ContatoHospede({ hospede }: { hospede: HospedeCrmCompleto }) {
  return (
    <div className="mt-2 grid gap-1.5 text-sm text-muted-foreground">
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
  return (
    <div className="mt-4 rounded-xl border border-cyan-400/10 bg-background/35 px-3 py-2 text-sm">
      {reserva ? (
        <>
          <p className="flex items-center gap-2 font-medium text-foreground">
            <CalendarDays className="h-4 w-4 text-cyan-300" />
            Última hospedagem: {formatarData(reserva.check_out)}
          </p>
          <p className="mt-1 truncate text-muted-foreground">
            {reserva.propriedade?.name ?? "Casa removida"}
          </p>
          <p className="text-muted-foreground">
            {calcularDiarias(reserva)} {calcularDiarias(reserva) === 1 ? "diária" : "diárias"}
          </p>
        </>
      ) : (
        <>
          <p className="font-medium text-foreground">Sem histórico</p>
          <p className="mt-1 text-muted-foreground">Nenhuma hospedagem registrada</p>
        </>
      )}
    </div>
  );
}

function GuestActions({ hospede, podeGerenciar }: GuestCardProps) {
  return (
    <div className="mt-4 grid grid-cols-[1fr_1fr] gap-2 sm:flex sm:justify-end">
      <GuestViewModal hospede={hospede} />

      <EntityModal
        description="Atualize dados do perfil e observações internas."
        disabled={!podeGerenciar}
        eyebrow="Edição"
        title="Perfil do hóspede"
        triggerAction="edit"
        triggerClassName="h-10 justify-center px-4"
        triggerIcon={<Pencil className="h-4 w-4" />}
        triggerLabel="Editar"
      >
        <GuestForm hospede={hospede} modo="editar" podeGerenciar={podeGerenciar} />
      </EntityModal>
    </div>
  );
}

function GuestMoreActions({ hospede, podeGerenciar }: GuestCardProps) {
  const motivoBloqueio =
    hospede.remocaoCrm.motivo ??
    "Não é possível apagar hóspedes com histórico operacional ativo.";

  return (
    <EntityModal
      description="Ações secundárias do hóspede no CRM."
      eyebrow="Ações"
      size="sm"
      title="Mais ações"
      triggerAction="settings"
      triggerClassName="h-8 w-8 border-transparent bg-transparent px-0 shadow-none"
      triggerIcon={<MoreHorizontal className="h-4 w-4" />}
      triggerLabel="Mais ações"
      triggerSize="icon"
    >
      <div className="space-y-3">
        <Link
          className="flex h-10 items-center justify-between rounded-xl border bg-background/55 px-3 text-sm font-semibold transition hover:border-cyan-400/35 hover:bg-cyan-500/10"
          href={`/reservas?busca=${encodeURIComponent(chaveBuscaReservas(hospede))}`}
        >
          Ver reservas
          <span className="text-xs text-muted-foreground">
            {hospede.metricas.quantidadeReservas}
          </span>
        </Link>

        <Link
          className="flex h-10 items-center rounded-xl border bg-background/55 px-3 text-sm font-semibold transition hover:border-cyan-400/35 hover:bg-cyan-500/10"
          href="/reservas"
        >
          Nova reserva
        </Link>

        <GuestDeleteDialog
          disabled={!podeGerenciar || !hospede.remocaoCrm.permitida}
          hospedeId={hospede.id}
          motivo={motivoBloqueio}
          nome={hospede.full_name}
        />

        {!hospede.remocaoCrm.permitida ? (
          <p className="rounded-xl border bg-background/45 p-3 text-xs text-muted-foreground">
            {motivoBloqueio}
          </p>
        ) : null}
      </div>
    </EntityModal>
  );
}

function GuestViewModal({ hospede }: { hospede: HospedeCrmCompleto }) {
  const ultimaReserva = obterUltimaReserva(hospede);

  return (
    <EntityViewModal
      description="Resumo do perfil, reservas e timeline do hóspede."
      title={`Perfil de ${hospede.full_name}`}
      triggerClassName="h-10 justify-center px-4"
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

function classeCard(hospede: HospedeCrmCompleto) {
  if (hospede.status === "blocked") {
    return "border-red-400/25 bg-red-500/[0.04] before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-red-400/80";
  }
  if (hospede.internal_rating === "attention") {
    return "border-orange-400/25 bg-orange-500/[0.04] before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-orange-400/80";
  }
  return "border-cyan-400/20 bg-cyan-500/[0.035] before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-cyan-400/70";
}

function classeAvatar(hospede: HospedeCrmCompleto) {
  if (hospede.status === "blocked") return "bg-red-500/15 text-red-300";
  if (hospede.internal_rating === "attention") return "bg-orange-500/15 text-orange-300";
  if (hospede.metricas.quantidadeReservas >= 2) return "bg-cyan-500/15 text-cyan-300";
  return "bg-emerald-500/15 text-emerald-300";
}

function variantAvaliacao(hospede: HospedeCrmCompleto) {
  if (hospede.internal_rating === "attention") return "warning";
  if (hospede.internal_rating === "blocked") return "danger";
  if (hospede.internal_rating === "excellent" || hospede.internal_rating === "good") {
    return "success";
  }
  return "outline";
}

function chaveBuscaReservas(hospede: HospedeCrmCompleto) {
  return hospede.phone ?? hospede.email ?? hospede.full_name;
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
