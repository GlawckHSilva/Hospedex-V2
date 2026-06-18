import type { PropertyRow, UnitRow } from "@hospedex/types";
import { Eye, PackageCheck, Pencil } from "lucide-react";

import { Badge } from "@hospedex/ui";

import {
  EntityCard,
  EntityCardActions,
  EntityCardHeader,
} from "../management/entity-card";
import { EntityModal, EntityViewModal } from "../management/entity-modal";
import {
  LABEL_CATEGORIA_INVENTARIO,
  LABEL_ESTADO_CONSERVACAO,
  type ItemInventarioCompleto,
} from "../../lib/inventory/types";
import { InventoryItemForm } from "./inventory-item-form";

/**
 * Card compacto de inventario.
 */
export type InventoryItemCardProps = {
  item: ItemInventarioCompleto;
  podeGerenciar: boolean;
  propriedades: PropertyRow[];
  unidades: UnitRow[];
};

export function InventoryItemCard({
  item,
  podeGerenciar,
  propriedades,
  unidades,
}: InventoryItemCardProps) {
  const statusCritico =
    item.conservation_state === "damaged" ||
    item.conservation_state === "missing";
  const media = item.image_url ? (
    <img alt={item.name} className="h-36 w-full object-cover" src={item.image_url} />
  ) : (
    <div className="flex h-36 items-center justify-center bg-primary/15 text-primary">
      <PackageCheck className="h-10 w-10" />
    </div>
  );

  return (
    <EntityCard media={media}>
      <EntityCardHeader
        badges={
          <>
            <Badge variant={statusCritico ? "warning" : "outline"}>
              {LABEL_ESTADO_CONSERVACAO[item.conservation_state]}
            </Badge>
            <Badge variant="info">{LABEL_CATEGORIA_INVENTARIO[item.category]}</Badge>
          </>
        }
        subtitle={`${item.propriedade?.name ?? "Propriedade"} - ${item.unidade?.name ?? "Sem unidade"}`}
        title={item.name}
      />

      <div className="rounded-lg border bg-background/55 p-3 text-sm">
        <p className="text-xs text-muted-foreground">Quantidade</p>
        <p className="mt-1 text-lg font-semibold">{item.quantity}</p>
      </div>

      <EntityCardActions>
        <EntityViewModal
          description="Dados do item, localizacao, quantidade e observacoes."
          title={item.name}
          triggerClassName="h-9 justify-center"
          triggerIcon={<Eye className="h-4 w-4" />}
          triggerLabel="Visualizar"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <Info label="Categoria" valor={LABEL_CATEGORIA_INVENTARIO[item.category]} />
            <Info label="Quantidade" valor={String(item.quantity)} />
            <Info label="Estado" valor={LABEL_ESTADO_CONSERVACAO[item.conservation_state]} />
            <Info label="Valor estimado" valor={formatarMoeda(Number(item.estimated_value))} />
            <Info label="Propriedade" valor={item.propriedade?.name ?? "Propriedade"} />
            <Info label="Unidade" valor={item.unidade?.name ?? "Sem unidade"} />
            <div className="md:col-span-2">
              <Info label="Observacoes" valor={item.notes ?? "Sem observacoes"} />
            </div>
          </div>
        </EntityViewModal>

        <EntityModal
          description="Atualize localizacao, quantidade e estado do item."
          disabled={!podeGerenciar}
          eyebrow="Edicao"
          title="Editar item"
          triggerClassName="h-9 justify-center"
          triggerIcon={<Pencil className="h-4 w-4" />}
          triggerLabel="Editar"
        >
          <InventoryItemForm
            item={item}
            modo="editar"
            podeGerenciar={podeGerenciar}
            propriedades={propriedades}
            unidades={unidades}
          />
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

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(valor);
}
