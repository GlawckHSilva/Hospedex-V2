import { BarChart3, Clock3, Search, ShieldCheck, Star } from "lucide-react";
import type { ReactNode } from "react";

import { Badge, Button, Card, CardContent, FadeIn, Input, Label } from "@hospedex/ui";

import {
  NOTAS_AVALIACAO,
  STATUS_AVALIACAO,
  type DadosModuloAvaliacoes,
  type SearchParamsAvaliacoes
} from "../../lib/reviews/types";
import { ModuleToast } from "../admin/module-toast";
import { ReviewCard } from "./review-card";

/**
 * Modulo de Avaliacoes internas.
 *
 * O painel organiza reputacao por casa sem publicar no Marketplace nesta etapa.
 */

export type ReviewsModuleProps = DadosModuloAvaliacoes & SearchParamsAvaliacoes;

const MENSAGENS_SUCESSO: Record<string, string> = {
  "resposta-salva": "Resposta da avaliacao salva.",
  "status-atualizado": "Status da avaliacao atualizado."
};

const campoClasse =
  "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function ReviewsModule({
  avaliacoes,
  erro,
  filtros,
  podeGerenciar,
  propriedades,
  resumo,
  sucesso,
  tenantNome
}: ReviewsModuleProps) {
  return (
    <FadeIn className="space-y-5">
      <ModuleToast erro={erro} mensagensSucesso={MENSAGENS_SUCESSO} sucesso={sucesso} />

      <section className="admin-glass-panel p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Badge variant={podeGerenciar ? "info" : "warning"}>
              {podeGerenciar ? "Moderacao liberada" : "Somente leitura"}
            </Badge>
            <h1 className="mt-3 text-2xl font-semibold tracking-normal">Avaliacoes</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {tenantNome} - notas, comentarios e respostas internas por casa.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Resumo icon={<Star />} label="Nota media" valor={formatarNota(resumo.notaMedia)} />
            <Resumo icon={<BarChart3 />} label="Avaliacoes" valor={String(resumo.total)} />
            <Resumo icon={<Clock3 />} label="Pendentes" valor={String(resumo.pendentes)} />
            <Resumo icon={<ShieldCheck />} label="Aprovadas" valor={String(resumo.aprovadas)} />
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1fr_24rem]">
        <Card className="admin-glass-card">
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold">Distribuicao por estrelas</h2>
            <div className="mt-4 space-y-3">
              {resumo.distribuicao.map((item) => (
                <div className="grid grid-cols-[4rem_1fr_3rem] items-center gap-3" key={item.nota}>
                  <span className="text-sm font-medium">{item.nota} estrelas</span>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-cyan-500"
                      style={{
                        width: `${resumo.total > 0 ? (item.quantidade / resumo.total) * 100 : 0}%`
                      }}
                    />
                  </div>
                  <span className="text-right text-sm text-muted-foreground">
                    {item.quantidade}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="admin-glass-card">
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold">Ultimas avaliacoes</h2>
            <div className="mt-4 space-y-3">
              {resumo.ultimas.length > 0 ? (
                resumo.ultimas.map((avaliacao) => (
                  <div className="rounded-lg border bg-background/45 p-3 text-sm" key={avaliacao.id}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate font-medium">{avaliacao.guest_name}</span>
                      <Badge variant="info">{avaliacao.rating}/5</Badge>
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {avaliacao.propriedade?.name ?? "Casa removida"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma avaliacao recente.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="admin-glass-card">
        <CardContent className="p-5">
          <form className="grid gap-4 lg:grid-cols-[1fr_0.7fr_0.7fr_0.7fr_0.7fr_auto]">
            <CampoPropriedade
              defaultValue={filtros.propriedadeId ?? ""}
              propriedades={propriedades}
            />
            <CampoNota defaultValue={String(filtros.nota)} />
            <CampoStatus defaultValue={filtros.status} />
            <CampoData defaultValue={filtros.dataInicio ?? ""} label="Inicio" name="dataInicio" />
            <CampoData defaultValue={filtros.dataFim ?? ""} label="Fim" name="dataFim" />
            <div className="flex items-end">
              <Button className="w-full" type="submit" variant="outline">
                <Search />
                Filtrar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {avaliacoes.length > 0 ? (
        <section className="grid gap-5">
          {avaliacoes.map((avaliacao) => (
            <ReviewCard
              avaliacao={avaliacao}
              key={avaliacao.id}
              podeGerenciar={podeGerenciar}
            />
          ))}
        </section>
      ) : (
        <Card className="admin-glass-card">
          <CardContent className="p-5 text-sm text-muted-foreground">
            Nenhuma avaliacao encontrada para os filtros atuais.
          </CardContent>
        </Card>
      )}
    </FadeIn>
  );
}

function Resumo({
  icon,
  label,
  valor
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

function CampoPropriedade({
  defaultValue,
  propriedades
}: {
  defaultValue: string;
  propriedades: Array<{ id: string; name: string }>;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="propriedadeId">Casa</Label>
      <select
        className={campoClasse}
        defaultValue={defaultValue}
        id="propriedadeId"
        name="propriedadeId"
      >
        <option value="">Todas</option>
        {propriedades.map((propriedade) => (
          <option key={propriedade.id} value={propriedade.id}>
            {propriedade.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function CampoNota({ defaultValue }: { defaultValue: string }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="nota">Nota</Label>
      <select className={campoClasse} defaultValue={defaultValue} id="nota" name="nota">
        <option value="todos">Todas</option>
        {NOTAS_AVALIACAO.map((nota) => (
          <option key={nota} value={nota}>
            {nota} estrelas
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
      <select className={campoClasse} defaultValue={defaultValue} id="status" name="status">
        {STATUS_AVALIACAO.map((status) => (
          <option key={status.value} value={status.value}>
            {status.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function CampoData({
  defaultValue,
  label,
  name
}: {
  defaultValue: string;
  label: string;
  name: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input defaultValue={defaultValue} id={name} name={name} type="date" />
    </div>
  );
}

function formatarNota(valor: number): string {
  return valor > 0 ? valor.toFixed(1) : "0.0";
}
