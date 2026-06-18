import type { PropertyRow, UnitRow } from "@hospedex/types";
import { Pencil, PackageCheck, Trash2 } from "lucide-react";

import { Badge, Button, Card, CardContent } from "@hospedex/ui";

import { ConfirmDialog, EntityModal } from "../management/entity-modal";
import { excluirItemInventarioAction } from "../../lib/inventory/actions";
import {
  LABEL_CATEGORIA_INVENTARIO,
  LABEL_ESTADO_CONSERVACAO,
  type ItemInventarioCompleto,
} from "../../lib/inventory/types";
import { InventoryItemForm } from "./inventory-item-form";

/**
 * Card de item de inventario.
 *
 * A exclusao e logica no banco para preservar manutencoes e auditoria futura.
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
  return (
    <Card className="admin-glass-card">
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <PackageCheck className="h-4 w-4 text-primary" />
              <h2 className="truncate text-lg font-semibold">{item.name}</h2>
              <Badge
                variant={
                  item.conservation_state === "damaged" ||
                  item.conservation_state === "missing"
                    ? "warning"
                    : "outline"
                }
              >
                {LABEL_ESTADO_CONSERVACAO[item.conservation_state]}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {item.propriedade?.name ?? "Propriedade"} ·{" "}
              {item.unidade?.name ?? "Sem unidade"}
            </p>
          </div>
          {item.image_url ? (
            <img
              alt={item.name}
              className="h-20 w-28 rounded-lg border object-cover"
              src={item.image_url}
            />
          ) : null}
        </div>

        <section className="grid gap-3 md:grid-cols-4">
          <Info
            label="Categoria"
            valor={LABEL_CATEGORIA_INVENTARIO[item.category]}
          />
          <Info label="Quantidade" valor={String(item.quantity)} />
          <Info
            label="Valor estimado"
            valor={formatarMoeda(Number(item.estimated_value))}
          />
          <Info
            label="Estado"
            valor={LABEL_ESTADO_CONSERVACAO[item.conservation_state]}
          />
        </section>

        {item.notes ? (
          <p className="rounded-lg border bg-background/45 p-3 text-sm text-muted-foreground">
            {item.notes}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <EntityModal
            description="Atualize localização, quantidade e estado do item."
            disabled={!podeGerenciar}
            eyebrow="Edição"
            title="Editar item"
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

          <ConfirmDialog
            description="A exclusão é lógica para preservar manutenção e auditoria futura."
            disabled={!podeGerenciar}
            title="Excluir item"
            triggerIcon={<Trash2 className="h-4 w-4" />}
            triggerLabel="Excluir"
          >
            <form action={excluirItemInventarioAction} className="grid gap-3">
              <input name="itemId" type="hidden" value={item.id} />
              <label className="flex items-start gap-2 text-sm text-muted-foreground">
                <input
                  className="mt-1"
                  disabled={!podeGerenciar}
                  name="confirmarExclusao"
                  required
                  type="checkbox"
                  value="confirmado"
                />
                Confirmo a exclusao do item.
              </label>
              <Button
                disabled={!podeGerenciar}
                type="submit"
                variant="destructive"
              >
                <Trash2 />
                Excluir item
              </Button>
            </form>
          </ConfirmDialog>
        </div>
      </CardContent>
    </Card>
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
