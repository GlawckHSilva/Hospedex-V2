import {
  CalendarDays,
  Eye,
  Home,
  MoreHorizontal,
  Pencil,
  Trash2
} from "lucide-react";
import type { ReactNode } from "react";

import { Badge, Card, CardContent, cn } from "@hospedex/ui";

import {
  alternarStatusServicoExtraAction,
  atualizarServicoExtraAction,
  excluirServicoExtraAction
} from "../../lib/extra-services/actions";
import {
  LABEL_TIPO_COBRANCA,
  type CasaServicoExtra,
  type ServicoExtraComCasas
} from "../../lib/extra-services/types";
import { ConfirmDialog, EntityModal, EntityViewModal } from "../management/entity-modal";
import { FormActionButton } from "../management/form-submit-button";
import { ExtraServiceForm } from "./extra-service-form";

/**
 * Card compacto de serviço extra.
 *
 * A exclusão nunca remove histórico de reservas: quando o serviço já foi usado,
 * a ação visível orienta a inativar para impedir novos usos sem afetar auditoria.
 */
type ExtraServiceCardProps = {
  casas: CasaServicoExtra[];
  podeGerenciar: boolean;
  servico: ServicoExtraComCasas;
};

export function ExtraServiceCard({
  casas,
  podeGerenciar,
  servico
}: ExtraServiceCardProps) {
  return (
    <Card
      className={cn(
        "admin-glass-card h-full overflow-hidden border-cyan-300/15",
        servico.status === "active" ? "border-l-emerald-400/80" : "border-l-slate-500/80",
        "border-l-2"
      )}
    >
      <CardContent className="flex h-full flex-col gap-3 p-4">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant={servico.status === "active" ? "success" : "secondary"}>
                {servico.status === "active" ? "Ativo" : "Inativo"}
              </Badge>
              <BadgeCobranca tipo={servico.charge_type} />
            </div>

            <h3 className="truncate text-base font-semibold uppercase tracking-normal">
              {servico.name}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {servico.is_required ? "Obrigatório" : "Opcional"}
            </p>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {servico.description ?? descricaoCobranca(servico.charge_type)}
            </p>
          </div>

          <MoreHorizontal className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
        </header>

        <div className="flex items-start justify-between gap-4 border-t border-border pt-3">
          <div className="min-w-0 text-xs text-muted-foreground">
            <p>{descricaoCobranca(servico.charge_type)}</p>
            <p className="mt-1">
              {servico.usadoEmReservas
                ? `${servico.usosEmReservas} uso(s) em reservas`
                : "Ainda não usado em reservas"}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs text-muted-foreground">Valor</p>
            <p className="text-lg font-semibold text-cyan-300">
              {formatarMoeda(Number(servico.amount))}
            </p>
          </div>
        </div>

        <footer className="mt-auto grid gap-3 border-t border-border pt-3">
          <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
            <InfoRodape
              icon={<Home />}
              label="Aplicação"
              valor={formatarAplicacao(servico)}
            />
            <InfoRodape
              icon={<CalendarDays />}
              label="Atualizado em"
              valor={formatarData(servico.updated_at)}
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <VisualizarServico servico={servico} />
            <EditarServico
              casas={casas}
              podeGerenciar={podeGerenciar}
              servico={servico}
            />
            <ApagarServico podeGerenciar={podeGerenciar} servico={servico} />
          </div>
        </footer>
      </CardContent>
    </Card>
  );
}

function VisualizarServico({ servico }: { servico: ServicoExtraComCasas }) {
  return (
    <EntityViewModal
      description="Resumo operacional do adicional no catálogo."
      title={servico.name}
      triggerClassName="h-9 justify-center"
      triggerIcon={<Eye className="h-4 w-4" />}
      triggerLabel="Visualizar"
    >
      <div className="grid gap-4">
        <PainelDetalhe titulo="Serviço">
          <Info label="Nome" valor={servico.name} />
          <Info label="Status" valor={servico.status === "active" ? "Ativo" : "Inativo"} />
          <Info label="Obrigatoriedade" valor={servico.is_required ? "Obrigatório" : "Opcional"} />
          <Info label="Tipo de cobrança" valor={LABEL_TIPO_COBRANCA[servico.charge_type]} />
          <Info label="Valor" valor={formatarMoeda(Number(servico.amount))} />
        </PainelDetalhe>
        <PainelDetalhe titulo="Aplicação">
          <Info label="Escopo" valor={formatarAplicacao(servico)} />
          <Info
            label="Casas"
            valor={
              servico.applies_to_all_properties
                ? "Todas as casas"
                : servico.casas.map((casa) => casa.name).join(", ") || "Nenhuma casa vinculada"
            }
          />
        </PainelDetalhe>
        <PainelDetalhe titulo="Observações">
          <Info label="Descrição" valor={servico.description ?? "Sem descrição."} />
          <Info label="Interna" valor={servico.internal_notes ?? "Sem observação interna."} />
        </PainelDetalhe>
      </div>
    </EntityViewModal>
  );
}

