import { Clock3, MessageSquareText } from "lucide-react";

import { Badge } from "@hospedex/ui";

import {
  LABEL_STATUS_RESERVA,
  obterVariantStatusReserva,
  type ReservaComRelacionamentos
} from "../../lib/reservations/types";

/**
 * Timeline da reserva.
 *
 * Combina mudanças de status e observações para preparar auditoria, WhatsApp,
 * check-in e check-out sem criar integrações nesta etapa.
 */

export function ReservationTimeline({ reserva }: { reserva: ReservaComRelacionamentos }) {
  const eventos = [
    ...reserva.historico.map((item) => ({
      id: item.id,
      data: item.created_at,
      status: item.to_status,
      tipo: "status" as const,
      titulo: LABEL_STATUS_RESERVA[item.to_status],
      detalhe: item.reason
    })),
    ...reserva.observacoes.map((observacao) => ({
      id: observacao.id,
      data: observacao.created_at,
      status: null,
      tipo: "observacao" as const,
      titulo: obterLabelObservacao(observacao.note_type),
      detalhe: observacao.content
    }))
  ].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

  if (eventos.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-background/45 p-4 text-sm text-muted-foreground">
        Nenhum evento registrado.
      </div>
    );
  }

  return (
    <ol className="space-y-3">
      {eventos.map((evento) => (
        <li className="flex gap-3" key={`${evento.tipo}-${evento.id}`}>
          <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-background text-primary">
            {evento.tipo === "status" ? (
              <Clock3 className="h-4 w-4" />
            ) : (
              <MessageSquareText className="h-4 w-4" />
            )}
          </span>
          <div className="min-w-0 flex-1 rounded-lg border bg-background/45 p-3">
            <div className="flex flex-wrap items-center gap-2">
              {evento.tipo === "status" ? (
                <Badge variant={obterVariantStatusReserva(evento.status)}>
                  {evento.titulo}
                </Badge>
              ) : (
                <Badge variant="outline">{evento.titulo}</Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {formatarDataHora(evento.data)}
              </span>
            </div>
            {evento.detalhe ? (
              <p className="mt-2 text-sm text-muted-foreground">{evento.detalhe}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

function obterLabelObservacao(tipo: string): string {
  if (tipo === "guest") return "Observação do hóspede";
  if (tipo === "system") return "Evento do sistema";
  return "Observação interna";
}

function formatarDataHora(valor: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(valor));
}
