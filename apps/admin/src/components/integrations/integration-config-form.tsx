"use client";

import { motion } from "framer-motion";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  ShieldCheck,
  TestTube2,
} from "lucide-react";
import { useRef, useState } from "react";

import { Badge, cn } from "@hospedex/ui";

import { salvarConfiguracaoIntegracaoAction } from "../../lib/integrations/actions";
import type { IntegracaoGerenciamento } from "../../lib/integrations/types";
import { ActionButton } from "../management/action-button";
import { IntegrationWizardFields } from "./integration-wizard-fields";

const ETAPAS = [
  { id: 1, label: "Como utilizar" },
  { id: 2, label: "Preferencias" },
  { id: 3, label: "Validacao" },
] as const;

/** Assistente guiado que salva exclusivamente preferencias nao sensiveis. */
export function IntegrationConfigForm({
  integracao,
  podeGerenciar,
}: {
  integracao: IntegracaoGerenciamento;
  podeGerenciar: boolean;
}) {
  const [etapa, setEtapa] = useState(1);
  const formRef = useRef<HTMLFormElement>(null);

  function avancar() {
    if (!validarEtapa(formRef.current, etapa)) return;
    setEtapa((atual) => Math.min(3, atual + 1));
  }

  return (
    <form
      action={salvarConfiguracaoIntegracaoAction}
      className="space-y-5"
      ref={formRef}
    >
      <input name="provider" type="hidden" value={integracao.provider} />
      <input
        name="frequencia"
        type="hidden"
        value={integracao.sincronizavel ? "daily" : "manual"}
      />

      <IndicadorEtapas etapaAtual={etapa} />

      <motion.section
        animate={{ opacity: etapa === 1 ? 1 : 0 }}
        className={cn("space-y-4", etapa !== 1 && "hidden")}
        initial={false}
      >
        <CabecalhoEtapa
          description="Escolha apenas como deseja usar o recurso. A parte tecnica continua protegida pelo Hospedex."
          title="Forma de utilizacao"
        />
        <div className="grid gap-3">
          {integracao.opcoesUso.map((opcao, indice) => (
            <label
              className="group flex cursor-pointer items-start gap-3 rounded-xl border bg-background/45 p-4 transition-colors hover:border-cyan-400/45 hover:bg-cyan-500/5"
              key={opcao.valor}
            >
              <input
                className="mt-1 h-4 w-4 accent-cyan-500"
                data-wizard-step="1"
                defaultChecked={
                  integracao.configuracao.modoUso
                    ? integracao.configuracao.modoUso === opcao.valor
                    : indice === 0
                }
                name="modoUso"
                required
                type="radio"
                value={opcao.valor}
              />
              <span>
                <span className="block text-sm font-semibold">
                  {opcao.label}
                </span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  {opcao.descricao}
                </span>
              </span>
            </label>
          ))}
        </div>
      </motion.section>

      <motion.section
        animate={{ opacity: etapa === 2 ? 1 : 0 }}
        className={cn("space-y-4", etapa !== 2 && "hidden")}
        initial={false}
      >
        <CabecalhoEtapa
          description="Informe somente dados publicos e preferencias da operacao."
          title="Preferencias"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <IntegrationWizardFields
            configuracao={integracao.configuracao}
            provider={integracao.provider}
          />
        </div>
      </motion.section>

      <motion.section
        animate={{ opacity: etapa === 3 ? 1 : 0 }}
        className={cn("space-y-4", etapa !== 3 && "hidden")}
        initial={false}
      >
        <CabecalhoEtapa
          description="Revise o estado antes de concluir. Nenhuma conexao externa sera simulada."
          title="Validacao"
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <InfoValidacao
            label="Status atual"
            value={labelStatus(integracao)}
          />
          <InfoValidacao
            label="Ultima sincronizacao"
            value={formatarSincronizacao(integracao.lastSyncedAt)}
          />
        </div>

        <div className="rounded-xl border border-cyan-300/20 bg-cyan-500/5 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-cyan-600 dark:text-cyan-300" />
            <div>
              <p className="text-sm font-semibold">Estrutura preparada</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                A configuracao salva preferencias do proprietario. O teste real
                ficara disponivel somente quando o Super Admin concluir a
                ativacao tecnica.
              </p>
            </div>
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border bg-background/45 p-4">
          <input
            className="mt-1 h-4 w-4 accent-cyan-500"
            defaultChecked={integracao.ativa}
            name="ativoPeloProprietario"
            type="checkbox"
            value="true"
          />
          <span>
            <span className="block text-sm font-semibold">
              Ativar ao concluir
            </span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">
              A ativacao registra sua preferencia sem iniciar uma conexao real.
            </span>
          </span>
        </label>

        <ActionButton
          className="w-full"
          disabled
          icon={<TestTube2 />}
          type="button"
          variant="view"
        >
          Testar conexao indisponivel
        </ActionButton>
      </motion.section>

      <footer className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {etapa > 1 ? (
            <ActionButton
              icon={<ChevronLeft />}
              onClick={() => setEtapa((atual) => Math.max(1, atual - 1))}
              type="button"
              variant="cancel"
            >
              Voltar
            </ActionButton>
          ) : null}
        </div>

        {etapa < 3 ? (
          <ActionButton
            disabled={!podeGerenciar}
            icon={<ChevronRight />}
            onClick={avancar}
            type="button"
            variant="edit"
          >
            Proximo
          </ActionButton>
        ) : (
          <ActionButton
            disabled={!podeGerenciar}
            icon={<CircleCheck />}
            size="md"
            type="submit"
            variant="add"
          >
            Concluir configuracao
          </ActionButton>
        )}
      </footer>
    </form>
  );
}

