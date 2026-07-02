"use client";

import {
  AlertTriangle,
  Copy,
  Mail,
  Pencil,
  RotateCcw,
  Save,
  Search,
  Send,
  SlidersHorizontal,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { Badge, FadeIn, cn } from "@hospedex/ui";

import {
  restaurarTemplateEmailPadraoAction,
  restaurarTodosTemplatesEmailPadraoAction,
  salvarTemplateEmailAction,
} from "../../lib/email-templates/actions";
import { obterVariaveisPermitidas, renderizarTemplatePreview, validarTemplateEmail } from "../../lib/email-templates/validation";
import type {
  DadosTemplatesEmail,
  EmailTemplate,
  SearchParamsTemplatesEmail,
} from "../../lib/email-templates/types";
import { ActionButton } from "../management/action-button";
import { FormActionButton } from "../management/form-submit-button";
import { ModuleToast } from "../admin/module-toast";

const MENSAGENS_SUCESSO: Record<string, string> = {
  "modelo-restaurado": "Modelo restaurado para o padrao.",
  "modelo-salvo": "Modelo de e-mail salvo.",
  "padroes-restaurados": "Padroes restaurados.",
};

type StatusFiltro = "todos" | "ativos" | "inativos" | "alterados" | "erro";

type DraftTemplate = {
  body: string;
  buttonText: string;
  buttonUrl: string;
  description: string;
  isActive: boolean;
  name: string;
  subject: string;
  title: string;
};

/** Tela de personalizacao de modelos de e-mail do tenant autenticado. */
export function EmailTemplatesModule({
  erro,
  erroCarregamento,
  podeGerenciar,
  resumo,
  sucesso,
  templates,
}: DadosTemplatesEmail & SearchParamsTemplatesEmail) {
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<StatusFiltro>("todos");
  const [templateSelecionado, setTemplateSelecionado] = useState(
    templates[0]?.key ?? "",
  );
  const [feedbackLocal, setFeedbackLocal] = useState<string | null>(null);
  const selecionado =
    templates.find((template) => template.key === templateSelecionado) ??
    templates[0];
  const [draft, setDraft] = useState<DraftTemplate>(() =>
    criarDraft(selecionado),
  );

  useEffect(() => {
    setDraft(criarDraft(selecionado));
  }, [selecionado]);

  useEffect(() => {
    if (!feedbackLocal) return;
    const timer = window.setTimeout(() => setFeedbackLocal(null), 3200);
    return () => window.clearTimeout(timer);
  }, [feedbackLocal]);

  const validacao = useMemo(
    () =>
      validarTemplateEmail({
        body: draft.body,
        buttonText: draft.buttonText,
        buttonUrl: draft.buttonUrl,
        subject: draft.subject,
        title: draft.title,
      }),
    [draft],
  );
  const templatesFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return templates.filter((template) => {
      const bateBusca =
        !termo ||
        template.name.toLowerCase().includes(termo) ||
          template.description.toLowerCase().includes(termo);
      const bateStatus =
        status === "todos" ||
        (status === "ativos" && template.isActive) ||
        (status === "inativos" && !template.isActive) ||
        (status === "alterados" && template.isCustomized) ||
        (status === "erro" && Boolean(template.lastValidationError));

      return bateBusca && bateStatus;
    });
  }, [busca, status, templates]);

  function selecionar(template: EmailTemplate, mensagem?: string) {
    setTemplateSelecionado(template.key);
    if (mensagem) setFeedbackLocal(mensagem);
  }

  function bloquearSalvarInvalido(evento: React.FormEvent<HTMLFormElement>) {
    if (validacao.valido) return;
    evento.preventDefault();
    setFeedbackLocal(validacao.erros[0] ?? "Corrija o modelo antes de salvar.");
  }

  return (
    <FadeIn className="space-y-5">
      <ModuleToast
        erro={erro ?? erroCarregamento ?? undefined}
        mensagensSucesso={MENSAGENS_SUCESSO}
        sucesso={sucesso}
      />
      {feedbackLocal ? (
        <div className="fixed right-4 top-4 z-50 max-w-sm rounded-lg border border-cyan-300/30 bg-cyan-500/15 px-4 py-3 text-sm text-cyan-100 shadow-lg backdrop-blur">
          {feedbackLocal}
        </div>
      ) : null}

      <section className="admin-glass-panel p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">
              Templates de e-mail
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Personalize os textos enviados automaticamente pelo Hospedex.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <ActionButton
              icon={<Mail />}
              onClick={() => {
                const teste = templates.find((template) => template.key === "email_teste");
                if (teste) selecionar(teste, "Novo modelo livre fica preparado para a proxima etapa.");
              }}
              type="button"
              variant="add"
            >
              Novo modelo
            </ActionButton>
            <form
              action={restaurarTodosTemplatesEmailPadraoAction}
              onSubmit={(evento) => {
                if (!window.confirm("Restaurar todos os modelos padrao?")) {
                  evento.preventDefault();
                }
              }}
            >
              <FormActionButton
                disabled={!podeGerenciar}
                icon={<RotateCcw />}
                pendingLabel="Restaurando..."
                variant="settings"
              >
                Restaurar padroes
              </FormActionButton>
            </form>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Resumo icon={<Mail />} label="Modelos ativos" valor={resumo.ativos} detalhe={`De ${resumo.total} modelos`} />
          <Resumo icon={<Pencil />} label="Alterados" valor={resumo.alterados} detalhe="Nos ultimos ajustes" />
          <Resumo icon={<Send />} label="E-mails" valor={resumo.canalPrincipal} detalhe="Canal principal" />
          <Resumo icon={<AlertTriangle />} label="Erros de variavel" valor={resumo.errosVariavel} detalhe="Modelos bloqueados" />
        </div>
      </section>

      <section className="admin-glass-panel grid gap-3 p-4 lg:grid-cols-[1fr_180px_180px_auto]">
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="h-10 w-full rounded-lg border border-slate-700/80 bg-slate-950/60 pl-9 pr-3 text-sm text-white outline-none transition focus:border-cyan-300/70"
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder="Buscar por nome do modelo..."
            value={busca}
          />
        </label>
        <select
          className="h-10 rounded-lg border border-slate-700/80 bg-slate-950/60 px-3 text-sm text-white outline-none transition focus:border-cyan-300/70"
          disabled
          value="email"
        >
          <option value="email">Canal: E-mail</option>
        </select>
        <select
          className="h-10 rounded-lg border border-slate-700/80 bg-slate-950/60 px-3 text-sm text-white outline-none transition focus:border-cyan-300/70"
          onChange={(evento) => setStatus(evento.target.value as StatusFiltro)}
          value={status}
        >
          <option value="todos">Status: Todos</option>
          <option value="ativos">Ativos</option>
          <option value="inativos">Inativos</option>
          <option value="alterados">Alterados</option>
          <option value="erro">Com erro</option>
        </select>
        <ActionButton icon={<SlidersHorizontal />} type="button" variant="settings">
          Filtrar
        </ActionButton>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.9fr)]">
        <div className="space-y-3">
          {templatesFiltrados.map((template) => (
            <TemplateCard
              key={template.key}
              onSelecionar={selecionar}
              podeGerenciar={podeGerenciar}
              selecionado={template.key === selecionado?.key}
              template={template}
            />
          ))}
        </div>

        {selecionado ? (
          <form
            action={salvarTemplateEmailAction}
            className="admin-glass-panel grid gap-4 p-4 2xl:grid-cols-[minmax(0,1fr)_340px]"
            onSubmit={bloquearSalvarInvalido}
          >
            <input name="templateKey" type="hidden" value={selecionado.key} />
            <input name="description" type="hidden" value={draft.description} />
            <input name="isActive" type="hidden" value={String(draft.isActive)} />

            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">{draft.name}</h2>
                <Badge variant="info">E-mail</Badge>
                {draft.isActive ? <Badge variant="success">Ativo</Badge> : <Badge variant="warning">Inativo</Badge>}
                {selecionado.isCustomized ? <Badge variant="warning">Alterado</Badge> : null}
              </div>

              <CampoTexto label="Nome do modelo" name="name" onChange={(valor) => setDraft((atual) => ({ ...atual, name: valor }))} value={draft.name} />
              <CampoTexto label="Assunto" name="subject" onChange={(valor) => setDraft((atual) => ({ ...atual, subject: valor }))} value={draft.subject} />
              <CampoTexto label="Titulo" name="title" onChange={(valor) => setDraft((atual) => ({ ...atual, title: valor }))} value={draft.title} />

              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Corpo da mensagem
                </span>
                <textarea
                  className="min-h-52 w-full resize-y rounded-lg border border-slate-700/80 bg-slate-950/60 px-3 py-3 text-sm leading-6 text-white outline-none transition focus:border-cyan-300/70"
                  name="body"
                  onChange={(evento) => setDraft((atual) => ({ ...atual, body: evento.target.value }))}
                  value={draft.body}
                />
              </label>

              <div className="grid gap-3 md:grid-cols-2">
                <CampoTexto label="Texto do botao" name="buttonText" onChange={(valor) => setDraft((atual) => ({ ...atual, buttonText: valor }))} value={draft.buttonText} />
                <CampoTexto label="Link do botao" name="buttonUrl" onChange={(valor) => setDraft((atual) => ({ ...atual, buttonUrl: valor }))} value={draft.buttonUrl} />
              </div>

              <label className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/45 p-3 text-sm">
                <input
                  checked={draft.isActive}
                  className="h-4 w-4 accent-cyan-400"
                  onChange={(evento) => setDraft((atual) => ({ ...atual, isActive: evento.target.checked }))}
                  type="checkbox"
                />
                Este modelo esta ativo e sera enviado automaticamente quando o provedor estiver configurado.
              </label>

              {!validacao.valido ? (
                <div className="rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
                  {validacao.erros[0]}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2 border-t border-slate-800 pt-4">
                <ActionButton
                  onClick={() => setDraft(criarDraft(selecionado))}
                  type="button"
                  variant="cancel"
                >
                  Cancelar
                </ActionButton>
                <ActionButton
                  icon={<Send />}
                  onClick={() => setFeedbackLocal("Envio de teste preparado. Provedor de e-mail ainda nao configurado.")}
                  type="button"
                  variant="view"
                >
                  Enviar teste
                </ActionButton>
                <FormActionButton
                  disabled={!podeGerenciar || !validacao.valido}
                  icon={<Save />}
                  pendingLabel="Salvando..."
                  variant="add"
                >
                  Salvar modelo
                </FormActionButton>
              </div>
            </div>

            <aside className="space-y-3">
              <VariaveisDisponiveis onCopiar={setFeedbackLocal} />
              <PreviewEmail draft={draft} />
            </aside>
          </form>
        ) : null}
      </section>
    </FadeIn>
  );
}

