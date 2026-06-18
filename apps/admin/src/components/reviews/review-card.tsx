import { Eye, MessageSquareText, Star } from "lucide-react";
import type { ReactNode } from "react";

import { Badge, Button, Label } from "@hospedex/ui";

import {
  EntityCard,
  EntityCardActions,
  EntityCardHeader,
} from "../management/entity-card";
import { EntityModal, EntityViewModal } from "../management/entity-modal";
import { responderAvaliacaoAction } from "../../lib/reviews/actions";
import {
  LABEL_STATUS_AVALIACAO,
  obterVariantStatusAvaliacao,
  type AvaliacaoComRelacionamentos,
} from "../../lib/reviews/types";

type ReviewCardProps = {
  avaliacao: AvaliacaoComRelacionamentos;
  podeGerenciar: boolean;
};

const areaClasse =
  "min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export function ReviewCard({ avaliacao, podeGerenciar }: ReviewCardProps) {
  return (
    <EntityCard>
      <EntityCardHeader
        badges={
          <>
            <Badge variant={obterVariantStatusAvaliacao(avaliacao.status)}>
              {LABEL_STATUS_AVALIACAO[avaliacao.status]}
            </Badge>
            <Badge variant="info">
              <span className="mr-1">{avaliacao.rating}/5</span>
              <EstrelasNota nota={avaliacao.rating} />
            </Badge>
          </>
        }
        subtitle={formatarDataHora(avaliacao.reviewed_at)}
        title={avaliacao.guest_name}
      />

      <div className="rounded-lg border bg-background/55 p-3 text-sm">
        <p className="text-xs text-muted-foreground">Casa</p>
        <p className="mt-1 truncate font-medium">
          {avaliacao.propriedade?.name ?? "Casa removida"}
        </p>
      </div>

      <EntityCardActions>
        <EntityViewModal
          description="Comentario, resposta e dados da reserva relacionada."
          title="Detalhes da avaliacao"
          triggerClassName="h-9 justify-center"
          triggerIcon={<Eye className="h-4 w-4" />}
          triggerLabel="Visualizar"
        >
          <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
            <div className="space-y-3">
              <BlocoDetalhe label="Comentario">{avaliacao.comment}</BlocoDetalhe>
              <BlocoDetalhe label="Resposta do proprietario">
                {avaliacao.owner_response ?? "Nenhuma resposta cadastrada."}
              </BlocoDetalhe>
            </div>

            <div className="grid content-start gap-3">
              <Info label="Reserva" valor={avaliacao.reserva?.code ?? "Nao vinculada"} />
              <Info
                label="Periodo"
                valor={
                  avaliacao.reserva
                    ? `${formatarData(avaliacao.reserva.check_in)} - ${formatarData(
                        avaliacao.reserva.check_out,
                      )}`
                    : "Nao vinculado"
                }
              />
              <Info
                label="Contato"
                valor={avaliacao.hospedePrincipal?.phone ?? "Nao informado"}
              />
            </div>
          </div>
        </EntityViewModal>

        <EntityModal
          description="Escreva uma resposta profissional e objetiva ao hospede."
          disabled={!podeGerenciar}
          eyebrow="Resposta"
          title={avaliacao.owner_response ? "Editar resposta" : "Responder avaliacao"}
          triggerClassName="h-9 justify-center"
          triggerIcon={<MessageSquareText className="h-4 w-4" />}
          triggerLabel={avaliacao.owner_response ? "Editar" : "Responder"}
        >
          <form action={responderAvaliacaoAction} className="grid gap-3">
            <input name="avaliacaoId" type="hidden" value={avaliacao.id} />
            <div className="grid gap-2">
              <Label htmlFor={`resposta-${avaliacao.id}`}>
                Resposta do proprietario
              </Label>
              <textarea
                className={areaClasse}
                defaultValue={avaliacao.owner_response ?? ""}
                disabled={!podeGerenciar}
                id={`resposta-${avaliacao.id}`}
                name="resposta"
                placeholder="Escreva uma resposta profissional e objetiva."
                required
              />
            </div>
            <Button className="w-fit" disabled={!podeGerenciar} type="submit">
              <MessageSquareText />
              {avaliacao.owner_response ? "Editar resposta" : "Responder avaliacao"}
            </Button>
          </form>
        </EntityModal>
      </EntityCardActions>
    </EntityCard>
  );
}

function EstrelasNota({ nota }: { nota: number }) {
  return (
    <span aria-label={`${nota} estrelas`} className="inline-flex gap-0.5 align-middle">
      {[1, 2, 3, 4, 5].map((estrela) => (
        <Star
          className={
            estrela <= nota
              ? "h-3.5 w-3.5 fill-current text-cyan-500"
              : "h-3.5 w-3.5 text-muted-foreground/40"
          }
          key={estrela}
        />
      ))}
    </span>
  );
}

function Info({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-lg border bg-background/45 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-medium">{valor}</p>
    </div>
  );
}

function BlocoDetalhe({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="rounded-lg border bg-background/45 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{children}</p>
    </div>
  );
}

function formatarData(valor: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(
    new Date(`${valor}T00:00:00`),
  );
}

function formatarDataHora(valor: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(valor));
}
