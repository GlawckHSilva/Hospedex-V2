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
  STATUS_RESERVA,
  type DadosModuloReservas,
  type SearchParamsReservas,
} from "../../lib/reservations/types";
import { ReservationCard } from "./reservation-card";
import { ReservationForm } from "./reservation-form";

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
  "servico-extra": "Serviço extra adicionado.",
  "observacao-adicionada": "Observação adicionada.",
};

export function ReservationModule({
  erro,
  filtros,
  podeGerenciar,
  propriedades,
  reservas,
  resumo,
  sucesso,
  tenantNome,
  unidades,
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
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
          </div>
        </div>
      </section>

      <Card className="admin-glass-card">
        <CardContent className="p-5">
          <form className="grid gap-4 lg:grid-cols-[1fr_0.8fr_0.8fr_0.8fr_0.7fr_0.7fr_auto]">
            <CampoTexto
              defaultValue={filtros.busca ?? ""}
              label="Busca"
              name="busca"
              placeholder="Código, hóspede, telefone..."
            />
            <CampoStatus defaultValue={filtros.status ?? "todos"} />
            <CampoPropriedade
              defaultValue={filtros.propriedadeId ?? ""}
              propriedades={propriedades}
            />
            <CampoUnidadeFiltro
              defaultValue={filtros.unidadeId ?? ""}
              unidades={unidades}
            />
            <CampoData
              defaultValue={filtros.dataInicio ?? ""}
              label="Entrada"
              name="dataInicio"
            />
            <CampoData
              defaultValue={filtros.dataFim ?? ""}
              label="Saida"
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

      <Card className="admin-glass-card">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">Cadastro de reserva</h2>
            <p className="text-sm text-muted-foreground">
              Abra o modal para registrar uma reserva manual.
            </p>
          </div>
          <EntityModal
            description="Informe casa, unidade, período, hóspede e valores da reserva."
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
              unidades={unidades}
            />
          </EntityModal>
        </CardContent>
      </Card>

      {reservas.length > 0 ? (
        <section className="grid gap-5">
          {reservas.map((reserva) => (
            <ReservationCard
              key={reserva.id}
              podeGerenciar={podeGerenciar}
              propriedades={propriedades}
              reserva={reserva}
              unidades={unidades}
            />
          ))}
        </section>
      ) : (
        <Card className="admin-glass-card">
          <CardContent className="p-5 text-sm text-muted-foreground">
            Nenhuma reserva encontrada.
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

function CampoUnidadeFiltro({
  defaultValue,
  unidades,
}: {
  defaultValue: string;
  unidades: Array<{ id: string; name: string }>;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="unidadeId">Unidade</Label>
      <select
        className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        defaultValue={defaultValue}
        id="unidadeId"
        name="unidadeId"
      >
        <option value="">Todas</option>
        {unidades.map((unidade) => (
          <option key={unidade.id} value={unidade.id}>
            {unidade.name}
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
