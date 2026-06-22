import { Activity, BadgeDollarSign } from "lucide-react";

import type { ProprietarioCompleto } from "../../../lib/super-admin/proprietarios/types";
import {
  CabecalhoAba,
  EstadoVazio,
  Info,
  formatarDataHora,
  formatarMoeda,
  traduzirAcao
} from "./proprietario-detail-shared";

/** Abas de financeiro e rastreabilidade administrativa do tenant. */

export function AbaFinanceiro({ proprietario }: { proprietario: ProprietarioCompleto }) {
  const pagas = proprietario.transactions.filter((item) => item.status === "paid");
  const pendentes = proprietario.transactions.filter((item) => item.status === "pending");
  const totalPago = pagas.reduce((total, item) => total + item.amount, 0);
  const totalPendente = pendentes.reduce((total, item) => total + item.amount, 0);

  return (
    <div className="space-y-4">
      <CabecalhoAba
        descricao="Resumo administrativo baseado nas transacoes existentes do tenant."
        icon={<BadgeDollarSign />}
        titulo="Financeiro"
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Info
          label="Mensalidade"
          valor={proprietario.plan ? formatarMoeda(proprietario.plan.monthly_price) : "Nao definida"}
        />
        <Info label="Cobrancas pagas" valor={`${pagas.length} - ${formatarMoeda(totalPago)}`} />
        <Info
          label="Cobrancas pendentes"
          valor={`${pendentes.length} - ${formatarMoeda(totalPendente)}`}
        />
        <Info label="Comissoes" valor="Nao configuradas" />
        <Info label="Status financeiro" valor={proprietario.subscription?.status ?? "Sem assinatura"} />
      </div>
      {!proprietario.transactions.length ? (
        <EstadoVazio texto="Nenhum historico financeiro encontrado para este tenant." />
      ) : null}
    </div>
  );
}

export function AbaLogs({ proprietario }: { proprietario: ProprietarioCompleto }) {
  return (
    <div className="space-y-4">
      <CabecalhoAba
        descricao="Alteracoes administrativas registradas para este tenant."
        icon={<Activity />}
        titulo="Logs"
      />
      {proprietario.auditLogs.length ? (
        <div className="divide-y rounded-xl border bg-background/40 px-4">
          {proprietario.auditLogs.slice(0, 20).map((registro) => (
            <div className="grid gap-1 py-3 text-sm sm:grid-cols-[1fr_auto]" key={registro.id}>
              <div className="min-w-0">
                <p className="truncate font-medium">{traduzirAcao(registro.action)}</p>
                <p className="text-xs text-muted-foreground">
                  {registro.entity_table ?? "plataforma"}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                {formatarDataHora(registro.created_at)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <EstadoVazio texto="Nenhuma alteracao administrativa registrada para este tenant." />
      )}
    </div>
  );
}
