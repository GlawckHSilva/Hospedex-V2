import {
  Banknote,
  Building2,
  Clock3,
  CreditCard,
  KeyRound,
  Landmark,
  LogOut,
  Palette,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
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

import { ConfirmDialog, EntityModal } from "../management/entity-modal";
import { EntityGrid } from "../management/entity-card";
import { sairAction } from "../../lib/auth/actions";
import { CopyWebhookUrlButton } from "./copy-webhook-url-button";
import { LogoUploadField } from "./logo-upload-field";
import {
  alterarSenhaConfiguracoesAction,
  alternarModuloGerenciamentoAction,
  atualizarConfiguracoesGeraisAction,
  atualizarInstrucoesPagamentoAction,
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
  "pagamentos-atualizados": "Instrucoes de pagamento atualizadas.",
  "preferencias-atualizadas": "Preferencias operacionais atualizadas.",
  "senha-atualizada": "Senha atualizada com sucesso.",
};

const campoClasse =
  "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
const areaClasse =
  "min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

const TIPOS_CHAVE_PIX_CONFIGURACOES = [
  { label: "CPF", valor: "cpf" },
  { label: "CNPJ", valor: "cnpj" },
  { label: "E-mail", valor: "email" },
  { label: "Telefone", valor: "telefone" },
  { label: "Chave aleatoria", valor: "aleatoria" },
];

const METODOS_COBRANCA_CONFIGURACOES = [
  { label: "Manual", valor: "manual" },
  { label: "Mercado Pago", valor: "mercado_pago" },
];

const AMBIENTES_MERCADO_PAGO = [
  { label: "Teste / Sandbox", valor: "sandbox" },
  { label: "Producao", valor: "production" },
];

const ESTRATEGIAS_COBRANCA_MERCADO_PAGO = [
  { label: "Valor total", valor: "full" },
  { label: "Sinal percentual", valor: "deposit_percent" },
  { label: "Sinal fixo", valor: "deposit_fixed" },
  { label: "Valor manual na confirmacao", valor: "manual_amount" },
];

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

      <EntityGrid>
        <Card className="admin-glass-card scroll-mt-24" id="configuracoes-gerais">
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
                encType="multipart/form-data"
              >
                <CampoTexto
                  defaultValue={configuracoes.tenantName}
                  disabled={!podeGerenciarConfiguracoes}
                  label="Nome do empreendimento"
                  name="tenantName"
                  required
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <LogoUploadField
                    disabled={!podeGerenciarConfiguracoes}
                    logoUrl={configuracoes.logo_url}
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

        <Card className="admin-glass-card">
          <CardContent className="p-5">
            <CabecalhoCard
              icon={<CreditCard />}
              titulo="Dados de recebimento"
            />
            <p className="mt-3 text-sm text-muted-foreground">
              Pix, documento e instrucoes globais do proprietario. Cada casa
              escolhe apenas quais formas aceita.
            </p>
            <EntityModal
              description="Configure os dados globais de recebimento do tenant. As casas reutilizam estas informacoes e apenas ativam ou desativam cada forma de pagamento."
              disabled={!podeGerenciarConfiguracoes}
              eyebrow="Pagamentos"
              title="Dados de recebimento do proprietario"
              triggerClassName="mt-5"
              triggerLabel="Configurar recebimento"
              triggerVariant="default"
            >
              <form
                action={atualizarInstrucoesPagamentoAction}
                className="grid gap-4"
              >
                <SecaoFormulario
                  descricao="Dados que podem aparecer em mensagens de cobranca e orientacoes ao hospede."
                  icon={<Smartphone />}
                  titulo="Pix e identificacao do recebedor"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <CampoSelectConfiguracoes
                      defaultValue={configuracoes.pix_key_type}
                      disabled={!podeGerenciarConfiguracoes}
                      label="Tipo da chave Pix"
                      name="pixKeyType"
                      options={TIPOS_CHAVE_PIX_CONFIGURACOES}
                    />
                    <CampoTexto
                      defaultValue={configuracoes.pix_key ?? ""}
                      disabled={!podeGerenciarConfiguracoes}
                      label="Chave Pix"
                      name="pixKey"
                      placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatoria"
                    />
                    <CampoTexto
                      defaultValue={configuracoes.pix_receiver_name ?? ""}
                      disabled={!podeGerenciarConfiguracoes}
                      label="Nome do recebedor"
                      name="pixReceiverName"
                    />
                    <CampoTexto
                      defaultValue={configuracoes.payment_receiver_document ?? ""}
                      disabled={!podeGerenciarConfiguracoes}
                      label="CPF/CNPJ do recebedor"
                      name="paymentReceiverDocument"
                      placeholder="Usado apenas em orientacoes de pagamento"
                    />
                    <CampoTexto
                      defaultValue={configuracoes.pix_bank_name ?? ""}
                      disabled={!podeGerenciarConfiguracoes}
                      label="Banco ou instituicao"
                      name="pixBankName"
                    />
                  </div>
                  <CampoTextoArea
                    defaultValue={configuracoes.pix_payment_note ?? ""}
                    disabled={!podeGerenciarConfiguracoes}
                    label="Observacao Pix"
                    name="pixPaymentNote"
                  />
                </SecaoFormulario>

                <SecaoFormulario
                  descricao="Textos reutilizados quando uma casa aceitar dinheiro, cartao ou transferencia."
                  icon={<Banknote />}
                  titulo="Instrucoes por forma de pagamento"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <CampoTextoArea
                      defaultValue={configuracoes.cash_payment_instructions ?? ""}
                      disabled={!podeGerenciarConfiguracoes}
                      label="Instrucao para dinheiro"
                      name="cashPaymentInstructions"
                    />
                    <CampoTextoArea
                      defaultValue={configuracoes.debit_card_payment_instructions ?? ""}
                      disabled={!podeGerenciarConfiguracoes}
                      label="Instrucao para cartao de debito"
                      name="debitCardPaymentInstructions"
                    />
                    <CampoTextoArea
                      defaultValue={configuracoes.bank_transfer_payment_instructions ?? ""}
                      disabled={!podeGerenciarConfiguracoes}
                      label="Instrucao para transferencia bancaria"
                      name="bankTransferPaymentInstructions"
                    />
                    <CampoTextoArea
                      defaultValue={configuracoes.credit_card_payment_instructions ?? ""}
                      disabled={!podeGerenciarConfiguracoes}
                      label="Instrucao para cartao de credito"
                      name="creditCardPaymentInstructions"
                    />
                  </div>
                </SecaoFormulario>

                <SecaoFormulario
                  descricao="A casa ainda define se aceita cartao e as regras de parcelas/juros."
                  icon={<Landmark />}
                  titulo="Parcelamento"
                >
                  <CampoTextoArea
                    defaultValue={configuracoes.credit_card_installments_note ?? ""}
                    disabled={!podeGerenciarConfiguracoes}
                    label="Observacao sobre parcelamento"
                    name="creditCardInstallmentsNote"
                  />
                </SecaoFormulario>

                <SecaoFormulario
                  descricao="Mercado Pago gera link de pagamento direto para a conta do proprietario. O token e salvo criptografado no servidor e nunca aparece para o hospede."
                  icon={<CreditCard />}
                  titulo="Mercado Pago"
                >
                  <div className="rounded-lg border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-xs leading-5 text-muted-foreground">
                    <p className="font-semibold text-foreground">
                      Status:{" "}
                      {configuracoes.mercadoPagoCredencial.conectado
                        ? `conectado ao token final ${configuracoes.mercadoPagoCredencial.last4 ?? "****"}`
                        : "nao conectado"}
                    </p>
                    <p className="font-semibold text-foreground">
                      Webhook Secret:{" "}
                      {configuracoes.mercadoPagoCredencial.webhookSecretConfigurado
                        ? `configurado final ${configuracoes.mercadoPagoCredencial.webhookSecretLast4 ?? "****"}`
                        : "nao configurado"}
                    </p>
                    <p>
                      Para conectar, acesse sua conta Mercado Pago, copie o Access Token
                      de producao ou teste, cadastre a URL do webhook abaixo no painel
                      Mercado Pago e cole a assinatura secreta gerada. Depois de salvos,
                      estes dados ficam criptografados e sao usados apenas no servidor.
                    </p>
                  </div>
                  {configuracoes.mercado_pago_enabled &&
                  !configuracoes.mercadoPagoCredencial.webhookSecretConfigurado ? (
                    <p className="rounded-lg border border-amber-300/30 bg-amber-400/10 px-3 py-2 text-xs leading-5 text-amber-200">
                      Mercado Pago configurado parcialmente. Links de pagamento podem ser
                      gerados, mas a confirmacao automatica por webhook nao funcionara
                      em producao ate configurar a assinatura secreta deste tenant.
                    </p>
                  ) : null}
                  <div className="grid gap-2 rounded-lg border bg-background/45 p-3">
                    <Label>URL do webhook para cadastrar no Mercado Pago</Label>
                    {configuracoes.mercadoPagoWebhookUrl ? (
                      <div className="flex flex-col gap-2 md:flex-row">
                        <Input
                          readOnly
                          value={configuracoes.mercadoPagoWebhookUrl}
                        />
                        <CopyWebhookUrlButton url={configuracoes.mercadoPagoWebhookUrl} />
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        APP_PUBLIC_URL nao esta configurada. Defina a variavel no
                        ambiente do Admin para exibir a URL do webhook.
                      </p>
                    )}
                    <p className="text-xs leading-5 text-muted-foreground">
                      Cadastre esta URL no painel do Mercado Pago em Webhooks e copie a
                      assinatura secreta gerada para o campo Webhook Secret.
                    </p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <CampoSelectConfiguracoes
                      defaultValue={configuracoes.payment_collection_method}
                      disabled={!podeGerenciarConfiguracoes}
                      label="Metodo principal de cobranca"
                      name="paymentCollectionMethod"
                      options={METODOS_COBRANCA_CONFIGURACOES}
                    />
                    <CampoTexto
                      defaultValue={String(configuracoes.manual_payment_deadline_hours)}
                      disabled={!podeGerenciarConfiguracoes}
                      label="Prazo manual padrao em horas"
                      name="manualPaymentDeadlineHours"
                      type="number"
                    />
                    <label className="flex items-center gap-3 rounded-lg border bg-background/45 px-3 py-2 text-sm">
                      <input
                        defaultChecked={configuracoes.mercado_pago_enabled}
                        disabled={!podeGerenciarConfiguracoes}
                        name="mercadoPagoEnabled"
                        type="checkbox"
                      />
                      Ativar Mercado Pago para este tenant
                    </label>
                    <CampoSelectConfiguracoes
                      defaultValue={configuracoes.mercado_pago_environment}
                      disabled={!podeGerenciarConfiguracoes}
                      label="Ambiente"
                      name="mercadoPagoEnvironment"
                      options={AMBIENTES_MERCADO_PAGO}
                    />
                    <CampoTexto
                      defaultValue={configuracoes.mercado_pago_public_key ?? ""}
                      disabled={!podeGerenciarConfiguracoes}
                      label="Public key"
                      name="mercadoPagoPublicKey"
                      placeholder="APP_USR-..."
                    />
                    <CampoTexto
                      defaultValue=""
                      disabled={!podeGerenciarConfiguracoes}
                      label="Access token Mercado Pago"
                      name="mercadoPagoAccessToken"
                      placeholder={
                        configuracoes.mercadoPagoCredencial.conectado
                          ? "Novo token opcional para substituir o atual"
                          : "APP_USR-... ou TEST-..."
                      }
                      type="password"
                    />
                    <CampoTexto
                      defaultValue=""
                      disabled={!podeGerenciarConfiguracoes}
                      label="Webhook Secret Mercado Pago"
                      name="mercadoPagoWebhookSecret"
                      placeholder={
                        configuracoes.mercadoPagoCredencial.webhookSecretConfigurado
                          ? "Novo secret opcional para substituir o atual"
                          : "Assinatura secreta gerada no painel Mercado Pago"
                      }
                      type="password"
                    />
                    <CampoTexto
                      defaultValue={configuracoes.mercado_pago_access_token_secret_name ?? ""}
                      disabled={!podeGerenciarConfiguracoes}
                      label="Fallback tecnico por variavel de ambiente"
                      name="mercadoPagoAccessTokenSecretName"
                      placeholder="Opcional: MERCADO_PAGO_ACCESS_TOKEN_TENANT_X"
                    />
                    <label className="flex items-center gap-3 rounded-lg border bg-background/45 px-3 py-2 text-sm">
                      <input
                        disabled={
                          !podeGerenciarConfiguracoes ||
                          !configuracoes.mercadoPagoCredencial.conectado
                        }
                        name="removerMercadoPago"
                        type="checkbox"
                      />
                      Remover credencial Mercado Pago salva
                    </label>
                    <label className="flex items-center gap-3 rounded-lg border bg-background/45 px-3 py-2 text-sm">
                      <input
                        disabled={
                          !podeGerenciarConfiguracoes ||
                          !configuracoes.mercadoPagoCredencial.webhookSecretConfigurado
                        }
                        name="removerMercadoPagoWebhookSecret"
                        type="checkbox"
                      />
                      Remover apenas Webhook Secret salvo
                    </label>
                    <CampoSelectConfiguracoes
                      defaultValue={configuracoes.mercado_pago_default_charge_strategy}
                      disabled={!podeGerenciarConfiguracoes}
                      label="Cobranca padrao"
                      name="mercadoPagoDefaultChargeStrategy"
                      options={ESTRATEGIAS_COBRANCA_MERCADO_PAGO}
                    />
                    <CampoTexto
                      defaultValue={String(configuracoes.mercado_pago_default_deadline_hours)}
                      disabled={!podeGerenciarConfiguracoes}
                      label="Prazo Mercado Pago em horas"
                      name="mercadoPagoDefaultDeadlineHours"
                      type="number"
                    />
                    <CampoTexto
                      defaultValue={
                        configuracoes.mercado_pago_default_deposit_percent?.toString() ?? ""
                      }
                      disabled={!podeGerenciarConfiguracoes}
                      label="Sinal percentual padrao"
                      name="mercadoPagoDefaultDepositPercent"
                      placeholder="Ex.: 30"
                      type="number"
                    />
                    <CampoTexto
                      defaultValue={
                        configuracoes.mercado_pago_default_deposit_fixed?.toString() ?? ""
                      }
                      disabled={!podeGerenciarConfiguracoes}
                      label="Sinal fixo padrao"
                      name="mercadoPagoDefaultDepositFixed"
                      placeholder="Ex.: 500"
                      type="number"
                    />
                  </div>
                  <p className="rounded-lg border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-xs leading-5 text-muted-foreground">
                    O dinheiro cai diretamente na conta Mercado Pago do proprietario
                    dona do token. O Hospedex nao armazena dados de cartao e nao cobra
                    em nome do hospede nesta etapa.
                  </p>
                </SecaoFormulario>
                <Button disabled={!podeGerenciarConfiguracoes} type="submit">
                  Salvar dados de recebimento
                </Button>
              </form>
            </EntityModal>
          </CardContent>
        </Card>
      </EntityGrid>

      <section className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <Card className="admin-glass-card">
          <CardContent className="p-5">
            <CabecalhoCard
              icon={<SlidersHorizontal />}
              titulo="Modulos habilitados"
            />
            <EntityGrid className="mt-5 gap-3">
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
            </EntityGrid>
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

function SecaoFormulario({
  children,
  descricao,
  icon,
  titulo,
}: {
  children: React.ReactNode;
  descricao: string;
  icon: React.ReactNode;
  titulo: string;
}) {
  return (
    <section className="grid gap-4 rounded-xl border bg-background/45 p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-cyan-500/15 text-cyan-700 dark:text-cyan-200 [&_svg]:h-4 [&_svg]:w-4">
          {icon}
        </span>
        <div>
          <h3 className="text-sm font-semibold">{titulo}</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {descricao}
          </p>
        </div>
      </div>
      {children}
    </section>
  );
}

function CampoSelectConfiguracoes({
  defaultValue,
  disabled,
  label,
  name,
  options,
}: {
  defaultValue: string;
  disabled?: boolean;
  label: string;
  name: string;
  options: Array<{ label: string; valor: string }>;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <select
        className={campoClasse}
        defaultValue={defaultValue}
        disabled={disabled}
        id={name}
        name={name}
      >
        {options.map((option) => (
          <option key={option.valor} value={option.valor}>
            {option.label}
          </option>
        ))}
      </select>
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
      <ConfirmDialog
        description="Confirme a alteracao deste modulo para o tenant atual."
        disabled={!podeAlternar}
        title={modulo.ativo ? "Desativar modulo" : "Ativar modulo"}
        triggerClassName="mt-4"
        triggerLabel={modulo.ativo ? "Desativar" : "Ativar"}
        triggerVariant="outline"
      >
        <form action={alternarModuloGerenciamentoAction} className="grid gap-3">
          <input name="modulo" type="hidden" value={modulo.key} />
          <input name="ativo" type="hidden" value={String(!modulo.ativo)} />
          <p className="text-sm text-muted-foreground">
            Confirme para {modulo.ativo ? "desativar" : "ativar"} {modulo.label}
            .
          </p>
          <Button disabled={!podeAlternar} type="submit" variant="outline">
            {modulo.ativo ? "Desativar" : "Ativar"}
          </Button>
        </form>
      </ConfirmDialog>
    </div>
  );
}
