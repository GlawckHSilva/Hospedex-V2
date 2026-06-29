import {
  CalendarCheck2,
  Clock3,
  Plus,
  Search,
  ShieldCheck,
} from "lucide-react";
import type { ReactNode } from "react";

import {
  Badge,
  Button,
  Card,
  CardContent,
  FadeIn,
  Input,
  Label,
} from "@hospedex/ui";

import { EntityModal } from "../management/entity-modal";
import { ModuleToast } from "../admin/module-toast";
import {
  LABEL_STATUS_RESERVA,
  LABEL_ORIGEM_RESERVA,
  LABEL_STATUS_PAGAMENTO_RESERVA,
  ORIGENS_RESERVA,
  STATUS_PAGAMENTO_RESERVA,
  STATUS_RESERVA,
  type DadosModuloReservas,
  type SearchParamsReservas,
} from "../../lib/reservations/types";
import { ReservationForm } from "./reservation-form";
import { ReservationGrid } from "./reservation-grid";

/**
 * Módulo base de Reservas.
 *
 * Entrega fluxo manual e rastreável. Pagamentos, calendário, WhatsApp e
 * check-in avançado ficam preparados no schema, mas fora da lógica desta etapa.
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
  tenantNome,
}: ReservationModuleProps) {
  return (
    <FadeIn className="space-y-5">
      <ModuleToast
        erro={erro}
        mensagensSucesso={MENSAGENS_SUCESSO_RESERVAS}
        sucesso={sucesso}
      />

      <section className="admin-glass-panel p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Badge variant={podeGerenciar ? "info" : "warning"}>
              {podeGerenciar ? "Gestão liberada" : "Somente leitura"}
            </Badge>
            <h1 className="mt-3 text-2xl font-semibold tracking-normal">
              Reservas
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {tenantNome}
            </p>
            <div className="mt-5">
              <EntityModal
                description="Informe casa, período, hóspede e valores da reserva."
                disabled={!podeGerenciar}
                eyebrow="Cadastro"
                size="xl"
                title="Nova reserva manual"
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
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            <Resumo
              icon={<Clock3 />}
              label="Pendentes"
              valor={String(resumo.pendentes)}
            />
            <Resumo
              icon={<CalendarCheck2 />}
              label="Confirmadas"
              valor={String(resumo.confirmadas)}
            />
            <Resumo
              icon={<ShieldCheck />}
              label="Hospedados"
              valor={String(resumo.hospedadas)}
            />
            <Resumo label="Canceladas" valor={String(resumo.canceladas)} />
            <Resumo label="Concluidas" valor={String(resumo.concluidas)} />
            <Resumo
              label="Pagamentos pendentes"
              valor={String(resumo.pagamentosPendentes)}
            />
            <Resumo
              label="Pagamentos recebidos"
              valor={String(resumo.pagamentosRecebidos)}
            />
          </div>
        </div>
      </section>

      <Card className="admin-glass-card">
        <CardContent className="p-5">
          <form
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-[1fr_0.75fr_0.85fr_0.95fr_0.75fr_0.7fr_0.7fr_auto]"
          >
            <CampoTexto
              defaultValue={filtros.busca ?? ""}
              label="Busca"
              name="busca"
              placeholder="Código, hóspede, telefone..."
            />
            <CampoStatus defaultValue={filtros.status ?? "todos"} />
            <CampoPagamento defaultValue={filtros.pagamento ?? "todos"} />
            <CampoPropriedade
              defaultValue={filtros.propriedadeId ?? ""}
              propriedades={propriedades}
            />
            <CampoOrigem defaultValue={filtros.origem ?? "todos"} />
            <CampoData
              defaultValue={filtros.dataInicio ?? ""}
              label="Entrada a partir"
              name="dataInicio"
            />
            <CampoData
              defaultValue={filtros.dataFim ?? ""}
              label="Saida ate"
              name="dataFim"
            />
            <div className="flex items-end">
              <Button className="w-full" type="submit" variant="outline">
                <Search />
                Filtrar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <ReservationGrid
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

function Resumo({
  icon,
  label,
  valor,
}: {
  icon?: ReactNode;
  label: string;
  valor: string;
}) {
  return (
    <div className="min-w-32 rounded-lg border bg-background/55 p-3 text-sm">
      {icon ? (
        <div className="mb-2 text-primary [&_svg]:h-4 [&_svg]:w-4">{icon}</div>
      ) : null}
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate font-semibold">{valor}</p>
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
  label,
  name,
  placeholder,
}: {
  defaultValue?: string;
  label: string;
  name: string;
  placeholder?: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        defaultValue={defaultValue}
        id={name}
        name={name}
        placeholder={placeholder}
      />
    </div>
  );
}

function CampoStatus({ defaultValue }: { defaultValue: string }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="status">Status</Label>
      <select
        className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        defaultValue={defaultValue}
        id="status"
        name="status"
      >
        <option value="todos">Todos</option>
        {STATUS_RESERVA.map((status) => (
          <option key={status} value={status}>
            {LABEL_STATUS_RESERVA[status]}
          </option>
        ))}
      </select>
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

function CampoData({
  defaultValue,
  label,
  name,
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
