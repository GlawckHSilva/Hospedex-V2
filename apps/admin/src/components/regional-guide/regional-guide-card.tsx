import type { RegionalGuideLocationRow } from "@hospedex/types";
import { Eye, Pencil, Trash2 } from "lucide-react";

import { Badge, Button, Card, CardContent } from "@hospedex/ui";

import {
  ConfirmDialog,
  EntityModal,
  EntityViewModal,
} from "../management/entity-modal";
import {
  alternarStatusLocalGuiaRegiaoAction,
  atualizarLocalGuiaRegiaoAction,
  excluirLocalGuiaRegiaoAction,
} from "../../lib/regional-guide/actions";
import { LABEL_CATEGORIA_GUIA_REGIAO } from "../../lib/regional-guide/types";
import { RegionalGuideForm } from "./regional-guide-form";

/**
 * Card administrativo de uma recomendacao regional.
 *
 * As acoes nao afetam marketplace; apenas preparam dados aprovados pelo tenant.
 */

type RegionalGuideCardProps = {
  local: RegionalGuideLocationRow;
  podeGerenciar: boolean;
};

export function RegionalGuideCard({
  local,
  podeGerenciar,
}: RegionalGuideCardProps) {
  const statusDestino = local.status === "active" ? "inactive" : "active";

  return (
    <Card className="admin-glass-card overflow-hidden">
      {local.cover_image_url ? (
        <img
          alt={`Foto de ${local.name}`}
          className="h-40 w-full object-cover"
          src={local.cover_image_url}
        />
      ) : null}

      <CardContent className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={local.status === "active" ? "success" : "secondary"}
              >
                {local.status === "active" ? "Ativo" : "Inativo"}
              </Badge>
              <Badge variant="info">
                {LABEL_CATEGORIA_GUIA_REGIAO[local.category]}
              </Badge>
              <Badge variant="outline">Ordem {local.display_order}</Badge>
            </div>
            <h2 className="mt-3 text-lg font-semibold">{local.name}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {local.description || "Sem descricao cadastrada."}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
          <Info label="Endereco" valor={local.address || "Nao informado"} />
          <Info
            label="Horario"
            valor={local.opening_hours || "Nao informado"}
          />
          <Info label="Telefone" valor={local.phone || "Nao informado"} />
          <Info label="WhatsApp" valor={local.whatsapp || "Nao informado"} />
          <Info label="Site" valor={local.website_url || "Nao informado"} />
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[auto_auto_1fr]">
          <EntityViewModal
            description="Dados publicados internamente para orientar hospedes."
            title={local.name}
            triggerIcon={<Eye className="h-4 w-4" />}
            triggerLabel="Visualizar"
          >
            <div className="grid gap-3 md:grid-cols-2">
              <Info
                label="Categoria"
                valor={LABEL_CATEGORIA_GUIA_REGIAO[local.category]}
              />
              <Info
                label="Status"
                valor={local.status === "active" ? "Ativo" : "Inativo"}
              />
              <Info label="Endereco" valor={local.address || "Nao informado"} />
              <Info
                label="Horario"
                valor={local.opening_hours || "Nao informado"}
              />
              <Info label="Telefone" valor={local.phone || "Nao informado"} />
              <Info
                label="WhatsApp"
                valor={local.whatsapp || "Nao informado"}
              />
              <Info label="Site" valor={local.website_url || "Nao informado"} />
              <div className="md:col-span-2">
                <Info
                  label="Descricao"
                  valor={local.description || "Sem descricao cadastrada."}
                />
              </div>
            </div>
          </EntityViewModal>

          <ConfirmDialog
            description="Esta acao altera a visibilidade operacional do local."
            disabled={!podeGerenciar}
            title={
              local.status === "active" ? "Desativar local" : "Ativar local"
            }
            triggerLabel={local.status === "active" ? "Desativar" : "Ativar"}
            triggerVariant="outline"
          >
            <form
              action={alternarStatusLocalGuiaRegiaoAction}
              className="grid gap-3"
            >
              <input name="localId" type="hidden" value={local.id} />
              <input name="status" type="hidden" value={statusDestino} />
              <p className="text-sm text-muted-foreground">
                Confirme para{" "}
                {local.status === "active" ? "desativar" : "ativar"} este local.
              </p>
              <Button disabled={!podeGerenciar} type="submit" variant="outline">
                {local.status === "active" ? "Desativar" : "Ativar"}
              </Button>
            </form>
          </ConfirmDialog>

          <EntityModal
            description="Atualize categoria, contatos, descrição, ordem e status do local."
            disabled={!podeGerenciar}
            eyebrow="Edição"
            title="Editar local"
            triggerIcon={<Pencil className="h-4 w-4" />}
            triggerLabel="Editar"
          >
            <RegionalGuideForm
              action={atualizarLocalGuiaRegiaoAction}
              local={local}
              modo="editar"
              podeGerenciar={podeGerenciar}
            />
          </EntityModal>

          <ConfirmDialog
            description="Esta exclusão remove o local do Gerenciamento."
            disabled={!podeGerenciar}
            title="Excluir local"
            triggerIcon={<Trash2 className="h-4 w-4" />}
            triggerLabel="Excluir"
          >
            <form action={excluirLocalGuiaRegiaoAction} className="grid gap-3">
              <input name="localId" type="hidden" value={local.id} />
              <p className="text-sm text-muted-foreground">
                Esta exclusao remove o local do gerenciamento e preserva
                historico futuro.
              </p>
              <Button
                disabled={!podeGerenciar}
                size="sm"
                type="submit"
                variant="destructive"
              >
                Confirmar exclusao
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
    <div className="rounded-lg border bg-background/45 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 break-words">{valor}</p>
    </div>
  );
}