function EditarServico({
  casas,
  podeGerenciar,
  servico
}: {
  casas: CasaServicoExtra[];
  podeGerenciar: boolean;
  servico: ServicoExtraComCasas;
}) {
  return (
    <EntityModal
      description="Atualize preço, cobrança, casas vinculadas e status operacional."
      disabled={!podeGerenciar}
      eyebrow="Edição"
      title="Editar serviço extra"
      triggerAction="edit"
      triggerClassName="h-9 justify-center"
      triggerIcon={<Pencil className="h-4 w-4" />}
      triggerLabel="Editar"
    >
      <ExtraServiceForm
        action={atualizarServicoExtraAction}
        casas={casas}
        modo="editar"
        podeGerenciar={podeGerenciar}
        servico={servico}
      />
    </EntityModal>
  );
}

function ApagarServico({
  podeGerenciar,
  servico
}: {
  podeGerenciar: boolean;
  servico: ServicoExtraComCasas;
}) {
  if (servico.usadoEmReservas) {
    return (
      <ConfirmDialog
        description="Este serviço está vinculado a reservas existentes. Para preservar histórico e relatórios, inative o serviço em vez de apagar."
        disabled={!podeGerenciar}
        title="Não é possível apagar este serviço"
        triggerAction="delete"
        triggerClassName="h-9 justify-center"
        triggerIcon={<Trash2 className="h-4 w-4" />}
        triggerLabel="Apagar"
      >
        <form action={alternarStatusServicoExtraAction} className="grid gap-3">
          <input name="servicoId" type="hidden" value={servico.id} />
          <input name="status" type="hidden" value="inactive" />
          <p className="rounded-xl border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-sm text-muted-foreground">
            Não é possível apagar serviços usados em reservas. Inative o serviço
            para impedir novos usos sem perder o histórico.
          </p>
          <FormActionButton
            disabled={servico.status === "inactive"}
            icon={<Trash2 />}
            pendingLabel="Inativando..."
            variant="status"
          >
            {servico.status === "inactive" ? "Serviço já inativo" : "Inativar serviço"}
          </FormActionButton>
        </form>
      </ConfirmDialog>
    );
  }

  return (
    <ConfirmDialog
      description="Esta ação removerá o serviço extra do catálogo. Serviços vinculados a reservas não podem ser apagados para preservar histórico e relatórios."
      disabled={!podeGerenciar}
      title="Apagar serviço extra?"
      triggerAction="delete"
      triggerClassName="h-9 justify-center"
      triggerIcon={<Trash2 className="h-4 w-4" />}
      triggerLabel="Apagar"
    >
      <form action={excluirServicoExtraAction} className="grid gap-3">
        <input name="servicoId" type="hidden" value={servico.id} />
        <p className="rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-muted-foreground">
          Confirme apenas se este serviço nunca foi usado em reservas. A remoção
          do catálogo será registrada como exclusão lógica.
        </p>
        <FormActionButton icon={<Trash2 />} pendingLabel="Apagando..." variant="delete">
          Apagar serviço
        </FormActionButton>
      </form>
    </ConfirmDialog>
  );
}

function BadgeCobranca({ tipo }: { tipo: ServicoExtraComCasas["charge_type"] }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-xs font-semibold",
        classesCobranca[tipo]
      )}
    >
      {LABEL_TIPO_COBRANCA[tipo]}
    </span>
  );
}

function InfoRodape({
  icon,
  label,
  valor
}: {
  icon: ReactNode;
  label: string;
  valor: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <span className="mt-0.5 text-cyan-300 [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
      <span className="min-w-0">
        <span className="block text-[11px] uppercase tracking-normal">{label}</span>
        <span className="block truncate text-foreground">{valor}</span>
      </span>
    </div>
  );
}

function PainelDetalhe({
  children,
  titulo
}: {
  children: ReactNode;
  titulo: string;
}) {
  return (
    <section className="rounded-xl border bg-background/55 p-4">
      <h3 className="mb-3 text-sm font-semibold">{titulo}</h3>
      <div className="grid gap-3">{children}</div>
    </section>
  );
}

function Info({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-medium">{valor}</p>
    </div>
  );
}

function formatarAplicacao(servico: ServicoExtraComCasas) {
  if (servico.applies_to_all_properties) return "Geral";
  if (servico.casas.length === 1) return servico.casas[0]?.name ?? "Casa específica";
  return `${servico.casas.length} casas`;
}

function descricaoCobranca(tipo: ServicoExtraComCasas["charge_type"]) {
  const descricoes: Record<ServicoExtraComCasas["charge_type"], string> = {
    fixed: "Cobrado valor único por reserva.",
    per_guest: "Cobrado por hóspede da reserva.",
    per_night: "Cobrado por diária da reserva.",
    per_reservation: "Cobrado uma vez por reserva."
  };

  return descricoes[tipo];
}

function formatarData(valor: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(valor));
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency"
  }).format(valor);
}

const classesCobranca: Record<ServicoExtraComCasas["charge_type"], string> = {
  fixed: "border-violet-400/30 bg-violet-500/15 text-violet-200",
  per_guest: "border-blue-400/30 bg-blue-500/15 text-blue-200",
  per_night: "border-cyan-400/30 bg-cyan-500/15 text-cyan-200",
  per_reservation: "border-violet-400/30 bg-violet-500/15 text-violet-200"
};
