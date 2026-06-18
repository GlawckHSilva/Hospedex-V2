import { Badge, Button, Card, CardContent } from "@hospedex/ui";

import {
  alternarStatusServicoExtraAction,
  atualizarServicoExtraAction,
  excluirServicoExtraAction
} from "../../lib/extra-services/actions";
import {
  LABEL_TIPO_COBRANCA,
  type CasaServicoExtra,
  type ServicoExtraComCasas
} from "../../lib/extra-services/types";
import { ExtraServiceForm } from "./extra-service-form";

/**
 * Card individual de servico extra.
 *
 * As acoes de status e exclusao passam por server actions para manter RLS e
 * regras de tenant no servidor.
 */

type ExtraServiceCardProps = {
  casas: CasaServicoExtra[];
  podeGerenciar: boolean;
  servico: ServicoExtraComCasas;
};

export function ExtraServiceCard({ casas, podeGerenciar, servico }: ExtraServiceCardProps) {
  const statusDestino = servico.status === "active" ? "inactive" : "active";

  return (
    <Card className="admin-glass-card">
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={servico.status === "active" ? "success" : "secondary"}>
                {servico.status === "active" ? "Ativo" : "Inativo"}
              </Badge>
              {servico.is_required ? <Badge variant="warning">Obrigatorio</Badge> : null}
              <Badge variant="info">{LABEL_TIPO_COBRANCA[servico.charge_type]}</Badge>
            </div>
            <h2 className="mt-3 text-lg font-semibold">{servico.name}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {servico.description || "Sem descricao publica cadastrada."}
            </p>
          </div>

          <div className="rounded-lg border bg-background/55 p-3 text-sm">
            <p className="text-xs text-muted-foreground">Valor</p>
            <p className="font-semibold">{formatarMoeda(servico.amount)}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
          <Info label="Casas" valor={descreverCasas(servico)} />
          <Info label="Observacoes internas" valor={servico.internal_notes || "Sem observacoes."} />
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[auto_auto_1fr]">
          <form action={alternarStatusServicoExtraAction}>
            <input name="servicoId" type="hidden" value={servico.id} />
            <input name="status" type="hidden" value={statusDestino} />
            <Button disabled={!podeGerenciar} size="sm" type="submit" variant="outline">
              {servico.status === "active" ? "Desativar" : "Ativar"}
            </Button>
          </form>

          <details className="rounded-lg border bg-background/35 px-3 py-2">
            <summary className="cursor-pointer text-sm font-medium">Editar</summary>
            <div className="mt-4">
              <ExtraServiceForm
                action={atualizarServicoExtraAction}
                casas={casas}
                modo="editar"
                podeGerenciar={podeGerenciar}
                servico={servico}
              />
            </div>
          </details>

          <details className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2">
            <summary className="cursor-pointer text-sm font-medium text-destructive">
              Excluir
            </summary>
            <form action={excluirServicoExtraAction} className="mt-4 grid gap-3">
              <input name="servicoId" type="hidden" value={servico.id} />
              <p className="text-sm text-muted-foreground">
                Esta exclusao remove o servico de novas reservas e preserva historico futuro.
              </p>
              <Button disabled={!podeGerenciar} size="sm" type="submit" variant="destructive">
                Confirmar exclusao
              </Button>
            </form>
          </details>
        </div>
      </CardContent>
    </Card>
  );
}

function Info({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-lg border bg-background/45 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1">{valor}</p>
    </div>
  );
}

function descreverCasas(servico: ServicoExtraComCasas): string {
  if (servico.applies_to_all_properties) return "Todas as casas";
  if (servico.casas.length === 0) return "Nenhuma casa vinculada";
  return servico.casas.map((casa) => casa.name).join(", ");
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency"
  }).format(valor);
}
