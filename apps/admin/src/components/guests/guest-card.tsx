import {
  Ban,
  CalendarDays,
  Eye,
  History,
  Pencil,
  ShieldAlert,
  Trash2,
  UserRound,
  WalletCards,
} from "lucide-react";
import type { ReactNode } from "react";

import { Badge, Button, Card, CardContent, Label } from "@hospedex/ui";

import {
  ConfirmDialog,
  EntityModal,
  EntityViewModal,
} from "../management/entity-modal";
import {
  alternarBloqueioHospedeAction,
  excluirHospedeAction,
} from "../../lib/guests/actions";
import {
  LABEL_AVALIACAO_HOSPEDE_CRM,
  LABEL_STATUS_HOSPEDE_CRM,
  type HospedeCrmCompleto,
} from "../../lib/guests/types";
import { GuestForm } from "./guest-form";

/**
 * Card completo do hospede.
 *
 * Perfil, historico e avaliacoes internas ficam juntos para dar contexto ao
 * proprietario sem expor dados entre tenants.
 */

export type GuestCardProps = {
  hospede: HospedeCrmCompleto;
  podeGerenciar: boolean;
};

export function GuestCard({ hospede, podeGerenciar }: GuestCardProps) {
  return (
    <Card className="admin-glass-card">
      <CardContent className="space-y-5 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <UserRound className="h-4 w-4 text-primary" />
              <h2 className="truncate text-xl font-semibold">
                {hospede.full_name}
              </h2>
              <Badge
                variant={hospede.status === "blocked" ? "warning" : "success"}
              >
                {LABEL_STATUS_HOSPEDE_CRM[hospede.status]}
              </Badge>
              <Badge
                variant={
                  hospede.internal_rating === "attention"
                    ? "warning"
                    : "outline"
                }
              >
                {LABEL_AVALIACAO_HOSPEDE_CRM[hospede.internal_rating]}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {hospede.phone ?? "Sem telefone"} ·{" "}
              {hospede.email ?? "Sem e-mail"}
            </p>
          </div>

          <div className="grid gap-2 text-sm sm:grid-cols-3 lg:min-w-[30rem]">
            <Resumo
              icon={<CalendarDays />}
              label="Reservas"
              valor={String(hospede.metricas.quantidadeReservas)}
            />
            <Resumo
              icon={<WalletCards />}
              label="Valor total"
              valor={formatarMoeda(hospede.metricas.valorTotalGasto)}
            />
            <Resumo
              icon={<ShieldAlert />}
              label="Cancelamentos"
              valor={String(hospede.metricas.cancelamentos)}
            />
          </div>
        </div>

        <section className="grid gap-3 md:grid-cols-4">
          <Info
            label="Documento"
            valor={hospede.document_number ?? "Nao informado"}
          />
          <Info label="Cidade" valor={hospede.city ?? "Nao informada"} />
          <Info label="Estado" valor={hospede.state ?? "Nao informado"} />
          <Info
            label="Aniversario"
            valor={
              hospede.birth_date
                ? formatarData(hospede.birth_date)
                : "Nao informado"
            }
          />
          <Info
            label="Ultima hospedagem"
            valor={
              hospede.metricas.ultimaHospedagem
                ? formatarData(hospede.metricas.ultimaHospedagem)
                : "Sem historico"
            }
          />
          <Info
            label="Proxima hospedagem"
            valor={
              hospede.metricas.proximaHospedagem
                ? formatarData(hospede.metricas.proximaHospedagem)
                : "Sem reserva"
            }
          />
          <Info label="Check-ins" valor={String(hospede.metricas.checkIns)} />
          <Info label="Check-outs" valor={String(hospede.metricas.checkOuts)} />
        </section>

        <div className="flex flex-wrap gap-2">
          <EntityViewModal
            description="Resumo do perfil e métricas do hóspede."
            title={`Perfil de ${hospede.full_name}`}
            triggerIcon={<Eye className="h-4 w-4" />}
            triggerLabel="Visualizar"
          >
            <section className="grid gap-3 md:grid-cols-2">
              <Info
                label="Documento"
                valor={hospede.document_number ?? "Não informado"}
              />
              <Info label="Cidade" valor={hospede.city ?? "Não informada"} />
              <Info label="Estado" valor={hospede.state ?? "Não informado"} />
              <Info
                label="Aniversário"
                valor={
                  hospede.birth_date
                    ? formatarData(hospede.birth_date)
                    : "Não informado"
                }
              />
              <Info
                label="Check-ins"
                valor={String(hospede.metricas.checkIns)}
              />
              <Info
                label="Check-outs"
                valor={String(hospede.metricas.checkOuts)}
              />
            </section>
          </EntityViewModal>

          <EntityModal
            description="Atualize dados do perfil e observações internas."
            disabled={!podeGerenciar}
            eyebrow="Edição"
            title="Perfil do hóspede"
            triggerIcon={<Pencil className="h-4 w-4" />}
            triggerLabel="Editar"
          >
            <GuestForm hospede={hospede} podeGerenciar={podeGerenciar} />
          </EntityModal>

          <ConfirmDialog
            description="Esta acao altera o status operacional do hospede no CRM."
            disabled={!podeGerenciar}
            title={
              hospede.status === "blocked"
                ? "Desbloquear hospede"
                : "Bloquear hospede"
            }
            triggerIcon={<Ban className="h-4 w-4" />}
            triggerLabel={
              hospede.status === "blocked" ? "Desbloquear" : "Bloquear"
            }
            triggerVariant="outline"
          >
            <form action={alternarBloqueioHospedeAction} className="grid gap-3">
              <input name="hospedeId" type="hidden" value={hospede.id} />
              <p className="text-sm text-muted-foreground">
                Confirme para{" "}
                {hospede.status === "blocked" ? "desbloquear" : "bloquear"} este
                hospede.
              </p>
              <Button disabled={!podeGerenciar} type="submit" variant="outline">
                <Ban />
                {hospede.status === "blocked" ? "Desbloquear" : "Bloquear"}
              </Button>
            </form>
          </ConfirmDialog>

          <EntityViewModal
            description="Reservas vinculadas ao hóspede no tenant atual."
            title="Histórico de reservas"
            triggerIcon={<CalendarDays className="h-4 w-4" />}
            triggerLabel="Histórico"
          >
            <div className="space-y-2">
              {hospede.reservas.length > 0 ? (
                hospede.reservas.map((reserva) => (
                  <div
                    className="rounded-lg border bg-background/55 p-3 text-sm"
                    key={reserva.id}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold">{reserva.code}</span>
                      <Badge variant="outline">{reserva.status}</Badge>
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      {reserva.propriedade?.name ?? "Propriedade"} ·{" "}
                      {reserva.unidade?.name ?? "Unidade"}
                    </p>
                    <p className="text-muted-foreground">
                      {formatarData(reserva.check_in)} -{" "}
                      {formatarData(reserva.check_out)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sem reservas vinculadas.
                </p>
              )}
            </div>
          </EntityViewModal>

          <EntityViewModal
            description="Eventos recentes consolidados do hóspede."
            title="Timeline do hóspede"
            triggerIcon={<History className="h-4 w-4" />}
            triggerLabel="Timeline"
          >
            <div className="space-y-2">
              {hospede.timeline.length > 0 ? (
                hospede.timeline.slice(0, 10).map((evento) => (
                  <div
                    className="rounded-lg border bg-background/55 p-3 text-sm"
                    key={evento.id}
                  >
                    <p className="font-semibold">{evento.titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatarDataHora(evento.data)}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      {evento.detalhe}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sem eventos registrados.
                </p>
              )}
            </div>
          </EntityViewModal>

          <ConfirmDialog
            description="A exclusão lógica preserva reservas históricas do hóspede."
            disabled={!podeGerenciar}
            title="Excluir hóspede"
            triggerIcon={<Trash2 className="h-4 w-4" />}
            triggerLabel="Excluir"
          >
            <form action={excluirHospedeAction} className="grid gap-3">
              <input name="hospedeId" type="hidden" value={hospede.id} />
              <label className="flex items-start gap-2 text-sm text-muted-foreground">
                <input
                  className="mt-1"
                  disabled={!podeGerenciar}
                  name="confirmarExclusao"
                  required
                  type="checkbox"
                  value="confirmado"
                />
                Confirmo a exclusão lógica do hóspede. Reservas históricas serão
                preservadas.
              </label>
              <Button
                disabled={!podeGerenciar}
                type="submit"
                variant="destructive"
              >
                <Trash2 />
                Excluir hóspede
              </Button>
            </form>
          </ConfirmDialog>
        </div>

        {hospede.private_notes ? (
          <div className="rounded-lg border bg-background/45 p-3">
            <Label>Observacoes privadas</Label>
            <p className="mt-2 text-sm text-muted-foreground">
              {hospede.private_notes}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Resumo({
  icon,
  label,
  valor,
}: {
  icon: ReactNode;
  label: string;
  valor: string;
}) {
  return (
    <div className="rounded-lg border bg-background/55 p-3">
      <div className="mb-2 text-primary [&_svg]:h-4 [&_svg]:w-4">{icon}</div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate font-semibold">{valor}</p>
    </div>
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

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(valor);
}

function formatarData(valor: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: "UTC",
  }).format(new Date(`${valor}T00:00:00Z`));
}

function formatarDataHora(valor: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(valor));
}
