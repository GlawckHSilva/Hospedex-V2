import { type PropertyRow } from "@hospedex/types";
import { Eye, Plus } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Badge, Card, CardContent, cn } from "@hospedex/ui";

import {
  LABEL_ORIGEM_RESERVA,
  LABEL_STATUS_PAGAMENTO_RESERVA,
  LABEL_STATUS_RESERVA,
  obterVariantStatusPagamentoReserva,
  obterVariantStatusReserva,
  reservaPermiteAcoesFinanceiras,
  type ReservaComRelacionamentos,
} from "../../lib/reservations/types";
import { EmptyState } from "../management/entity-card";
import { EntityModal } from "../management/entity-modal";
import { ReservationActionMenu } from "./reservation-action-menu";
import { ReservationCard } from "./reservation-card";
import { ReservationDetails } from "./reservation-details";
import { ReservationForm } from "./reservation-form";

type ReservationGridProps = {
  existemFiltrosAtivos: boolean;
  podeGerenciar: boolean;
  podeGerenciarPagamento: boolean;
  propriedades: PropertyRow[];
  reservas: ReservaComRelacionamentos[];
};

/**
 * Lista de Reservas.
 *
 * No desktop a tela vira uma central de gestao em formato de tabela. No mobile,
 * usamos cards compactos apenas para leitura, mantendo acoes operacionais nos
 * modais e evitando repetir o padrao de acao rapida da tela de Pendencias.
 */
