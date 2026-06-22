import { Save } from "lucide-react";

import { Input, Label } from "@hospedex/ui";

import { salvarConfiguracaoIntegracaoAction } from "../../lib/integrations/actions";
import type { IntegracaoGerenciamento } from "../../lib/integrations/types";
import { ActionButton } from "../management/action-button";

const campoClasse =
  "flex min-h-10 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Formulario restrito a preferencias que podem ser persistidas sem segredo. */
export function IntegrationConfigForm({
  integracao,
  podeGerenciar,
}: {
  integracao: IntegracaoGerenciamento;
  podeGerenciar: boolean;
}) {
  return (
    <form action={salvarConfiguracaoIntegracaoAction} className="space-y-5">
      <input name="provider" type="hidden" value={integracao.provider} />

      <div className="rounded-lg border border-cyan-300/20 bg-cyan-500/5 p-4">
        <p className="text-sm font-semibold">
          Credenciais protegidas no backend
        </p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Esta etapa salva somente preferencias operacionais sem tokens, senhas
          ou chaves.
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${integracao.provider}-nome-interno`}>
          Nome interno
        </Label>
        <Input
          defaultValue={integracao.configuracao.nomeInterno ?? ""}
          disabled={!podeGerenciar}
          id={`${integracao.provider}-nome-interno`}
          maxLength={80}
          name="nomeInterno"
          placeholder={`Ex.: ${integracao.nome} principal`}
        />
      </div>

      {integracao.sincronizavel ? (
        <div className="grid gap-2">
          <Label htmlFor={`${integracao.provider}-frequencia`}>
            Frequencia de sincronizacao
          </Label>
          <select
            className={campoClasse}
            defaultValue={integracao.configuracao.frequenciaSincronizacao}
            disabled={!podeGerenciar}
            id={`${integracao.provider}-frequencia`}
            name="frequencia"
          >
            <option value="manual">Manual</option>
            <option value="hourly">A cada hora</option>
            <option value="daily">Diaria</option>
          </select>
        </div>
      ) : (
        <input name="frequencia" type="hidden" value="manual" />
      )}

      <div className="grid gap-2">
        <Label htmlFor={`${integracao.provider}-observacoes`}>
          Observacoes internas
        </Label>
        <textarea
          className={`${campoClasse} min-h-24 resize-y`}
          defaultValue={integracao.configuracao.observacoes ?? ""}
          disabled={!podeGerenciar}
          id={`${integracao.provider}-observacoes`}
          maxLength={500}
          name="observacoes"
          placeholder="Contexto operacional para a futura configuracao do backend."
        />
      </div>

      <div className="flex justify-end border-t pt-4">
        <ActionButton
          disabled={!podeGerenciar}
          icon={<Save />}
          size="md"
          type="submit"
          variant="add"
        >
          Salvar configuracao
        </ActionButton>
      </div>
    </form>
  );
}
