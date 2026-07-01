import {
  BedDouble,
  CalendarCheck2,
  CircleDollarSign,
  CreditCard,
  Filter,
  Plus,
  Search,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import {
  Button,
  Card,
  CardContent,
  FadeIn,
  Input,
  Label,
  cn,
} from "@hospedex/ui";

import { ModuleToast } from "../admin/module-toast";
import { EntityModal } from "../management/entity-modal";
import {
  ABAS_RESERVAS,
  LABEL_ORIGEM_RESERVA,
  LABEL_STATUS_PAGAMENTO_RESERVA,
  ORIGENS_RESERVA,
  STATUS_PAGAMENTO_RESERVA,
  type DadosModuloReservas,
  type SearchParamsReservas,
} from "../../lib/reservations/types";
import { ReservationForm } from "./reservation-form";
import { ReservationGrid } from "./reservation-grid";

/**
 * Módulo visual de Reservas.
 *
 * A tela usa dados já filtrados pelo servidor por tenant. Aqui só organizamos
 * a experiência de gestão, sem alterar regra de status, cobrança ou permissão.
 */

export type ReservationModuleProps = DadosModuloReservas &
  SearchParamsReservas & {
    tenantNome: string;
  };

const MENSAGENS_SUCESSO_RESERVAS: Record<string, string> = {
  "reserva-criada": "Reserva criada com sucesso.",
  "reserva-atualizada": "Reserva atualizada com sucesso.",
  "reserva-cancelada": "Reserva cancelada com sucesso.",
  "status-reserva": "Status da reserva atualizado.",
  "pagamento-reserva": "Pagamento da reserva atualizado.",
  "servico-extra": "Serviço extra adicionado.",
  "observacao-adicionada": "Observação adicionada.",
};

export function ReservationModule({
  erro,
  filtros,
  podeGerenciar,
  podeGerenciarPagamento,
  propriedades,
  reservas,
  resumo,
  sucesso,
}: ReservationModuleProps) {
  const existemFiltrosAtivos = Boolean(
    filtros.busca ||
      filtros.propriedadeId ||
      filtros.dataInicio ||
      filtros.dataFim ||
      (filtros.origem && filtros.origem !== "todos") ||
      (filtros.pagamento && filtros.pagamento !== "todos") ||
      (filtros.aba && filtros.aba !== "todas"),
  );

  return (
    <FadeIn className="space-y-5">
      <ModuleToast
        erro={erro}
        mensagensSucesso={MENSAGENS_SUCESSO_RESERVAS}
        sucesso={sucesso}
      />

      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal">Reservas</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Gerencie solicitações, hospedagens, pagamentos e cancelamentos.
          </p>
        </div>

        <EntityModal
          description="Informe casa, período, hóspede e valores da reserva."
          disabled={!podeGerenciar}
          eyebrow="Cadastro"
          size="xl"
          title="Nova reserva manual"
          triggerClassName="h-11 px-5 text-sm"
          triggerIcon={<Plus className="h-4 w-4" />}
          triggerLabel="Nova reserva"
          triggerVariant="default"
        >
          <ReservationForm
            modo="criar"
            podeGerenciar={podeGerenciar}
            propriedades={propriedades}
          />
        </EntityModal>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        <Resumo
          color="cyan"
          icon={<CalendarCheck2 />}
          label="Solicitações"
          valor={String(resumo.pendentes)}
        />
        <Resumo
          color="green"
          icon={<CalendarCheck2 />}
          label="Confirmadas"
          valor={String(resumo.confirmadas)}
        />
        <Resumo
          color="violet"
          icon={<BedDouble />}
          label="Em hospedagem"
          valor={String(resumo.hospedadas)}
        />
        <Resumo
          color="red"
          icon={<XCircle />}
          label="Canceladas"
          valor={String(resumo.canceladas)}
        />
        <Resumo
          color="cyan"
          icon={<CalendarCheck2 />}
          label="Finalizadas"
          valor={String(resumo.concluidas)}
        />
        <Resumo
          color="amber"
          icon={<CreditCard />}
          label="Pagamentos pendentes"
          valor={String(resumo.pagamentosPendentes)}
        />
        <Resumo
          color="green"
          icon={<CircleDollarSign />}
          label="Pagamentos recebidos"
          valor={String(resumo.pagamentosRecebidos)}
        />
      </section>

      <nav aria-label="Filtros principais de reservas" className="flex flex-wrap gap-2">
        {ABAS_RESERVAS.map((aba) => {
          const ativa = (filtros.aba ?? "todas") === aba.key;

          return (
            <Link
              className={cn(
                "rounded-lg border px-4 py-2 text-sm font-medium transition",
                ativa
                  ? "border-cyan-400/70 bg-cyan-500/15 text-cyan-800 shadow-sm shadow-cyan-950/10 dark:text-cyan-100"
                  : "border-border/70 bg-background/35 text-muted-foreground hover:border-cyan-400/35 hover:bg-cyan-500/10 hover:text-foreground",
              )}
              href={`/reservas?tab=${aba.key}`}
              key={aba.key}
            >
              {aba.label}
            </Link>
          );
        })}
      </nav>

      <Card className="admin-glass-card">
        <CardContent className="p-5">
          <form className="grid gap-4 xl:grid-cols-[minmax(280px,1.35fr)_minmax(220px,0.8fr)_minmax(280px,1fr)_auto_auto] xl:items-end">
            <input name="tab" type="hidden" value={filtros.aba ?? "todas"} />
            <CampoTexto
              defaultValue={filtros.busca ?? ""}
              icon={<Search />}
              label="Busca"
              name="busca"
              placeholder="Buscar por código, hóspede, telefone ou casa"
            />
            <CampoPropriedade
              defaultValue={filtros.propriedadeId ?? ""}
              propriedades={propriedades}
            />
            <CampoPeriodo
              dataFim={filtros.dataFim ?? ""}
              dataInicio={filtros.dataInicio ?? ""}
            />
            <MaisFiltros>
              <CampoPagamento defaultValue={filtros.pagamento ?? "todos"} />
              <CampoOrigem defaultValue={filtros.origem ?? "todos"} />
            </MaisFiltros>
            <div className="flex items-end">
              <Button className="h-10 w-full px-5" type="submit" variant="outline">
                <Search />
                Filtrar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <ReservationGrid
        existemFiltrosAtivos={existemFiltrosAtivos}
        podeGerenciar={podeGerenciar}
        podeGerenciarPagamento={podeGerenciarPagamento}
        propriedades={propriedades}
        reservas={reservas}
      />
    </FadeIn>
  );
}

function CampoPagamento({ defaultValue }: { defaultValue: string }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="pagamento">Pagamento</Label>
      <select
        className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        defaultValue={defaultValue}
        id="pagamento"
        name="pagamento"
      >
        <option value="todos">Todos</option>
        {STATUS_PAGAMENTO_RESERVA.map((status) => (
          <option key={status} value={status}>
            {LABEL_STATUS_PAGAMENTO_RESERVA[status]}
          </option>
        ))}
      </select>
    </div>
  );
}

