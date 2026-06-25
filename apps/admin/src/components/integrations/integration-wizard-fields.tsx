import type { IntegrationProvider } from "@hospedex/types";

import { Input, Label } from "@hospedex/ui";

import type { ConfiguracaoPublicaIntegracao } from "../../lib/integrations/types";

const campoClasse =
  "flex min-h-10 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

type CamposWizardProps = {
  configuracao: ConfiguracaoPublicaIntegracao;
  provider: IntegrationProvider;
};

/**
 * Campos publicos de cada integracao.
 *
 * Credenciais, endpoints e dados de infraestrutura nao pertencem a este
 * componente porque continuam sob responsabilidade exclusiva do Super Admin.
 */
export function IntegrationWizardFields({
  configuracao,
  provider,
}: CamposWizardProps) {
  if (provider === "whatsapp") {
    return (
      <>
        <CampoTexto
          defaultValue={configuracao.nomePublico}
          label="Nome publico"
          maxLength={80}
          name="nomePublico"
          placeholder="Ex.: Atendimento Pousada Sol"
          required
        />
        <CampoTexto
          defaultValue={configuracao.numeroPublico}
          label="Numero publico"
          maxLength={30}
          name="numeroPublico"
          placeholder="Ex.: +55 11 99999-9999"
          required
          type="tel"
        />
        <CampoCheckbox
          defaultChecked={configuracao.mensagensAutomaticas}
          description="Preparar preferencias para mensagens operacionais automaticas."
          label="Mensagens automaticas"
          name="mensagensAutomaticas"
        />
      </>
    );
  }

  if (provider === "email") {
    return (
      <>
        <CampoTexto
          defaultValue={configuracao.nomeRemetente}
          label="Nome do remetente"
          maxLength={80}
          name="nomeRemetente"
          placeholder="Ex.: Hospedagem Vila Azul"
          required
        />
        <CampoSelect
          defaultValue={configuracao.idioma ?? "pt-BR"}
          label="Idioma das mensagens"
          name="idioma"
          options={[
            { label: "Portugues (Brasil)", value: "pt-BR" },
            { label: "Ingles", value: "en" },
            { label: "Espanhol", value: "es" },
          ]}
        />
        <CampoCheckbox
          defaultChecked={configuracao.mensagensAutomaticas}
          description="Preparar preferencias para comunicacoes transacionais."
          label="Mensagens automaticas"
          name="mensagensAutomaticas"
        />
      </>
    );
  }

  if (provider === "payments") {
    return (
      <CampoTexto
        defaultValue={configuracao.nomePublico}
        label="Nome exibido ao hospede"
        maxLength={80}
        name="nomePublico"
        placeholder="Ex.: Pagamento Pousada Sol"
        required
      />
    );
  }

  if (provider === "ical") {
    return (
      <>
        <CampoSelect
          defaultValue={configuracao.fusoHorario ?? "America/Sao_Paulo"}
          label="Fuso horario"
          name="fusoHorario"
          options={[
            { label: "Brasilia", value: "America/Sao_Paulo" },
            { label: "Manaus", value: "America/Manaus" },
            { label: "Rio Branco", value: "America/Rio_Branco" },
            { label: "Fernando de Noronha", value: "America/Noronha" },
          ]}
          required
        />
        <CampoSelect
          defaultValue={configuracao.formatoData ?? "dd/MM/yyyy"}
          label="Formato de data"
          name="formatoData"
          options={[
            { label: "31/12/2026", value: "dd/MM/yyyy" },
            { label: "2026-12-31", value: "yyyy-MM-dd" },
          ]}
          required
        />
      </>
    );
  }

  if (provider === "google_maps") {
    return (
      <>
        <CampoTexto
          defaultValue={configuracao.cidade}
          label="Cidade"
          maxLength={100}
          name="cidade"
          placeholder="Ex.: Florianopolis"
          required
        />
        <CampoTexto
          defaultValue={configuracao.nomePublico}
          label="Nome da localizacao"
          maxLength={80}
          name="nomePublico"
          placeholder="Ex.: Centro historico"
        />
      </>
    );
  }

  if (provider === "weather") {
    return (
      <>
        <CampoTexto
          defaultValue={configuracao.cidade}
          label="Cidade da previsao"
          maxLength={100}
          name="cidade"
          placeholder="Ex.: Gramado"
          required
        />
        <CampoSelect
          defaultValue={configuracao.idioma ?? "pt-BR"}
          label="Idioma"
          name="idioma"
          options={[
            { label: "Portugues (Brasil)", value: "pt-BR" },
            { label: "Ingles", value: "en" },
            { label: "Espanhol", value: "es" },
          ]}
        />
      </>
    );
  }

  return null;
}

function CampoTexto({
  defaultValue,
  label,
  maxLength,
  name,
  placeholder,
  required,
  type = "text",
}: {
  defaultValue: string | null;
  label: string;
  maxLength: number;
  name: string;
  placeholder: string;
  required?: boolean;
  type?: "tel" | "text";
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={`integracao-${name}`}>{label}</Label>
      <Input
        data-wizard-step="2"
        defaultValue={defaultValue ?? ""}
        id={`integracao-${name}`}
        maxLength={maxLength}
        name={name}
        placeholder={placeholder}
        required={required}
        type={type}
      />
    </div>
  );
}

function CampoSelect({
  defaultValue,
  label,
  name,
  options,
  required,
}: {
  defaultValue: string;
  label: string;
  name: string;
  options: Array<{ label: string; value: string }>;
  required?: boolean;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={`integracao-${name}`}>{label}</Label>
      <select
        className={campoClasse}
        data-wizard-step="2"
        defaultValue={defaultValue}
        id={`integracao-${name}`}
        name={name}
        required={required}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function CampoCheckbox({
  defaultChecked,
  description,
  label,
  name,
}: {
  defaultChecked: boolean;
  description: string;
  label: string;
  name: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-background/45 p-4">
      <input
        className="mt-1 h-4 w-4 accent-cyan-500"
        data-wizard-step="2"
        defaultChecked={defaultChecked}
        name={name}
        type="checkbox"
        value="true"
      />
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">
          {description}
        </span>
      </span>
    </label>
  );
}
