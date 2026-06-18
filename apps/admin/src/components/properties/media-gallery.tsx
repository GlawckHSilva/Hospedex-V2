import type { MediaAssetRow } from "@hospedex/types";
import { ArrowDown, ArrowUp, Star, Trash2, Upload } from "lucide-react";
import type { ReactNode } from "react";

import { Badge, Button, Input, Label } from "@hospedex/ui";

import { ConfirmDialog, EntityModal } from "../management/entity-modal";
import {
  alterarOrdemImagemAction,
  definirImagemPrincipalAction,
  enviarGaleriaPropriedadeAction,
  enviarImagensUnidadeAction,
  excluirImagemAction,
} from "../../lib/properties/media-actions";

/**
 * Galeria reutilizável de propriedades e unidades.
 *
 * O componente só envia arquivos ao Storage via server action. Ordem, imagem
 * principal e exclusão ficam nos metadados multi-tenant de media_assets.
 */

export type MediaGalleryProps = {
  imagens: MediaAssetRow[];
  podeGerenciar: boolean;
  propriedadeId: string;
  retorno: "/propriedades" | "/unidades";
  tipo: "propriedade" | "unidade";
  unidadeId?: string;
};

export function MediaGallery({
  imagens,
  podeGerenciar,
  propriedadeId,
  retorno,
  tipo,
  unidadeId,
}: MediaGalleryProps) {
  const action =
    tipo === "propriedade"
      ? enviarGaleriaPropriedadeAction
      : enviarImagensUnidadeAction;

  return (
    <section className="space-y-3">
      <div className="flex justify-end">
        <EntityModal
          description="Envie imagens para a galeria desta casa ou unidade."
          disabled={!podeGerenciar}
          eyebrow="Galeria"
          size="md"
          title="Enviar imagens"
          triggerIcon={<Upload className="h-4 w-4" />}
          triggerLabel="Enviar imagens"
          triggerVariant="outline"
        >
          <form action={action} className="grid gap-4">
            <input name="retorno" type="hidden" value={retorno} />
            <input name="propriedadeId" type="hidden" value={propriedadeId} />
            {unidadeId ? (
              <input name="unidadeId" type="hidden" value={unidadeId} />
            ) : null}

            <div className="grid gap-2">
              <Label
                htmlFor={`${tipo}-${propriedadeId}-${unidadeId ?? "galeria"}`}
              >
                Galeria
              </Label>
              <Input
                accept="image/*"
                disabled={!podeGerenciar}
                id={`${tipo}-${propriedadeId}-${unidadeId ?? "galeria"}`}
                multiple
                name="imagens"
                type="file"
              />
            </div>
            <div className="flex justify-end">
              <Button disabled={!podeGerenciar} type="submit" variant="outline">
                <Upload />
                Enviar
              </Button>
            </div>
          </form>
        </EntityModal>
      </div>

      {imagens.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {imagens.map((imagem) => (
            <article
              className="overflow-hidden rounded-lg border bg-background/55"
              key={imagem.id}
            >
              {imagem.url ? (
                <img
                  alt={imagem.alt ?? "Imagem da galeria"}
                  className="h-32 w-full object-cover"
                  src={imagem.url}
                />
              ) : null}

              <div className="space-y-3 p-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant={imagem.is_cover ? "success" : "outline"}>
                    {imagem.is_cover
                      ? "Principal"
                      : `Ordem ${imagem.sort_order}`}
                  </Badge>
                  <span className="truncate text-xs text-muted-foreground">
                    {imagem.alt}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <AcaoImagem
                    action={definirImagemPrincipalAction}
                    disabled={!podeGerenciar || imagem.is_cover}
                    imagemId={imagem.id}
                    retorno={retorno}
                  >
                    <Star />
                    Principal
                  </AcaoImagem>
                  <AcaoOrdem
                    direcao="subir"
                    disabled={!podeGerenciar}
                    imagemId={imagem.id}
                    retorno={retorno}
                  >
                    <ArrowUp />
                  </AcaoOrdem>
                  <AcaoOrdem
                    direcao="descer"
                    disabled={!podeGerenciar}
                    imagemId={imagem.id}
                    retorno={retorno}
                  >
                    <ArrowDown />
                  </AcaoOrdem>
                  <AcaoImagem
                    action={excluirImagemAction}
                    disabled={!podeGerenciar}
                    imagemId={imagem.id}
                    retorno={retorno}
                    variant="destructive"
                  >
                    <Trash2 />
                  </AcaoImagem>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed bg-background/45 p-4 text-sm text-muted-foreground">
          Nenhuma imagem cadastrada.
        </div>
      )}
    </section>
  );
}

function AcaoImagem({
  action,
  children,
  disabled,
  imagemId,
  retorno,
  variant = "outline",
}: {
  action: (formData: FormData) => Promise<void>;
  children: ReactNode;
  disabled: boolean;
  imagemId: string;
  retorno: string;
  variant?: "outline" | "destructive";
}) {
  if (variant === "destructive") {
    return (
      <ConfirmDialog
        description="Confirme para remover esta imagem da galeria."
        disabled={disabled}
        title="Excluir imagem"
        triggerIcon={<Trash2 className="h-4 w-4" />}
        triggerLabel="Excluir"
      >
        <form action={action} className="grid gap-3">
          <input name="retorno" type="hidden" value={retorno} />
          <input name="imagemId" type="hidden" value={imagemId} />
          <Button disabled={disabled} type="submit" variant="destructive">
            <Trash2 />
            Excluir imagem
          </Button>
        </form>
      </ConfirmDialog>
    );
  }

  return (
    <form action={action}>
      <input name="retorno" type="hidden" value={retorno} />
      <input name="imagemId" type="hidden" value={imagemId} />
      <Button disabled={disabled} size="sm" type="submit" variant={variant}>
        {children}
      </Button>
    </form>
  );
}

function AcaoOrdem({
  children,
  direcao,
  disabled,
  imagemId,
  retorno,
}: {
  children: ReactNode;
  direcao: "subir" | "descer";
  disabled: boolean;
  imagemId: string;
  retorno: string;
}) {
  return (
    <form action={alterarOrdemImagemAction}>
      <input name="retorno" type="hidden" value={retorno} />
      <input name="imagemId" type="hidden" value={imagemId} />
      <input name="direcao" type="hidden" value={direcao} />
      <Button disabled={disabled} size="sm" type="submit" variant="outline">
        {children}
      </Button>
    </form>
  );
}