type CorResumo = "amber" | "cyan" | "green" | "red" | "violet";

const coresResumo: Record<CorResumo, string> = {
  amber:
    "border-amber-400/25 bg-amber-500/8 text-amber-700 dark:text-amber-200 [&_.resumo-icone]:bg-amber-500/15 [&_.resumo-icone]:text-amber-500",
  cyan:
    "border-cyan-400/25 bg-cyan-500/8 text-cyan-700 dark:text-cyan-200 [&_.resumo-icone]:bg-cyan-500/15 [&_.resumo-icone]:text-cyan-500",
  green:
    "border-emerald-400/25 bg-emerald-500/8 text-emerald-700 dark:text-emerald-200 [&_.resumo-icone]:bg-emerald-500/15 [&_.resumo-icone]:text-emerald-500",
  red:
    "border-red-400/25 bg-red-500/8 text-red-700 dark:text-red-200 [&_.resumo-icone]:bg-red-500/15 [&_.resumo-icone]:text-red-500",
  violet:
    "border-violet-400/25 bg-violet-500/8 text-violet-700 dark:text-violet-200 [&_.resumo-icone]:bg-violet-500/15 [&_.resumo-icone]:text-violet-500",
};

function Resumo({
  color,
  icon,
  label,
  valor,
}: {
  color: CorResumo;
  icon: ReactNode;
  label: string;
  valor: string;
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-xl border p-4 shadow-sm backdrop-blur-md",
        coresResumo[color],
      )}
    >
      <div className="flex items-center gap-3">
        <span className="resumo-icone flex h-10 w-10 shrink-0 items-center justify-center rounded-xl [&_svg]:h-5 [&_svg]:w-5">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold leading-none text-foreground">
            {valor}
          </p>
        </div>
      </div>
    </div>
  );
}

function CampoOrigem({ defaultValue }: { defaultValue: string }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="origem">Origem</Label>
      <select
        className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        defaultValue={defaultValue}
        id="origem"
        name="origem"
      >
        <option value="todos">Todas</option>
        {ORIGENS_RESERVA.map((origem) => (
          <option key={origem} value={origem}>
            {LABEL_ORIGEM_RESERVA[origem]}
          </option>
        ))}
      </select>
    </div>
  );
}

function CampoTexto({
  defaultValue,
  icon,
  label,
  name,
  placeholder,
}: {
  defaultValue?: string;
  icon?: ReactNode;
  label: string;
  name: string;
  placeholder?: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <div className="relative">
        {icon ? (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg]:h-4 [&_svg]:w-4">
            {icon}
          </span>
        ) : null}
        <Input
          className={icon ? "pl-10" : undefined}
          defaultValue={defaultValue}
          id={name}
          name={name}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}

function CampoPropriedade({
  defaultValue,
  propriedades,
}: {
  defaultValue: string;
  propriedades: Array<{ id: string; name: string }>;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="propriedadeId">Propriedade</Label>
      <select
        className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        defaultValue={defaultValue}
        id="propriedadeId"
        name="propriedadeId"
      >
        <option value="">Todas as casas</option>
        {propriedades.map((propriedade) => (
          <option key={propriedade.id} value={propriedade.id}>
            {propriedade.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function CampoPeriodo({
  dataFim,
  dataInicio,
}: {
  dataFim: string;
  dataInicio: string;
}) {
  return (
    <div className="grid gap-2">
      <Label>Período</Label>
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          aria-label="Data inicial"
          defaultValue={dataInicio}
          name="dataInicio"
          type="date"
        />
        <Input
          aria-label="Data final"
          defaultValue={dataFim}
          name="dataFim"
          type="date"
        />
      </div>
    </div>
  );
}

function MaisFiltros({ children }: { children: ReactNode }) {
  return (
    <details className="group relative">
      <summary className="flex h-10 cursor-pointer list-none items-center justify-center gap-2 rounded-md border bg-background px-4 text-sm font-semibold shadow-sm transition hover:border-cyan-400/35 hover:bg-cyan-500/10 [&::-webkit-details-marker]:hidden">
        <Filter className="h-4 w-4" />
        Mais filtros
      </summary>
      <div className="absolute right-0 z-20 mt-2 grid w-72 gap-4 rounded-xl border bg-card p-4 shadow-xl shadow-cyan-950/20">
        {children}
      </div>
    </details>
  );
}