function IndicadorEtapas({ etapaAtual }: { etapaAtual: number }) {
  return (
    <ol className="grid grid-cols-3 gap-2" aria-label="Etapas da configuracao">
      {ETAPAS.map((etapa) => {
        const concluida = etapa.id < etapaAtual;
        const ativa = etapa.id === etapaAtual;

        return (
          <li
            aria-current={ativa ? "step" : undefined}
            className="min-w-0"
            key={etapa.id}
          >
            <div
              className={cn(
                "mb-2 h-1 rounded-full bg-muted transition-colors",
                (ativa || concluida) && "bg-cyan-500",
              )}
            />
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                  ativa && "border-cyan-400 bg-cyan-500/10 text-cyan-700 dark:text-cyan-200",
                  concluida && "border-cyan-500 bg-cyan-500 text-white",
                )}
              >
                {concluida ? <Check className="h-3.5 w-3.5" /> : etapa.id}
              </span>
              <span className="truncate text-xs font-medium">{etapa.label}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function CabecalhoEtapa({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div>
      <Badge variant="info">Configuracao guiada</Badge>
      <h3 className="mt-3 text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function InfoValidacao({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-background/45 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-semibold">{value}</p>
    </div>
  );
}

function validarEtapa(form: HTMLFormElement | null, etapa: number) {
  if (!form) return false;

  const campos = Array.from(
    form.querySelectorAll<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >(`[data-wizard-step="${etapa}"]`),
  );

  for (const campo of campos) {
    if (!campo.checkValidity()) {
      campo.reportValidity();
      return false;
    }
  }

  return true;
}

function labelStatus(integracao: IntegracaoGerenciamento) {
  if (!integracao.ativa) return "Desativada pelo proprietario";
  if (!integracao.configuradaEm) return "Configuracao pendente";
  if (integracao.status === "connected") return "Conectada";
  if (integracao.status === "error") return "Requer atencao";
  return "Preparada para ativacao tecnica";
}

function formatarSincronizacao(valor: string | null) {
  if (!valor) return "Ainda nao realizada";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(valor));
}
