import { Pencil } from "lucide-react";

import { Badge } from "@hospedex/ui";

import {
  EntityCard,
  EntityCardActions,
  EntityCardHeader,
} from "../management/entity-card";
import { EntityModal } from "../management/entity-modal";
import { atualizarServicoExtraAction } from "../../lib/extra-services/actions";
import {
  LABEL_TIPO_COBRANCA,
  type CasaServicoExtra,
  type ServicoExtraComCasas,
} from "../../lib/extra-services/types";
import { ExtraServiceForm } from "./extra-service-form";

/**
 * Card compacto de servico extra.
 *
 * A listagem mostra nome, categoria e valor. Edicao detalhada fica em modal.
 */
type ExtraServiceCardProps = {
  casas: CasaServicoExtra[];
  podeGerenciar: boolean;
  servico: ServicoExtraComCasas;
};

export function ExtraServiceCard({
  casas,
  podeGerenciar,
  servico,
}: ExtraServiceCardProps) {
  return (
    <EntityCard>
      <EntityCardHeader
        badges={
          <>
            <Badge variant={servico.status === "active" ? "success" : "secondary"}>
              {servico.status === "active" ? "Ativo" : "Inativo"}
            </Badge>
            <Badge variant="info">{LABEL_TIPO_COBRANCA[servico.charge_type]}</Badge>
          </>
        }
        subtitle={servico.is_required ? "Obrigatorio" : "Opcional"}
        title={servico.name}
      />

      <div className="rounded-lg border bg-background/55 p-3 text-sm">
        <p className="text-xs text-muted-foreground">Valor</p>
        <p className="mt-1 text-lg font-semibold">{formatarMoeda(servico.amount)}</p>
      </div>

      <EntityCardActions>
        <EntityModal
          description="Atualize preco, cobranca, casas vinculadas e status operacional."
          disabled={!podeGerenciar}
          eyebrow="Edicao"
          title="Editar servico extra"
          triggerClassName="col-span-2 h-9 justify-center"
          triggerIcon={<Pencil className="h-4 w-4" />}
          triggerLabel="Editar"
        >
          <ExtraServiceForm
            action={atualizarServicoExtraAction}
            casas={casas}
            modo="editar"
            podeGerenciar={podeGerenciar}
            servico={servico}
          />
        </EntityModal>
      </EntityCardActions>
    </EntityCard>
  );
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(valor);
}