export function ReservationGrid({
  existemFiltrosAtivos,
  podeGerenciar,
  podeGerenciarPagamento,
  propriedades,
  reservas,
}: ReservationGridProps) {
  if (reservas.length === 0) {
    return (
      <EmptyState
        action={
          existemFiltrosAtivos ? (
            <Link
              className="inline-flex h-9 items-center justify-center rounded-lg border border-cyan-400/35 bg-cyan-500/10 px-4 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-500/15 dark:text-cyan-200"
              href="/reservas"
            >
              Limpar filtros
            </Link>
          ) : (
            <EntityModal
              description="Informe casa, período, hóspede e valores da reserva."
              disabled={!podeGerenciar}
              eyebrow="Cadastro"
              size="xl"
              title="Nova reserva manual"
              triggerIcon={<Plus className="h-4 w-4" />}
              triggerLabel="Criar reserva manual"
              triggerVariant="default"
            >
              <ReservationForm
                modo="criar"
                podeGerenciar={podeGerenciar}
                propriedades={propriedades}
              />
            </EntityModal>
          )
        }
        description={
          existemFiltrosAtivos
            ? "Limpe os filtros ou altere a busca para localizar outras reservas."
            : "Quando houver reservas, elas aparecerão aqui."
        }
        title={
          existemFiltrosAtivos
            ? "Nenhuma reserva encontrada com esses filtros"
            : "Nenhuma reserva encontrada"
        }
      />
    );
  }

  return (
    <>
      <Card className="admin-glass-card hidden overflow-hidden lg:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-sm">
              <thead className="border-b border-border/70 bg-background/55 text-left text-xs font-semibold text-muted-foreground">
                <tr>
                  <Th>Código</Th>
                  <Th>Hóspede</Th>
                  <Th>Casa</Th>
                  <Th>Período</Th>
                  <Th>Status</Th>
                  <Th>Pagamento</Th>
                  <Th className="text-right">Total</Th>
                  <Th className="text-right">Ações</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {reservas.map((reserva) => (
                  <LinhaReserva
                    key={reserva.id}
                    podeGerenciar={podeGerenciar}
                    podeGerenciarPagamento={podeGerenciarPagamento}
                    propriedades={propriedades}
                    reserva={reserva}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 lg:hidden">
        {reservas.map((reserva) => (
          <ReservationCard
            key={reserva.id}
            podeGerenciar={podeGerenciar}
            podeGerenciarPagamento={podeGerenciarPagamento}
            propriedades={propriedades}
            reserva={reserva}
          />
        ))}
      </div>
    </>
  );
}

function LinhaReserva({
  podeGerenciar,
  podeGerenciarPagamento,
  propriedades,
  reserva,
}: {
  podeGerenciar: boolean;
  podeGerenciarPagamento: boolean;
  propriedades: PropertyRow[];
  reserva: ReservaComRelacionamentos;
}) {
  const hospedePrincipal =
    reserva.hospedes.find((hospede) => hospede.is_primary) ??
    reserva.hospedes[0];
  const nomeHospede = hospedePrincipal?.full_name ?? "Sem hóspede";
  const podeOperarFinanceiro =
    podeGerenciarPagamento && reservaPermiteAcoesFinanceiras(reserva.status);
  const totalDiarias = calcularDiarias(reserva.check_in, reserva.check_out);

  return (
    <tr className="transition-colors hover:bg-cyan-500/5">
      <Td>
        <div className="min-w-0 max-w-36">
          <p className="truncate font-mono text-xs font-semibold text-foreground">
            {reserva.code}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {LABEL_ORIGEM_RESERVA[reserva.source]}
          </p>
        </div>
      </Td>
      <Td>
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cyan-400/25 bg-cyan-500/15 text-xs font-semibold text-cyan-700 dark:text-cyan-100">
            {obterIniciais(nomeHospede)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium">{nomeHospede}</p>
            <p className="truncate text-xs text-muted-foreground">
              {hospedePrincipal?.phone ?? "Telefone não informado"}
            </p>
          </div>
        </div>
      </Td>
      <Td>
        {reserva.propriedade ? (
          <span className="font-medium">{reserva.propriedade.name}</span>
        ) : (
          <Badge variant="outline">Casa removida</Badge>
        )}
      </Td>
      <Td>
        <div className="min-w-0">
          <p className="font-medium">{`${formatarData(reserva.check_in)} - ${formatarData(reserva.check_out)}`}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {totalDiarias} {totalDiarias === 1 ? "diária" : "diárias"}
          </p>
        </div>
      </Td>
      <Td>
        <Badge className="whitespace-nowrap" variant={obterVariantStatusReserva(reserva.status)}>
          {LABEL_STATUS_RESERVA[reserva.status]}
        </Badge>
      </Td>
      <Td>
        <Badge
          className="whitespace-nowrap"
          variant={obterVariantStatusPagamentoReserva(reserva.statusPagamento)}
        >
          {LABEL_STATUS_PAGAMENTO_RESERVA[reserva.statusPagamento]}
        </Badge>
      </Td>
      <Td className="text-right font-semibold text-cyan-700 dark:text-cyan-200">
        {formatarMoeda(reserva.valorTotalComExtras)}
      </Td>
      <Td>
        <div className="flex justify-end gap-2">
          <EntityModal
            description="Dados consolidados, hóspede, casa, período, valores, financeiro e timeline."
            eyebrow="Visualização"
            size="xl"
            title={`Reserva ${reserva.code}`}
            triggerAction="view"
            triggerClassName="h-9 justify-center whitespace-nowrap"
            triggerIcon={<Eye className="h-4 w-4" />}
            triggerLabel="Ver detalhes"
          >
            <ReservationDetails
              podeGerenciarPagamento={podeOperarFinanceiro}
              reserva={reserva}
            />
          </EntityModal>

          <ReservationActionMenu
            podeGerenciar={podeGerenciar}
            podeGerenciarPagamento={podeOperarFinanceiro}
            propriedades={propriedades}
            reserva={reserva}
          />
        </div>
      </Td>
    </tr>
  );
}

function Th({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <th className={cn("px-4 py-3", className)}>{children}</th>;
}

function Td({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <td className={cn("px-4 py-3 align-middle", className)}>{children}</td>;
}

function obterIniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  const primeira = partes[0]?.[0] ?? "H";
  const segunda = partes.length > 1 ? partes[partes.length - 1]?.[0] : "";
  return `${primeira}${segunda}`.toUpperCase();
}

function calcularDiarias(checkIn: string, checkOut: string): number {
  const entrada = new Date(`${checkIn}T00:00:00`);
  const saida = new Date(`${checkOut}T00:00:00`);
  const diferenca = saida.getTime() - entrada.getTime();
  return Math.max(1, Math.round(diferenca / 86_400_000));
}

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(valor);
}

function formatarData(valor: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(
    new Date(`${valor}T00:00:00`),
  );
}
