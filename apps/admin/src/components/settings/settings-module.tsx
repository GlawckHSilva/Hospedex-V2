import {
  Building2,
  Clock3,
  KeyRound,
  LogOut,
  Palette,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";

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
import { sairAction } from "../../lib/auth/actions";
import {
  alterarSenhaConfiguracoesAction,
  alternarModuloGerenciamentoAction,
  atualizarConfiguracoesGeraisAction,
  atualizarPreferenciasOperacionaisAction,
} from "../../lib/settings/actions";
import {
  POLITICAS_LIMPEZA,
  type DadosConfiguracoesGerenciamento,
  type ModuloGerenciamentoConfiguravel,
  type SearchParamsConfiguracoes,
} from "../../lib/settings/types";
import { ModuleToast } from "../admin/module-toast";

/**
 * Tela de Configuracoes do Gerenciamento.
 *
 * A UI mostra apenas dados do tenant atual. Feature flags aparecem como modulos
 * configuraveis, mas a server action valida novamente se a flag esta liberada.
 */

type SettingsModuleProps = DadosConfiguracoesGerenciamento &
  SearchParamsConfiguracoes;

const MENSAGENS_SUCESSO: Record<string, string> = {
  "configuracoes-atualizadas": "Configuracoes gerais atualizadas.",
  "modulo-atualizado": "Modulo atualizado.",
  "preferencias-atualizadas": "Preferencias operacionais atualizadas.",
  "senha-atualizada": "Senha atualizada com sucesso.",
};

const campoClasse =
  "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
const areaClasse =
  "min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export function SettingsModule({
  configuracoes,
  erro,
  modulos,
  podeGerenciarConfiguracoes,
  podeGerenciarModulos,
  sessoesFuturasDisponiveis,
  sucesso,
  tenantNome,
}: SettingsModuleProps) {
  return (
    <FadeIn className="space-y-5">
      <ModuleToast
        erro={erro}
        mensagensSucesso={MENSAGENS_SUCESSO}
        sucesso={sucesso}
      />

      <section className="admin-glass-panel p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Badge variant={podeGerenciarConfiguracoes ? "info" : "warning"}>
              {podeGerenciarConfiguracoes ? "Gerenciamento" : "Somente leitura"}
            </Badge>
            <h1 className="mt-3 text-2xl font-semibold tracking-normal">
              Configuracoes
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {tenantNome} · Preferencias do empreendimento, operacao e modulos
              do tenant.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Resumo
              icon={<Building2 />}
              label="Tenant"
              valor={configuracoes.tenantName}
            />
            <Resumo
              icon={<Palette />}
              label="Cor principal"
              valor={configuracoes.primary_color}
            />
            <Resumo
              icon={<SlidersHorizontal />}
              label="Modulos ativos"
              valor={String(modulos.filter((modulo) => modulo.ativo).length)}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Card className="admin-glass-card">
          <CardContent className="p-5">
            <CabecalhoCard icon={<Building2 />} titulo="Configuracoes gerais" />
            <p className="mt-3 text-sm text-muted-foreground">
              Nome, marca, contato e descrição curta do empreendimento.
            </p>
            <EntityModal
              description="Atualize informações gerais do tenant atual."
              disabled={!podeGerenciarConfiguracoes}
              eyebrow="Edição"
              title="Configurações gerais"
              triggerClassName="mt-5"
              triggerLabel="Editar configurações"
              triggerVariant="default"
            >
              <form
                action={atualizarConfiguracoesGeraisAction}
                className="grid gap-4"
              >
                <CampoTexto
                  defaultValue={configuracoes.tenantName}
                  disabled={!podeGerenciarConfiguracoes}
                  label="Nome do empreendimento"
                  name="tenantName"
                  required
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <CampoTexto
                    defaultValue={configuracoes.logo_url ?? ""}
                    disabled={!podeGerenciarConfiguracoes}
                    label="Logo"
                    name="logoUrl"
                    placeholder="https://..."
                    type="url"
                  />
                  <CampoTexto
                    defaultValue={configuracoes.primary_color}
                    disabled={!podeGerenciarConfiguracoes}
                    label="Cor principal"
                    name="primaryColor"
                    required
                    type="color"
                  />
                  <CampoTexto
                    defaultValue={configuracoes.phone ?? ""}
                    disabled={!podeGerenciarConfiguracoes}
                    label="Telefone"
                    name="phone"
                  />
                  <CampoTexto
                    defaultValue={configuracoes.whatsapp ?? ""}
                    disabled={!podeGerenciarConfiguracoes}
                    label="WhatsApp"
                    name="whatsapp"
                  />
                  <CampoTexto
                    defaultValue={configuracoes.email ?? ""}
                    disabled={!podeGerenciarConfiguracoes}
                    label="E-mail"
                    name="email"
                    type="email"
                  />
                  <CampoTexto
                    defaultValue={configuracoes.city ?? ""}
                    disabled={!podeGerenciarConfiguracoes}
                    label="Cidade"
                    name="city"
                  />
                  <CampoTexto
                    defaultValue={configuracoes.state ?? ""}
                    disabled={!podeGerenciarConfiguracoes}
                    label="Estado"
                    maxLength={2}
                    name="state"
                  />
                </div>
                <CampoTextoArea
                  defaultValue={configuracoes.short_description ?? ""}
                  disabled={!podeGerenciarConfiguracoes}
                  label="Descricao curta"
                  name="shortDescription"
                />
                <Button disabled={!podeGerenciarConfiguracoes} type="submit">
                  Salvar configuracoes
                </Button>
              </form>
            </EntityModal>
          </CardContent>
        </Card>

        <Card className="admin-glass-card">
          <CardContent className="p-5">
            <CabecalhoCard
              icon={<Clock3 />}
              titulo="Preferencias operacionais"
            />
            <p className="mt-3 text-sm text-muted-foreground">
              Horários, limpeza e exigências operacionais da rotina.
            </p>
            <EntityModal
              description="Ajuste preferências aplicadas aos fluxos do Gerenciamento."
              disabled={!podeGerenciarConfiguracoes}
              eyebrow="Edição"
              title="Preferências operacionais"
              triggerClassName="mt-5"
              triggerLabel="Editar preferências"
              triggerVariant="default"
            >
              <form
                action={atualizarPreferenciasOperacionaisAction}
                className="grid gap-4"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <CampoTexto
                    defaultValue={configuracoes.default_check_in_time}
                    disabled={!podeGerenciarConfiguracoes}
                    label="Check-in padrao"
                    name="defaultCheckInTime"
                    required
                    type="time"
                  />
                  <CampoTexto
                    defaultValue={configuracoes.default_check_out_time}
                    disabled={!podeGerenciarConfiguracoes}
                    label="Check-out padrao"
                    name="defaultCheckOutTime"
                    required
                    type="time"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cleaningPolicy">
                    Politica padrao de limpeza
                  </Label>
                  <select
                    className={campoClasse}
                    defaultValue={configuracoes.cleaning_policy}
                    disabled={!podeGerenciarConfiguracoes}
                    id="cleaningPolicy"
                    name="cleaningPolicy"
                  >
                    {POLITICAS_LIMPEZA.map((politica) => (
                      <option key={politica.value} value={politica.value}>
                        {politica.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-3">
                  <CampoCheckbox
                    checked={configuracoes.allow_manual_reservations}
                    disabled={!podeGerenciarConfiguracoes}
                    label="Permitir reserva manual"
                    name="allowManualReservations"
                  />
                  <CampoCheckbox
                    checked={configuracoes.require_payment_confirmation}
                    disabled={!podeGerenciarConfiguracoes}
                    label="Exigir confirmacao de pagamento"
                    name="requirePaymentConfirmation"
                  />
                  <CampoCheckbox
                    checked={configuracoes.require_checkin_confirmation}
                    disabled={!podeGerenciarConfiguracoes}
                    label="Exigir confirmacao de check-in"
                    name="requireCheckinConfirmation"
                  />
                  <CampoCheckbox
                    checked={configuracoes.require_checkout_confirmation}
                    disabled={!podeGerenciarConfiguracoes}
                    label="Exigir confirmacao de check-out"
                    name="requireCheckoutConfirmation"
                  />
                </div>
                <Button disabled={!podeGerenciarConfiguracoes} type="submit">
                  Salvar preferencias
                </Button>
              </form>
            </EntityModal>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <Card className="admin-glass-card">
          <CardContent className="p-5">
            <CabecalhoCard
              icon={<SlidersHorizontal />}
              titulo="Modulos habilitados"
            />
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {modulos.length ? (
                modulos.map((modulo) => (
                  <ModuloCard
                    key={modulo.key}
                    modulo={modulo}
                    podeGerenciarModulos={podeGerenciarModulos}
                  />
                ))
              ) : (
                <p className="rounded-lg border bg-background/50 p-4 text-sm text-muted-foreground">
                  Nenhum modulo configuravel encontrado para este tenant.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="admin-glass-card">
          <CardContent className="p-5">
            <CabecalhoCard icon={<ShieldCheck />} titulo="Seguranca" />
            <p className="mt-3 text-sm text-muted-foreground">
              Senha e sessão do usuário autenticado.
            </p>
            <EntityModal
              description="Defina e confirme a nova senha da conta atual."
              eyebrow="Segurança"
              title="Alterar senha"
              triggerClassName="mt-5"
              triggerIcon={<KeyRound className="h-4 w-4" />}
              triggerLabel="Alterar senha"
              triggerVariant="outline"
            >
              <form
                action={alterarSenhaConfiguracoesAction}
                className="grid gap-4"
              >
                <CampoTexto
                  label="Nova senha"
                  name="password"
                  required
                  type="password"
                />
                <CampoTexto
                  label="Confirmar senha"
                  name="passwordConfirm"
                  required
                  type="password"
                />
                <Button type="submit" variant="outline">
                  <KeyRound />
                  Alterar senha
                </Button>
              </form>
            </EntityModal>

            <div className="mt-5 rounded-lg border bg-background/45 p-4 text-sm text-muted-foreground">
              {sessoesFuturasDisponiveis
                ? "Sessoes futuras disponiveis para revisao."
                : "Sessoes futuras ainda nao possuem estrutura de auditoria nesta etapa."}
            </div>

            <form action={sairAction} className="mt-4">
              <Button className="w-full" type="submit" variant="destructive">
                <LogOut />
                Encerrar sessao
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </FadeIn>
  );
}

function Resumo({
  icon,
  label,
  valor,
}: {
  icon: React.ReactNode;
  label: string;
  valor: string;
}) {
  return (
    <div className="min-w-36 rounded-lg border bg-background/55 p-3 text-sm">
      <div className="mb-2 text-primary [&_svg]:h-4 [&_svg]:w-4">{icon}</div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate font-semibold">{valor}</p>
    </div>
  );
}

function CabecalhoCard({
  icon,
  titulo,
}: {
  icon: React.ReactNode;
  titulo: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-primary [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
      <h2 className="text-base font-semibold">{titulo}</h2>
    </div>
  );
}

function CampoTexto({
  defaultValue,
  disabled,
  label,
  maxLength,
  name,
  placeholder,
  required,
  type = "text",
}: {
  defaultValue?: string;
  disabled?: boolean;
  label: string;
  maxLength?: number;
  name: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        defaultValue={defaultValue}
        disabled={disabled}
        id={name}
        maxLength={maxLength}
        name={name}
        placeholder={placeholder}
        required={required}
        type={type}
      />
    </div>
  );
}

function CampoTextoArea({
  defaultValue,
  disabled,
  label,
  name,
}: {
  defaultValue: string;
  disabled?: boolean;
  label: string;
  name: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <textarea
        className={areaClasse}
        defaultValue={defaultValue}
        disabled={disabled}
        id={name}
        name={name}
      />
    </div>
  );
}

function CampoCheckbox({
  checked,
  disabled,
  label,
  name,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  name: string;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-lg border bg-background/45 px-3 py-2 text-sm">
      <span>{label}</span>
      <input
        className="h-4 w-4 accent-cyan-500"
        defaultChecked={checked}
        disabled={disabled}
        name={name}
        type="checkbox"
      />
    </label>
  );
}

function ModuloCard({
  modulo,
  podeGerenciarModulos,
}: {
  modulo: ModuloGerenciamentoConfiguravel;
  podeGerenciarModulos: boolean;
}) {
  const podeAlternar =
    podeGerenciarModulos && modulo.configuravelPeloProprietario;

  return (
    <div className="rounded-lg border bg-background/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{modulo.label}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {modulo.descricao}
          </p>
        </div>
        <Badge variant={modulo.ativo ? "success" : "secondary"}>
          {modulo.ativo ? "Ativo" : "Inativo"}
        </Badge>
      </div>
      {modulo.motivoBloqueio ? (
        <p className="mt-3 text-xs text-muted-foreground">
          {modulo.motivoBloqueio}
        </p>
      ) : null}
      <form action={alternarModuloGerenciamentoAction} className="mt-4">
        <input name="modulo" type="hidden" value={modulo.key} />
        <input name="ativo" type="hidden" value={String(!modulo.ativo)} />
        <Button
          disabled={!podeAlternar}
          size="sm"
          type="submit"
          variant="outline"
        >
          {modulo.ativo ? "Desativar" : "Ativar"}
        </Button>
      </form>
    </div>
  );
}
