import { MapPin, Plus, Search, ShieldCheck, ToggleLeft } from "lucide-react";
import type { ReactNode } from "react";

import { Badge, Button, Card, CardContent, FadeIn, Label } from "@hospedex/ui";

import { EntityModal } from "../management/entity-modal";
import { criarLocalGuiaRegiaoAction } from "../../lib/regional-guide/actions";
import {
  CATEGORIAS_GUIA_REGIAO,
  STATUS_GUIA_REGIAO,
  type DadosModuloGuiaRegiao,
  type SearchParamsGuiaRegiao,
} from "../../lib/regional-guide/types";
import { ModuleToast } from "../admin/module-toast";
import { RegionalGuideCard } from "./regional-guide-card";
import { RegionalGuideForm } from "./regional-guide-form";

/**
 * Modulo administrativo do Guia da Regiao.
 *
 * A tela permite o proprietario organizar recomendacoes locais sem publicar
 * automaticamente para hospedes.
 */

export type RegionalGuideModuleProps = DadosModuloGuiaRegiao &
  SearchParamsGuiaRegiao;

const MENSAGENS_SUCESSO: Record<string, string> = {
  "local-atualizado": "Local atualizado.",
  "local-criado": "Local criado.",
  "local-excluido": "Local excluido.",
  "status-atualizado": "Status do local atualizado.",
};

const campoClasse =
  "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function RegionalGuideModule({
  erro,
  filtros,
  locais,
  podeGerenciar,
  resumo,
  sucesso,
  tenantNome,
}: RegionalGuideModuleProps) {
  return (
    <FadeIn className="space-y-5">
      <ModuleToast
        erro={erro}
        mensagensSucesso={MENSAGENS_SUCESSO}
        sucesso={sucesso}
      />

      <section className="admin-glass-panel p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Badge variant={podeGerenciar ? "info" : "warning"}>
              {podeGerenciar ? "Guia editavel" : "Somente leitura"}
            </Badge>
            <h1 className="mt-3 text-2xl font-semibold tracking-normal">
              Guia da regiao
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {tenantNome} · recomendacoes locais preparadas para exibicao
              futura.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Resumo
              icon={<MapPin />}
              label="Locais"
              valor={String(resumo.total)}
            />
            <Resumo
              icon={<ShieldCheck />}
              label="Ativos"
              valor={String(resumo.ativos)}
            />
            <Resumo
              icon={<ToggleLeft />}
              label="Inativos"
              valor={String(resumo.inativos)}
            />
          </div>
        </div>
      </section>

      <Card className="admin-glass-card">
        <CardContent className="p-5">
          <form className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
            <CampoCategoria defaultValue={filtros.categoria} />
            <CampoStatus defaultValue={filtros.status} />
            <div className="flex items-end">
              <Button className="w-full" type="submit" variant="outline">
                <Search />
                Filtrar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="admin-glass-card">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">Recomendação local</h2>
            <p className="text-sm text-muted-foreground">
              Cadastre restaurantes, praias, mercados e outros locais via modal.
            </p>
          </div>
          <EntityModal
            description="Informe categoria, contato, endereço, horário e imagem de capa."
            disabled={!podeGerenciar}
            eyebrow="Cadastro"
            title="Novo local"
            triggerIcon={<Plus className="h-4 w-4" />}
            triggerLabel="Novo local"
            triggerVariant="default"
          >
            <RegionalGuideForm
              action={criarLocalGuiaRegiaoAction}
              modo="criar"
              podeGerenciar={podeGerenciar}
            />
          </EntityModal>
        </CardContent>
      </Card>

      {locais.length > 0 ? (
        <section className="grid gap-5">
          {locais.map((local) => (
            <RegionalGuideCard
              key={local.id}
              local={local}
              podeGerenciar={podeGerenciar}
            />
          ))}
        </section>
      ) : (
        <Card className="admin-glass-card">
          <CardContent className="p-5 text-sm text-muted-foreground">
            Nenhum local encontrado para o filtro atual.
          </CardContent>
        </Card>
      )}
    </FadeIn>
  );
}

function Resumo({
  icon,
  label,
  valor,
}: {
  icon: ReactNode;
  label: string;
  valor: string;
}) {
  return (
    <div className="min-w-36 rounded-lg border bg-background/55 p-3 text-sm">
      <div className="mb-2 text-primary [&_svg]:h-4 [&_svg]:w-4">{icon}</div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate font-semibold">{valor}</p>
    </div>
  );
}

function CampoCategoria({ defaultValue }: { defaultValue: string }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="categoria">Categoria</Label>
      <select
        className={campoClasse}
        defaultValue={defaultValue}
        id="categoria"
        name="categoria"
      >
        {CATEGORIAS_GUIA_REGIAO.map((categoria) => (
          <option key={categoria.value} value={categoria.value}>
            {categoria.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function CampoStatus({ defaultValue }: { defaultValue: string }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="status">Status</Label>
      <select
        className={campoClasse}
        defaultValue={defaultValue}
        id="status"
        name="status"
      >
        {STATUS_GUIA_REGIAO.map((status) => (
          <option key={status.value} value={status.value}>
            {status.label}
          </option>
        ))}
      </select>
    </div>
  );
}
