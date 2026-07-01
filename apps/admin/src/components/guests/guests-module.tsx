import { Ban, Filter, Plus, Search, ShieldAlert, UserRound, UsersRound } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Button, Card, CardContent, FadeIn, Input, Label, cn } from "@hospedex/ui";

import { ModuleToast } from "../admin/module-toast";
import { EmptyState } from "../management/entity-card";
import { EntityModal } from "../management/entity-modal";
import {
  LABEL_STATUS_HOSPEDE_CRM,
  STATUS_HOSPEDE_CRM,
  type DadosModuloHospedes,
  type SearchParamsHospedes
} from "../../lib/guests/types";
import { GuestForm } from "./guest-form";
import { GuestMobileCard, GuestTableRow } from "./guest-card";

/**
 * Módulo de Hóspedes e CRM.
 *
 * O CRM lista vínculos do hóspede com o tenant atual. Remover um hóspede aqui
 * não exclui a conta pública/global, apenas arquiva o vínculo no CRM quando as
 * regras operacionais permitirem.
 */

export type GuestsModuleProps = DadosModuloHospedes & SearchParamsHospedes;

const MENSAGENS_SUCESSO_HOSPEDES: Record<string, string> = {
  "hospede-atualizado": "Hóspede atualizado com sucesso.",
  "hospede-criado": "Hóspede criado com sucesso.",
  "hospede-excluido": "Hóspede removido do CRM com sucesso.",
  "status-hospede": "Status do hóspede atualizado."
};

const campoClasse =
  "flex h-11 w-full rounded-lg border bg-background/70 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function GuestsModule({
  erro,
  filtros,
  hospedes,
  podeGerenciar,
  resumo,
  sucesso
}: GuestsModuleProps) {
  const existemFiltrosAtivos = Boolean(
    filtros.busca || (filtros.status && filtros.status !== "todos")
  );

  return (
    <FadeIn className="space-y-5">
      <ModuleToast
        erro={erro}
        mensagensSucesso={MENSAGENS_SUCESSO_HOSPEDES}
        sucesso={sucesso}
      />

      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal">Hóspedes e CRM</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Gerencie contatos, histórico e relacionamento com seus hóspedes.
          </p>
        </div>

        <EntityModal
          description="Cadastre um contato manual no CRM deste proprietário."
          disabled={!podeGerenciar}
          eyebrow="CRM"
          size="lg"
          title="Novo hóspede"
          triggerClassName="h-11 px-5 text-sm"
          triggerIcon={<Plus className="h-4 w-4" />}
          triggerLabel="Novo hóspede"
          triggerVariant="default"
        >
          <GuestForm modo="criar" podeGerenciar={podeGerenciar} />
        </EntityModal>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Resumo color="cyan" description="Hóspedes cadastrados" icon={<UsersRound />} label="Total" valor={String(resumo.total)} />
        <Resumo color="green" description="Hóspedes ativos" icon={<UserRound />} label="Ativos" valor={String(resumo.ativos)} />
        <Resumo color="amber" description="Precisam de atenção" icon={<ShieldAlert />} label="Atenção" valor={String(resumo.atencao)} />
        <Resumo color="red" description="Hóspedes bloqueados" icon={<Ban />} label="Bloqueados" valor={String(resumo.bloqueados)} />
      </section>

      <Card className="admin-glass-card">
        <CardContent className="p-5">
          <form className="grid gap-4 lg:grid-cols-[minmax(260px,1fr)_minmax(180px,0.42fr)_auto_auto] lg:items-end">
            <CampoBusca defaultValue={filtros.busca ?? ""} />
            <CampoStatus defaultValue={filtros.status ?? "todos"} />
            <MaisFiltros />
            <div className="flex items-end">
              <Button className="h-11 w-full px-5" type="submit" variant="outline">
                <Search className="h-4 w-4" />
                Filtrar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {hospedes.length > 0 ? (
        <>
          <Card className="admin-glass-card hidden overflow-hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className="border-b border-border/70 text-xs uppercase tracking-[0.08em] text-muted-foreground">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Hóspede</th>
                    <th className="px-5 py-4 font-semibold">Contato</th>
                    <th className="px-5 py-4 font-semibold">Última hospedagem</th>
                    <th className="px-5 py-4 text-right font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {hospedes.map((hospede) => (
                    <GuestTableRow
                      hospede={hospede}
                      key={hospede.id}
                      podeGerenciar={podeGerenciar}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="grid gap-3 lg:hidden">
            {hospedes.map((hospede) => (
              <GuestMobileCard
                hospede={hospede}
                key={hospede.id}
                podeGerenciar={podeGerenciar}
              />
            ))}
          </div>

          <AvisoRemocao total={resumo.total} />
        </>
      ) : (
        <EmptyState
          action={
            existemFiltrosAtivos ? (
              <Link
                className="inline-flex h-10 items-center justify-center rounded-lg border border-cyan-400/35 bg-cyan-500/8 px-4 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/15"
                href="/hospedes"
              >
                Limpar filtros
              </Link>
            ) : (
              <EntityModal
                description="Cadastre um contato manual no CRM deste proprietário."
                disabled={!podeGerenciar}
                eyebrow="CRM"
                size="lg"
                title="Novo hóspede"
                triggerIcon={<Plus className="h-4 w-4" />}
                triggerLabel="Novo hóspede"
                triggerVariant="default"
              >
                <GuestForm modo="criar" podeGerenciar={podeGerenciar} />
              </EntityModal>
            )
          }
          description={
            existemFiltrosAtivos
              ? "Altere a busca ou limpe os filtros para continuar."
              : "Os hóspedes aparecerão aqui quando houver reservas ou cadastros manuais."
          }
          icon={<UsersRound className="h-5 w-5" />}
          title={
            existemFiltrosAtivos
              ? "Nenhum hóspede encontrado com esses filtros"
              : "Nenhum hóspede encontrado"
          }
        />
      )}
    </FadeIn>
  );
}

