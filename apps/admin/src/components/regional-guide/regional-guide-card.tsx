import type { RegionalGuideLocationRow } from "@hospedex/types";
import { Eye, MapPin, Pencil } from "lucide-react";

import { Badge } from "@hospedex/ui";

import {
  EntityCard,
  EntityCardActions,
  EntityCardHeader,
} from "../management/entity-card";
import { EntityModal, EntityViewModal } from "../management/entity-modal";
import { atualizarLocalGuiaRegiaoAction } from "../../lib/regional-guide/actions";
import { LABEL_CATEGORIA_GUIA_REGIAO } from "../../lib/regional-guide/types";
import { RegionalGuideForm } from "./regional-guide-form";

/**
 * Card compacto do Guia da Regiao, inspirado em grids de video/lugares.
 */
type RegionalGuideCardProps = {
  local: RegionalGuideLocationRow;
  podeGerenciar: boolean;
};

export function RegionalGuideCard({
  local,
  podeGerenciar,
}: RegionalGuideCardProps) {
  const media = local.cover_image_url ? (
    <img
      alt={`Foto de ${local.name}`}
      className="h-40 w-full object-cover"
      src={local.cover_image_url}
    />
  ) : (
    <div className="flex h-36 items-center justify-center bg-primary/15 text-primary">
      <MapPin className="h-10 w-10" />
    </div>
  );

  return (
    <EntityCard media={media}>
      <EntityCardHeader
        badges={
          <>
            <Badge variant={local.status === "active" ? "success" : "secondary"}>
              {local.status === "active" ? "Ativo" : "Inativo"}
            </Badge>
            <Badge variant="info">
              {LABEL_CATEGORIA_GUIA_REGIAO[local.category]}
            </Badge>
          </>
        }
        subtitle={local.address || "Cidade nao informada"}
        title={local.name}
      />

      <EntityCardActions>
        <EntityViewModal
          description="Dados cadastrados para orientar hospedes."
          title={local.name}
          triggerClassName="h-9 justify-center"
          triggerIcon={<Eye className="h-4 w-4" />}
          triggerLabel="Visualizar"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <Info label="Categoria" valor={LABEL_CATEGORIA_GUIA_REGIAO[local.category]} />
            <Info label="Status" valor={local.status === "active" ? "Ativo" : "Inativo"} />
            <Info label="Endereco" valor={local.address || "Nao informado"} />
            <Info label="Horario" valor={local.opening_hours || "Nao informado"} />
            <Info label="Telefone" valor={local.phone || "Nao informado"} />
            <Info label="WhatsApp" valor={local.whatsapp || "Nao informado"} />
            <Info label="Site" valor={local.website_url || "Nao informado"} />
            <div className="md:col-span-2">
              <Info label="Descricao" valor={local.description || "Sem descricao cadastrada."} />
            </div>
          </div>
        </EntityViewModal>

        <EntityModal
          description="Atualize categoria, contatos, descricao, ordem e status do local."
          disabled={!podeGerenciar}
          eyebrow="Edicao"
          title="Editar local"
          triggerClassName="h-9 justify-center"
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
      </EntityCardActions>
    </EntityCard>
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
