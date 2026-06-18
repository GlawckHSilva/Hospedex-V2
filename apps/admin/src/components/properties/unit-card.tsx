import {
  Bath,
  BedDouble,
  Eye,
  Pencil,
  PauseCircle,
  PlayCircle,
  Trash2,
  Users,
  WalletCards,
} from "lucide-react";
import type { ReactNode } from "react";

import { Badge, Button, Card, CardContent } from "@hospedex/ui";

import {
  ConfirmDialog,
  EntityModal,
  EntityViewModal,
} from "../management/entity-modal";
import {
  alternarStatusUnidadeAction,
  excluirUnidadeAction,
} from "../../lib/properties/actions";
import type {
  PropriedadeComRelacionamentos,
  UnidadeComCategoria,
} from "../../lib/properties/types";
import { MediaGallery } from "./media-gallery";
import { UnitForm } from "./unit-form";

/**
 * Card reutilizável de unidade.
 *
 * Mostra dados operacionais básicos sem reservas, calendário ou tarifário avançado.
 */

export type UnitCardProps = {
  unidade: UnidadeComCategoria;
  propriedades: PropriedadeComRelacionamentos[];
  podeGerenciar: boolean;
  retorno: "/propriedades" | "/unidades";
};

export function UnitCard({
  unidade,
  propriedades,
  podeGerenciar,
  retorno,
}: UnitCardProps) {
  const estaAtiva = unidade.status === "active";

  return (
    <Card className="border-border/70 bg-background/58">
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold">{unidade.name}</h3>
              <Badge variant={obterVariantStatusUnidade(unidade.status)}>
                {obterLabelStatusUnidade(unidade.status)}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {unidade.categoria?.name ?? "Categoria pendente"}
            </p>
          </div>

          <form action={alternarStatusUnidadeAction}>
            <input name="retorno" type="hidden" value={retorno} />
            <input name="unidadeId" type="hidden" value={unidade.id} />
            <Button
              disabled={!podeGerenciar}
              size="sm"
              type="submit"
              variant="outline"
            >
              {estaAtiva ? <PauseCircle /> : <PlayCircle />}
              {estaAtiva ? "Pausar" : "Ativar"}
            </Button>
          </form>
        </div>

        <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <MetricaUnidade
            icon={<Users />}
            label="Capacidade"
            valor={String(unidade.capacity)}
          />
          <MetricaUnidade
            icon={<BedDouble />}
            label="Quartos/camas"
            valor={`${unidade.bedrooms}/${unidade.beds}`}
          />
          <MetricaUnidade
            icon={<Bath />}
            label="Banheiros"
            valor={String(unidade.bathrooms)}
          />
          <MetricaUnidade
            icon={<WalletCards />}
            label="Valor base"
            valor={formatarMoeda(unidade.base_price)}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <EntityViewModal
            description="Resumo da unidade selecionada."
            title={`Detalhes de ${unidade.name}`}
            triggerIcon={<Eye className="h-4 w-4" />}
            triggerLabel="Visualizar"
          >
            <div className="grid gap-3 text-sm md:grid-cols-2">
              <InfoModal
                label="Status"
                valor={obterLabelStatusUnidade(unidade.status)}
              />
              <InfoModal
                label="Categoria"
                valor={unidade.categoria?.name ?? "Categoria pendente"}
              />
              <InfoModal label="Capacidade" valor={String(unidade.capacity)} />
              <InfoModal label="Quartos" valor={String(unidade.bedrooms)} />
              <InfoModal label="Camas" valor={String(unidade.beds)} />
              <InfoModal label="Banheiros" valor={String(unidade.bathrooms)} />
              <InfoModal
                label="Valor base"
                valor={formatarMoeda(unidade.base_price)}
              />
            </div>
          </EntityViewModal>

          <EntityModal
            description="Atualize dados operacionais e capacidade da unidade."
            disabled={!podeGerenciar}
            eyebrow="Edição"
            title="Editar unidade"
            triggerIcon={<Pencil className="h-4 w-4" />}
            triggerLabel="Editar"
          >
            <UnitForm
              modo="editar"
              podeGerenciar={podeGerenciar}
              propriedades={propriedades}
              retorno={retorno}
              unidade={unidade}
            />
          </EntityModal>
        </div>

        <MediaGallery
          imagens={unidade.imagens}
          podeGerenciar={podeGerenciar}
          propriedadeId={unidade.property_id}
          retorno={retorno}
          tipo="unidade"
          unidadeId={unidade.id}
        />

        <ConfirmDialog
          description="Esta ação remove a unidade da propriedade."
          disabled={!podeGerenciar}
          title="Excluir unidade"
          triggerIcon={<Trash2 className="h-4 w-4" />}
          triggerLabel="Excluir unidade"
        >
          <form action={excluirUnidadeAction} className="mt-4 grid gap-3">
            <input name="retorno" type="hidden" value={retorno} />
            <input name="unidadeId" type="hidden" value={unidade.id} />
            <label className="flex items-start gap-2 text-sm text-muted-foreground">
              <input
                className="mt-1"
                disabled={!podeGerenciar}
                name="confirmarExclusao"
                required
                type="checkbox"
                value="confirmado"
              />
              Confirmo que desejo remover esta unidade da propriedade.
            </label>
            <div>
              <Button
                disabled={!podeGerenciar}
                type="submit"
                variant="destructive"
              >
                Excluir unidade
              </Button>
            </div>
          </form>
        </ConfirmDialog>
      </CardContent>
    </Card>
  );
}

function InfoModal({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-lg border bg-background/55 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 break-words font-medium">{valor}</p>
    </div>
  );
}

function MetricaUnidade({
  icon,
  label,
  valor,
}: {
  icon: ReactNode;
  label: string;
  valor: string;
}) {
  return (
    <div className="rounded-lg border bg-background/45 p-3">
      <div className="mb-2 text-muted-foreground [&_svg]:h-4 [&_svg]:w-4">
        {icon}
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold">{valor}</p>
    </div>
  );
}

function obterLabelStatusUnidade(
  status: UnidadeComCategoria["status"],
): string {
  if (status === "active") return "Ativa";
  if (status === "maintenance") return "Manutenção";
  return "Pausada";
}

function obterVariantStatusUnidade(status: UnidadeComCategoria["status"]) {
  if (status === "active") return "success";
  if (status === "maintenance") return "warning";
  return "secondary";
}

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(Number(valor));
}
