import type { RegionalGuideCategory, RegionalGuideLocationRow } from "@hospedex/types";
import {
  Clock3,
  Eye,
  ImageIcon,
  MapPin,
  Pencil,
  Trash2,
} from "lucide-react";
import type { ReactNode } from "react";

import { Badge, Card, CardContent } from "@hospedex/ui";

import { ActionButton } from "../management/action-button";
import {
  ConfirmDialog,
  EntityModal,
  EntityViewModal,
} from "../management/entity-modal";
import {
  atualizarLocalGuiaRegiaoAction,
  excluirLocalGuiaRegiaoAction,
} from "../../lib/regional-guide/actions";
import {
  LABEL_CATEGORIA_GUIA_REGIAO,
} from "../../lib/regional-guide/types";
import { RegionalGuideForm } from "./regional-guide-form";

/**
 * Card de local recomendado.
 *
 * O card mostra somente dados uteis para decisao operacional. Observacoes e
 * contatos completos ficam na modal para evitar sobrecarregar o catalogo.
 */
type RegionalGuideCardProps = {
  local: RegionalGuideLocationRow;
  podeGerenciar: boolean;
};

export function RegionalGuideCard({
  local,
  podeGerenciar,
}: RegionalGuideCardProps) {
  const descricao = local.description ?? "Sem descrição cadastrada.";

  return (
    <Card className="admin-glass-card overflow-hidden">
      <CardContent className="grid gap-4 p-4 sm:grid-cols-[160px_1fr]">
        <MediaLocal local={local} />

        <div className="flex min-w-0 flex-col gap-3">
          <header className="min-w-0">
            <div className="mb-2 flex flex-wrap gap-2">
              <Badge variant={local.status === "active" ? "success" : "secondary"}>
                {local.status === "active" ? "Ativo" : "Inativo"}
              </Badge>
              <Badge className={obterClasseCategoria(local.category)} variant="outline">
                {LABEL_CATEGORIA_GUIA_REGIAO[local.category]}
              </Badge>
            </div>
            <h3 className="truncate text-lg font-semibold">{local.name}</h3>
            <div className="mt-2 grid gap-1 text-sm text-muted-foreground">
              {local.address ? <LinhaIcone icon={<MapPin />} texto={local.address} /> : null}
              {local.opening_hours ? (
                <LinhaIcone icon={<Clock3 />} texto={local.opening_hours} />
              ) : null}
            </div>
          </header>

          <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
            {descricao}
          </p>

          <div className="mt-auto grid gap-2 sm:grid-cols-3">
            <EntityViewModal
              description="Dados cadastrados para orientar hospedes."
              title={local.name}
              triggerAction="view"
              triggerClassName="w-full"
              triggerIcon={<Eye className="h-4 w-4" />}
              triggerLabel="Visualizar"
            >
              <DetalhesLocal local={local} />
            </EntityViewModal>

            <EntityModal
              description="Atualize as informações que aparecerão para o hóspede no guia da região."
              disabled={!podeGerenciar}
              eyebrow="EDIÇÃO"
              size="full"
              title="Editar recomendação local"
              triggerAction="edit"
              triggerClassName="w-full"
              triggerIcon={<Pencil className="h-4 w-4" />}
              triggerLabel="Editar"
            >
              <RegionalGuideForm
                action={atualizarLocalGuiaRegiaoAction}
                deleteAction={excluirLocalGuiaRegiaoAction}
                local={local}
                modo="editar"
                podeGerenciar={podeGerenciar}
              />
            </EntityModal>

            <ConfirmDialog
              description="Essa recomendação deixará de aparecer no guia da região para os hóspedes. Essa ação não poderá ser desfeita."
              disabled={!podeGerenciar}
              title="Apagar recomendação?"
              triggerAction="delete"
              triggerClassName="w-full"
              triggerIcon={<Trash2 className="h-4 w-4" />}
              triggerLabel="Apagar"
            >
              <form action={excluirLocalGuiaRegiaoAction} className="grid gap-4">
                <input name="localId" type="hidden" value={local.id} />
                <p className="text-sm text-muted-foreground">
                  Esta ação usa exclusão lógica para preservar auditoria do
                  tenant.
                </p>
                <ActionButton
                  className="w-full"
                  disabled={!podeGerenciar}
                  icon={<Trash2 />}
                  type="submit"
                  variant="delete"
                >
                  Apagar local
                </ActionButton>
              </form>
            </ConfirmDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MediaLocal({ local }: { local: RegionalGuideLocationRow }) {
  if (local.cover_image_url) {
    return (
      <img
        alt={`Foto de ${local.name}`}
        className="h-36 w-full rounded-xl border border-border/80 object-cover sm:h-full"
        src={local.cover_image_url}
      />
    );
  }

  return (
    <div className="grid h-36 w-full place-items-center rounded-xl border border-dashed border-cyan-300/25 bg-cyan-500/10 text-cyan-200 sm:h-full">
      <div className="text-center">
        <ImageIcon className="mx-auto h-7 w-7" />
        <p className="mt-2 text-xs font-medium">Sem foto</p>
      </div>
    </div>
  );
}

function DetalhesLocal({ local }: { local: RegionalGuideLocationRow }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Info label="Categoria" valor={LABEL_CATEGORIA_GUIA_REGIAO[local.category]} />
      <Info label="Status" valor={local.status === "active" ? "Ativo" : "Inativo"} />
      <Info label="Endereço" valor={local.address || "Endereço não cadastrado"} />
      <Info label="Horário" valor={local.opening_hours || "Horário não cadastrado"} />
      <Info label="Telefone" valor={local.phone || "Telefone não cadastrado"} />
      <Info label="WhatsApp" valor={local.whatsapp || "WhatsApp não cadastrado"} />
      <Info label="Link do mapa" valor={local.website_url || "Link não cadastrado"} />
      <Info label="Prioridade" valor={String(local.display_order)} />
      <div className="md:col-span-2">
        <Info label="Descrição" valor={local.description || "Sem descrição cadastrada."} />
      </div>
    </div>
  );
}

function LinhaIcone({ icon, texto }: { icon: ReactNode; texto: string }) {
  return (
    <p className="flex min-w-0 items-center gap-2">
      <span className="text-cyan-300 [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
      <span className="min-w-0 truncate">{texto}</span>
    </p>
  );
}

function Info({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-lg border border-border/80 bg-background/45 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm">{valor}</p>
    </div>
  );
}

function obterClasseCategoria(categoria: RegionalGuideCategory) {
  const classes: Partial<Record<RegionalGuideCategory, string>> = {
    hospitals: "border-red-400/35 bg-red-500/10 text-red-200",
    markets: "border-emerald-400/35 bg-emerald-500/10 text-emerald-200",
    pharmacies: "border-sky-400/35 bg-sky-500/10 text-sky-200",
    beaches: "border-cyan-300/40 bg-cyan-400/10 text-cyan-100",
    restaurants: "border-cyan-400/35 bg-cyan-500/10 text-cyan-200",
    tourist_spots: "border-violet-400/35 bg-violet-500/10 text-violet-200",
    tours: "border-violet-400/35 bg-violet-500/10 text-violet-200",
  };

  return classes[categoria] ?? "border-slate-400/35 bg-slate-500/10 text-slate-200";
}
