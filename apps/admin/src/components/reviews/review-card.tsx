import type { ReviewStatus } from "@hospedex/types";
import {
  Eye,
  EyeOff,
  MessageSquareText,
  ShieldCheck,
  Star,
} from "lucide-react";
import type { ReactNode } from "react";

import { Badge, Button, Card, CardContent, Label } from "@hospedex/ui";

import {
  ConfirmDialog,
  EntityModal,
  EntityViewModal,
} from "../management/entity-modal";
import {
  alterarStatusAvaliacaoAction,
  responderAvaliacaoAction,
} from "../../lib/reviews/actions";
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
  const emailHospede =
    avaliacao.guest_email ??
    avaliacao.hospedePrincipal?.email ??
    "Nao informado";

  return (
    <Card className="admin-glass-card">
      <CardContent className="space-y-5 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={obterVariantStatusAvaliacao(avaliacao.status)}>
                {LABEL_STATUS_AVALIACAO[avaliacao.status]}
              </Badge>
              <Badge variant="info">
                <span className="mr-1">{avaliacao.rating}/5</span>
                <EstrelasNota nota={avaliacao.rating} />
              </Badge>
            </div>
            <h2 className="mt-3 text-lg font-semibold">
              {avaliacao.guest_name}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {avaliacao.propriedade?.name ?? "Casa removida"} -{" "}
              {formatarDataHora(avaliacao.reviewed_at)}
            </p>
          </div>

          <div className="grid gap-2 text-sm sm:grid-cols-3 lg:min-w-[30rem]">
            <Info
              label="Casa"
              valor={avaliacao.propriedade?.name ?? "Nao encontrada"}
            />
            <Info
              label="Reserva"
              valor={avaliacao.reserva?.code ?? "Nao vinculada"}
            />
            <Info label="E-mail" valor={emailHospede} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <EntityViewModal
            description="Comentário, resposta e dados da reserva relacionada."
            title="Detalhes da avaliação"
            triggerIcon={<Eye className="h-4 w-4" />}
            triggerLabel="Visualizar"
          >
            <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
              <div className="space-y-3">
                <BlocoDetalhe label="Comentario">
                  {avaliacao.comment}
                </BlocoDetalhe>
                <BlocoDetalhe label="Resposta do proprietario">
                  {avaliacao.owner_response ?? "Nenhuma resposta cadastrada."}
                </BlocoDetalhe>
              </div>

              <div className="grid content-start gap-3">
                <Info
                  label="Periodo da reserva"
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
            description="Escreva uma resposta profissional e objetiva ao hóspede."
            disabled={!podeGerenciar}
            eyebrow="Resposta"
            title={
              avaliacao.owner_response
                ? "Editar resposta"
                : "Responder avaliação"
            }
            triggerIcon={<MessageSquareText className="h-4 w-4" />}
            triggerLabel={
              avaliacao.owner_response ? "Editar resposta" : "Responder"
            }
          >
            <form action={responderAvaliacaoAction} className="grid gap-3">
              <input name="avaliacaoId" type="hidden" value={avaliacao.id} />
              <div className="grid gap-2">
                <Label htmlFor={`resposta-${avaliacao.id}`}>
                  Resposta do proprietário
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
                {avaliacao.owner_response
                  ? "Editar resposta"
                  : "Responder avaliação"}
              </Button>
            </form>
          </EntityModal>
        </div>

        <div className="flex flex-wrap gap-2">
          {avaliacao.status !== "approved" ? (
            <BotaoStatus
              avaliacaoId={avaliacao.id}
              disabled={!podeGerenciar}
              icon={<ShieldCheck />}
              label="Aprovar"
              status="approved"
            />
          ) : null}
          {avaliacao.status !== "hidden" ? (
            <BotaoStatus
              avaliacaoId={avaliacao.id}
              disabled={!podeGerenciar}
              icon={<EyeOff />}
              label="Ocultar"
              status="hidden"
              variant="outline"
            />
          ) : (
            <BotaoStatus
              avaliacaoId={avaliacao.id}
              disabled={!podeGerenciar}
              label="Voltar para pendente"
              status="pending"
              variant="outline"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function BotaoStatus({
  avaliacaoId,
  disabled,
  icon,
  label,
  status,
  variant = "default",
}: {
  avaliacaoId: string;
  disabled: boolean;
  icon?: ReactNode;
  label: string;
  status: ReviewStatus;
  variant?: "default" | "outline";
}) {
  return (
    <ConfirmDialog
      description="Confirme a alteracao de status desta avaliacao interna."
      disabled={disabled}
      title={label}
      triggerIcon={icon}
      triggerLabel={label}
      triggerVariant={variant}
    >
      <form action={alterarStatusAvaliacaoAction} className="grid gap-3">
        <input name="avaliacaoId" type="hidden" value={avaliacaoId} />
        <input name="status" type="hidden" value={status} />
        <p className="text-sm text-muted-foreground">
          A avaliacao sera atualizada para {label.toLowerCase()}.
        </p>
        <Button disabled={disabled} type="submit" variant={variant}>
          {icon}
          {label}
        </Button>
      </form>
    </ConfirmDialog>
  );
}

function EstrelasNota({ nota }: { nota: number }) {
  return (
    <span
      aria-label={`${nota} estrelas`}
      className="inline-flex gap-0.5 align-middle"
    >
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
