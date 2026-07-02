"use client";

import { AlertTriangle, Inbox, MailCheck, MailX, Settings, Send } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { Badge, FadeIn, PremiumEmptyState, cn } from "@hospedex/ui";

import type { DadosCentralEmail, SearchParamsTemplatesEmail } from "../../lib/email-templates/types";
import { ActionButton } from "../management/action-button";
import { ModuleToast } from "../admin/module-toast";

type AbaEmail = "geral" | "enviados" | "recebidos" | "falhas" | "configuracao";

const ABAS: Array<{ chave: AbaEmail; label: string }> = [
  { chave: "geral", label: "Visão geral" },
  { chave: "enviados", label: "Enviados" },
  { chave: "recebidos", label: "Recebidos" },
  { chave: "falhas", label: "Falhas" },
  { chave: "configuracao", label: "Configuração" },
];

/** Central de e-mail com status do provedor e logs do tenant autenticado. */
export function EmailModule({
  configuracao,
  erro,
  erroCarregamento,
  logs,
  resumo,
  sucesso,
  tenantNome,
}: DadosCentralEmail & SearchParamsTemplatesEmail) {
  const [aba, setAba] = useState<AbaEmail>("geral");
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 3200);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  return (
    <FadeIn className="space-y-5">
      <ModuleToast erro={erro ?? erroCarregamento ?? undefined} sucesso={sucesso} />
      {feedback ? (
        <div className="fixed right-4 top-4 z-50 max-w-sm rounded-lg border border-cyan-300/30 bg-cyan-500/15 px-4 py-3 text-sm text-cyan-100 shadow-lg backdrop-blur">
          {feedback}
        </div>
      ) : null}

      <section className="admin-glass-panel p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <Badge variant="info">Comunicação por e-mail</Badge>
            <h1 className="mt-3 text-2xl font-semibold tracking-normal">E-mail</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Acompanhe mensagens enviadas aos hóspedes e notificações do sistema.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Resumo icon={<MailCheck />} label="Enviados" valor={resumo.enviados} />
            <Resumo icon={<MailX />} label="Falhas" valor={resumo.falhas} />
            <Resumo icon={<Inbox />} label="Recebidos" valor={resumo.recebidos} />
            <Resumo icon={<Send />} label="Templates de hóspedes ativos" valor={resumo.templatesAtivos} />
          </div>
        </div>
      </section>

      <section className="admin-glass-panel p-4">
        <div className="flex flex-wrap gap-2">
          {ABAS.map((item) => (
            <button
              className={cn(
                "rounded-lg border px-4 py-2 text-sm font-semibold transition",
                aba === item.chave
                  ? "border-cyan-300/70 bg-cyan-500/15 text-cyan-100"
                  : "border-slate-800 bg-slate-950/45 text-slate-400 hover:border-cyan-400/40 hover:text-slate-100",
              )}
              key={item.chave}
              onClick={() => setAba(item.chave)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-5">
          {aba === "geral" ? (
            <VisaoGeral configuracao={configuracao} tenantNome={tenantNome} />
          ) : null}
          {aba === "enviados" ? (
            <ListaLogsEmail
              emptyDescription="Envios de teste e envios futuros aparecerão aqui."
              emptyTitle="Nenhum e-mail enviado ainda"
              icon={<MailCheck className="h-5 w-5" />}
              logs={logs.filter((log) => ["sent", "test"].includes(log.status))}
            />
          ) : null}
          {aba === "recebidos" ? (
            <PremiumEmptyState
              description="Futuramente, respostas recebidas poderão aparecer aqui após configuração de domínio."
              icon={<Inbox className="h-5 w-5" />}
              title="Recebimento de e-mails ainda não configurado"
            />
          ) : null}
          {aba === "falhas" ? (
            <ListaLogsEmail
              emptyDescription="Erros de configuração e falhas do provedor aparecerão aqui."
              emptyTitle="Nenhuma falha registrada"
              icon={<AlertTriangle className="h-5 w-5" />}
              logs={logs.filter((log) => ["failed", "not_configured"].includes(log.status))}
            />
          ) : null}
          {aba === "configuracao" ? (
            <ConfiguracaoEmail configuracao={configuracao} onFeedback={setFeedback} />
          ) : null}
        </div>
      </section>
    </FadeIn>
  );
}

function VisaoGeral({
  configuracao,
  tenantNome,
}: {
  configuracao: DadosCentralEmail["configuracao"];
  tenantNome: string;
}) {
  const itens = [
    ["E-mails para hóspedes", "Usam templates editáveis pelo proprietário."],
    [
      "Notificações para proprietário",
      "Usam modelos padrão do Hospedex e não aparecem no editor de hóspedes.",
    ],
    ["Status", labelStatusProvedor(configuracao.providerStatus)],
    ["Templates configurados", `Modelos de hóspedes de ${tenantNome} usam padrões seguros.`],
    [
      "Modo atual",
      configuracao.mode === "test"
        ? "Modo teste: sem envio automático real para hóspedes."
        : "Modo produção: preparado para envios reais controlados.",
    ],
  ];

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {itens.map(([titulo, descricao]) => (
        <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-4" key={titulo}>
          <p className="font-semibold">{titulo}</p>
          <p className="mt-2 text-sm text-muted-foreground">{descricao}</p>
        </div>
      ))}
    </div>
  );
}

function ConfiguracaoEmail({
  configuracao,
  onFeedback,
}: {
  configuracao: DadosCentralEmail["configuracao"];
  onFeedback: (mensagem: string) => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-4">
        <h2 className="font-semibold">Configuração</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Info
            label="RESEND_API_KEY configurada"
            valor={configuracao.apiKeyConfigured ? "Sim" : "Não"}
          />
          <Info
            label="EMAIL_FROM configurado"
            valor={configuracao.fromConfigured ? "Sim" : "Não"}
          />
          <Info label="Modo" valor={configuracao.mode === "test" ? "Teste" : "Produção"} />
          <Info label="Remetente atual" valor={configuracao.currentFrom || "Não configurado"} />
          <Info
            label="E-mail de teste"
            valor={configuracao.testRecipient ?? "E-mail do proprietário logado"}
          />
          <Info label="Mensagens para hóspedes" valor="Templates editáveis preparados" />
          <Info label="Status da integração" valor={labelStatusProvedor(configuracao.providerStatus)} />
          <Info label="Recebimento" valor="Ainda não configurado" />
        </div>
      </div>
      <div className="rounded-xl border border-cyan-300/20 bg-cyan-500/10 p-4">
        <Settings className="h-5 w-5 text-cyan-200" />
        <p className="mt-3 text-sm text-cyan-100">
          {configuracao.apiKeyConfigured
            ? "Use a tela de templates para enviar um e-mail real de teste. Em modo teste, nenhum disparo automático é feito para hóspedes."
            : "Para enviar testes reais, configure RESEND_API_KEY no Vercel e faça um novo deploy."}
        </p>
        {!configuracao.apiKeyConfigured ? (
          <div className="mt-3 rounded-lg border border-amber-300/30 bg-amber-500/10 p-3 text-xs leading-5 text-amber-100">
            Variáveis mínimas: RESEND_API_KEY, EMAIL_MODE=test e EMAIL_FROM=Hospedex &lt;onboarding@resend.dev&gt;.
          </div>
        ) : null}
        <ActionButton
          className="mt-4 w-full"
          onClick={() => onFeedback("Envie testes pela tela Templates de e-mail.")}
          variant="settings"
        >
          Ver orientação
        </ActionButton>
      </div>
    </div>
  );
}

function ListaLogsEmail({
  emptyDescription,
  emptyTitle,
  icon,
  logs,
}: {
  emptyDescription: string;
  emptyTitle: string;
  icon: ReactNode;
  logs: DadosCentralEmail["logs"];
}) {
  if (!logs.length) {
    return (
      <PremiumEmptyState
        description={emptyDescription}
        icon={icon}
        title={emptyTitle}
      />
    );
  }

  return (
    <div className="grid gap-3">
      {logs.map((log) => (
        <article
          className="rounded-xl border border-slate-800 bg-slate-950/45 p-4"
          key={`${log.createdAt}-${log.recipientEmail}-${log.templateKey}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold">{log.subject}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {log.templateKey ?? "Sem template"} · {log.recipientEmail}
              </p>
            </div>
            <Badge variant={variantStatusLog(log.status)}>{labelStatusLog(log.status)}</Badge>
          </div>
          <div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-3">
            <span>Público: {log.audience === "guest" ? "Hóspede" : "Proprietário"}</span>
            <span>Data: {new Date(log.createdAt).toLocaleString("pt-BR")}</span>
            {log.errorMessage ? <span>Erro: {mensagemCurta(log.errorMessage)}</span> : null}
          </div>
        </article>
      ))}
    </div>
  );
}

function Info({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
      <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold">{valor}</p>
    </div>
  );
}

function Resumo({
  icon,
  label,
  valor,
}: {
  icon: ReactNode;
  label: string;
  valor: number;
}) {
  return (
    <div className="min-w-32 rounded-xl border border-slate-800 bg-slate-950/45 p-4">
      <div className="mb-3 text-cyan-300 [&_svg]:h-5 [&_svg]:w-5">{icon}</div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{valor}</p>
    </div>
  );
}

function labelStatusProvedor(status: DadosCentralEmail["configuracao"]["providerStatus"]) {
  if (status === "active") return "Ativo";
  if (status === "test") return "Modo teste";
  return "Não configurado";
}

function labelStatusLog(status: DadosCentralEmail["logs"][number]["status"]) {
  const labels: Record<DadosCentralEmail["logs"][number]["status"], string> = {
    failed: "Falha",
    not_configured: "Não configurado",
    pending: "Pendente",
    sent: "Enviado",
    skipped: "Ignorado",
    test: "Teste enviado",
  };

  return labels[status];
}

function variantStatusLog(status: DadosCentralEmail["logs"][number]["status"]) {
  if (status === "sent" || status === "test") return "success";
  if (status === "failed" || status === "not_configured") return "danger";
  return "warning";
}

function mensagemCurta(mensagem: string) {
  if (/modo teste|autorizado na conta resend/i.test(mensagem)) {
    return "Restrição do modo teste do Resend.";
  }

  return mensagem.length > 90 ? `${mensagem.slice(0, 90)}...` : mensagem;
}
