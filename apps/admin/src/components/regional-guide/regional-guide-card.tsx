import type { RegionalGuideLocationRow } from "@hospedex/types";

import { Badge, Button, Card, CardContent } from "@hospedex/ui";

import {
  alternarStatusLocalGuiaRegiaoAction,
  atualizarLocalGuiaRegiaoAction,
  excluirLocalGuiaRegiaoAction
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

export function RegionalGuideCard({ local, podeGerenciar }: RegionalGuideCardProps) {
  const statusDestino = local.status === "active" ? "inactive" : "active";

  return (
    <Card className="admin-glass-card overflow-hidden">
      {local.cover_image_url ? (
        <img alt={`Foto de ${local.name}`} className="h-40 w-full object-cover" src={local.cover_image_url} />
      ) : null}

      <CardContent className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={local.status === "active" ? "success" : "secondary"}>
                {local.status === "active" ? "Ativo" : "Inativo"}
              </Badge>
              <Badge variant="info">{LABEL_CATEGORIA_GUIA_REGIAO[local.category]}</Badge>
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
          <Info label="Horario" valor={local.opening_hours || "Nao informado"} />
          <Info label="Telefone" valor={local.phone || "Nao informado"} />
          <Info label="WhatsApp" valor={local.whatsapp || "Nao informado"} />
          <Info label="Site" valor={local.website_url || "Nao informado"} />
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[auto_auto_1fr]">
          <form action={alternarStatusLocalGuiaRegiaoAction}>
            <input name="localId" type="hidden" value={local.id} />
            <input name="status" type="hidden" value={statusDestino} />
            <Button disabled={!podeGerenciar} size="sm" type="submit" variant="outline">
              {local.status === "active" ? "Desativar" : "Ativar"}
            </Button>
          </form>

          <details className="rounded-lg border bg-background/35 px-3 py-2">
            <summary className="cursor-pointer text-sm font-medium">Editar</summary>
            <div className="mt-4">
              <RegionalGuideForm
                action={atualizarLocalGuiaRegiaoAction}
                local={local}
                modo="editar"
                podeGerenciar={podeGerenciar}
              />
            </div>
          </details>

          <details className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2">
            <summary className="cursor-pointer text-sm font-medium text-destructive">
              Excluir
            </summary>
            <form action={excluirLocalGuiaRegiaoAction} className="mt-4 grid gap-3">
              <input name="localId" type="hidden" value={local.id} />
              <p className="text-sm text-muted-foreground">
                Esta exclusao remove o local do gerenciamento e preserva historico futuro.
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
      <p className="mt-1 break-words">{valor}</p>
    </div>
  );
}