type CorResumo = "amber" | "cyan" | "green" | "red";

const coresResumo: Record<CorResumo, string> = {
  amber:
    "border-orange-400/25 bg-orange-500/8 [&_.resumo-icone]:bg-orange-500/15 [&_.resumo-icone]:text-orange-400",
  cyan:
    "border-cyan-400/25 bg-cyan-500/8 [&_.resumo-icone]:bg-cyan-500/15 [&_.resumo-icone]:text-cyan-400",
  green:
    "border-emerald-400/25 bg-emerald-500/8 [&_.resumo-icone]:bg-emerald-500/15 [&_.resumo-icone]:text-emerald-400",
  red:
    "border-red-400/25 bg-red-500/8 [&_.resumo-icone]:bg-red-500/15 [&_.resumo-icone]:text-red-400"
};

function Resumo({
  color,
  description,
  icon,
  label,
  valor
}: {
  color: CorResumo;
  description: string;
  icon: ReactNode;
  label: string;
  valor: string;
}) {
  return (
    <div className={cn("rounded-xl border p-4 shadow-sm backdrop-blur-md", coresResumo[color])}>
      <div className="flex items-start gap-3">
        <span className="resumo-icone flex h-10 w-10 shrink-0 items-center justify-center rounded-xl [&_svg]:h-5 [&_svg]:w-5">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold leading-none text-foreground">{valor}</p>
          <p className="mt-2 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}

function CampoBusca({ defaultValue }: { defaultValue: string }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="busca">Busca</Label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-11 pl-10"
          defaultValue={defaultValue}
          id="busca"
          name="busca"
          placeholder="Buscar por nome, telefone ou e-mail..."
        />
      </div>
    </div>
  );
}

function CampoStatus({ defaultValue }: { defaultValue: string }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="status">Status</Label>
      <select className={campoClasse} defaultValue={defaultValue} id="status" name="status">
        {STATUS_HOSPEDE_CRM.map((status) => (
          <option key={status} value={status}>
            {LABEL_STATUS_HOSPEDE_CRM[status]}
          </option>
        ))}
      </select>
    </div>
  );
}

function MaisFiltros() {
  return (
    <details className="group relative">
      <summary className="flex h-11 cursor-pointer list-none items-center justify-center gap-2 rounded-lg border bg-background/70 px-4 text-sm font-semibold shadow-sm transition hover:border-cyan-400/35 hover:bg-cyan-500/10 [&::-webkit-details-marker]:hidden">
        <Filter className="h-4 w-4" />
        Mais filtros
      </summary>
      <div className="absolute right-0 z-30 mt-2 grid w-72 gap-2 rounded-xl border bg-card p-4 text-sm text-muted-foreground shadow-xl shadow-cyan-950/20">
        <span>Recorrentes</span>
        <span>Sem histórico</span>
        <span>Com atenção</span>
        <span>Origem</span>
        <span>Última hospedagem</span>
      </div>
    </details>
  );
}

function AvisoRemocao({ total }: { total: number }) {
  return (
    <Card className="admin-glass-card">
      <CardContent className="flex flex-col gap-3 p-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <p className="max-w-4xl">
          Só é possível apagar hóspedes que não possuem reservas, hospedagens ou
          pendências ativas. O cadastro público do hóspede no site não será excluído.
        </p>
        <span className="shrink-0 font-medium">Total: {total} hóspedes</span>
      </CardContent>
    </Card>
  );
}
