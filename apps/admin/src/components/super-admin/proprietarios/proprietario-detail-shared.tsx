import type { ReactNode } from "react";

import { Badge } from "@hospedex/ui";

import type { ProprietarioCompleto } from "../../../lib/super-admin/proprietarios/types";

/** Elementos e formatadores compartilhados pelas abas de um proprietario. */

export function CabecalhoAba({
  descricao,
  icon,
  titulo
}: {
  descricao: string;
  icon: ReactNode;
  titulo: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-300/25 bg-cyan-500/10 text-cyan-700 dark:text-cyan-200 [&_svg]:h-5 [&_svg]:w-5">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold">{titulo}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{descricao}</p>
      </div>
    </div>
  );
}

export function Info({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="min-w-0 rounded-xl border bg-background/45 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold">{valor}</p>
    </div>
  );
}

export function EstadoVazio({ texto }: { texto: string }) {
  return (
    <div className="rounded-xl border border-dashed bg-background/35 p-6 text-center">
      <Badge variant="outline">Estado vazio</Badge>
      <p className="mt-3 text-sm text-muted-foreground">{texto}</p>
    </div>
  );
}

export function obterStatusLicenca(proprietario: ProprietarioCompleto) {
  const licenca = proprietario.license;
  if (!licenca) return "Sem licenca";
  if (licenca.status !== "active" || !licenca.expires_at) return labelLicenca(licenca.status);

  const dias = Math.ceil(
    (new Date(`${licenca.expires_at}T23:59:59`).getTime() - Date.now()) / 86_400_000
  );
  if (dias < 0) return "Vencida";
  if (dias <= 30) return "Vencendo";
  return "Ativa";
}

export function lerLimites(proprietario: ProprietarioCompleto) {
  const limites = proprietario.license?.limits;
  const objeto = limites && typeof limites === "object" && !Array.isArray(limites) ? limites : {};
  const propriedades = lerNumero(objeto, "max_properties") ?? proprietario.plan?.max_properties ?? 0;
  const unidades = lerNumero(objeto, "max_units") ?? proprietario.plan?.max_units ?? 0;
  const funcionarios = lerNumero(objeto, "max_staff");

  return {
    funcionarios: funcionarios === null ? "Nao definido" : String(funcionarios),
    propriedades,
    unidades
  };
}

function lerNumero(objeto: Record<string, unknown>, chave: string) {
  const valor = objeto[chave];
  return typeof valor === "number" ? valor : null;
}

export function labelTenant(status: ProprietarioCompleto["tenant"]["status"]) {
  return {
    active: "Ativo",
    cancelled: "Cancelado",
    past_due: "Pendente",
    suspended: "Bloqueado",
    trial: "Trial"
  }[status];
}

export function labelLicenca(status: NonNullable<ProprietarioCompleto["license"]>["status"]) {
  return {
    active: "Ativa",
    cancelled: "Cancelada",
    expired: "Vencida",
    suspended: "Bloqueada",
    trial: "Trial"
  }[status];
}

export function labelModulo(chave: string) {
  const labels: Record<string, string> = {
    api_future: "API futura",
    calendar: "Calendario",
    cleaning: "Limpeza",
    confirmations: "Confirmacoes",
    extra_services: "Servicos extras",
    integrations: "Integracoes",
    inventory: "Inventario",
    notifications: "Notificacoes",
    payments: "Financeiro",
    regional_guide: "Guia da regiao",
    reports: "Relatorios",
    staff: "Funcionarios"
  };
  return labels[chave] ?? chave;
}

export function traduzirAcao(acao: string) {
  const labels: Record<string, string> = {
    "super_admin.integration.disabled": "Integracao desativada",
    "super_admin.integration.enabled": "Integracao liberada",
    "super_admin.module.disabled": "Modulo desativado",
    "super_admin.module.enabled": "Modulo liberado",
    "super_admin.owner.ativar": "Acesso do proprietario liberado",
    "super_admin.owner.bloquear": "Acesso do proprietario bloqueado",
    "super_admin.owner.created": "Proprietario criado",
    "super_admin.owner.updated": "Proprietario atualizado"
  };
  return labels[acao] ?? acao;
}

export function formatarData(valor: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(valor));
}

export function formatarDataHora(valor: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(valor));
}

export function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" }).format(valor);
}