function TemplateCard({
  onSelecionar,
  podeGerenciar,
  selecionado,
  template,
}: {
  onSelecionar: (template: EmailTemplate, mensagem?: string) => void;
  podeGerenciar: boolean;
  selecionado: boolean;
  template: EmailTemplate;
}) {
  return (
    <article
      className={cn(
        "rounded-xl border bg-slate-950/45 p-4 transition",
        selecionado
          ? "border-cyan-300/80 shadow-sm shadow-cyan-950/30"
          : "border-slate-800 hover:border-cyan-400/40",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{template.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{template.description}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="info">E-mail</Badge>
          <Badge variant={template.isActive ? "success" : "warning"}>
            {template.isActive ? "Ativo" : "Inativo"}
          </Badge>
          {template.isCustomized ? <Badge variant="warning">Alterado</Badge> : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <ActionButton icon={<Pencil />} onClick={() => onSelecionar(template)} variant="edit">
          Editar
        </ActionButton>
        <ActionButton onClick={() => onSelecionar(template, "Pre-visualizacao atualizada.")} variant="view">
          Pre-visualizar
        </ActionButton>
        <ActionButton
          icon={<Send />}
          onClick={() => onSelecionar(template, "Envio de teste preparado. Provedor ainda nao configurado.")}
          variant="settings"
        >
          Enviar teste
        </ActionButton>
        <form
          action={restaurarTemplateEmailPadraoAction}
          onSubmit={(evento) => {
            if (!window.confirm("Restaurar modelo padrao? As alteracoes personalizadas serao substituidas.")) {
              evento.preventDefault();
            }
          }}
        >
          <input name="templateKey" type="hidden" value={template.key} />
          <FormActionButton
            disabled={!podeGerenciar || !template.isCustomized}
            icon={<RotateCcw />}
            pendingLabel="Restaurando..."
            variant="status"
          >
            Restaurar padrao
          </FormActionButton>
        </form>
      </div>
    </article>
  );
}

function CampoTexto({
  label,
  name,
  onChange,
  value,
}: {
  label: string;
  name: string;
  onChange: (valor: string) => void;
  value: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </span>
      <input
        className="h-10 w-full rounded-lg border border-slate-700/80 bg-slate-950/60 px-3 text-sm text-white outline-none transition focus:border-cyan-300/70"
        name={name}
        onChange={(evento) => onChange(evento.target.value)}
        value={value}
      />
    </label>
  );
}

function VariaveisDisponiveis({
  onCopiar,
}: {
  onCopiar: (mensagem: string) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
      <h3 className="font-semibold">Variaveis disponiveis</h3>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 2xl:grid-cols-1">
        {obterVariaveisPermitidas().map((variavel) => {
          const texto = `{{${variavel}}}`;

          return (
            <button
              className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-left text-xs text-slate-300 transition hover:border-cyan-400/50 hover:text-cyan-100"
              key={variavel}
              onClick={() => {
                void navigator.clipboard.writeText(texto);
                onCopiar("Variavel copiada.");
              }}
              type="button"
            >
              <span className="truncate font-mono">{texto}</span>
              <Copy className="h-3.5 w-3.5 shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PreviewEmail({ draft }: { draft: DraftTemplate }) {
  const assunto = renderizarTemplatePreview(draft.subject);
  const titulo = renderizarTemplatePreview(draft.title);
  const corpo = renderizarTemplatePreview(draft.body);
  const botao = renderizarTemplatePreview(draft.buttonText);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
      <h3 className="font-semibold">Pre-visualizacao</h3>
      <div className="mt-3 rounded-lg bg-white p-4 text-slate-950">
        <p className="text-xs font-semibold uppercase text-slate-500">Assunto</p>
        <p className="mt-1 font-semibold">{assunto}</p>
        <div className="mt-4 rounded-lg border border-slate-200 p-4">
          <h4 className="text-lg font-bold">{titulo}</h4>
          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">
            {corpo}
          </p>
          {botao ? (
            <div className="mt-4 rounded-lg bg-cyan-500 px-4 py-2 text-center text-sm font-semibold text-white">
              {botao}
            </div>
          ) : null}
          <p className="mt-4 text-xs text-slate-500">Hospedex - comunicacao automatica.</p>
        </div>
      </div>
    </div>
  );
}

function Resumo({
  detalhe,
  icon,
  label,
  valor,
}: {
  detalhe: string;
  icon: ReactNode;
  label: string;
  valor: number | string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-4">
      <div className="mb-3 text-cyan-300 [&_svg]:h-5 [&_svg]:w-5">{icon}</div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{valor}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detalhe}</p>
    </div>
  );
}

function criarDraft(template: EmailTemplate | undefined): DraftTemplate {
  return {
    body: template?.body ?? "",
    buttonText: template?.buttonText ?? "",
    buttonUrl: template?.buttonUrl ?? "",
    description: template?.description ?? "",
    isActive: template?.isActive ?? true,
    name: template?.name ?? "",
    subject: template?.subject ?? "",
    title: template?.title ?? "",
  };
}
