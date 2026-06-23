import {
  Filter,
  MailPlus,
  Plus,
  Search,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";

import {
  Badge,
  Button,
  FadeIn,
  GlassCard,
  GlassPanel,
  Input,
  Label,
  PremiumEmptyState,
  StatusBadge,
} from "@hospedex/ui";

import { ModuleToast } from "../admin/module-toast";
import {
  EmptyState,
  EntityCardActions,
  EntityGrid,
} from "../management/entity-card";
import {
  ConfirmDialog,
  EntityModal,
  EntityViewModal,
} from "../management/entity-modal";
import {
  alterarStatusFuncionarioAction,
  atualizarCargoPermissoesAction,
  criarCargoAction,
  excluirFuncionarioAction,
  reenviarConviteAction,
} from "../../lib/staff/actions";
import { PERMISSOES_MODULO } from "../../lib/staff/catalog";
import type {
  CargoComPermissoes,
  DadosModuloFuncionarios,
  FuncionarioRegistro,
} from "../../lib/staff/types";
import { FuncionarioForm } from "./funcionario-form";

export type FuncionariosModuleProps = DadosModuloFuncionarios & {
  erro?: string;
  sucesso?: string;
};

const MENSAGENS_SUCESSO: Record<string, string> = {
  "cargo-criado": "Cargo criado com sucesso.",
  "convite-reenviado": "Convite reenviado com sucesso.",
  "funcionario-atualizado": "Funcionario atualizado com sucesso.",
  "funcionario-criado": "Funcionario convidado com sucesso.",
  "funcionario-excluido": "Funcionario excluido com sucesso.",
  "permissoes-atualizadas": "Permissoes do cargo atualizadas.",
  "status-atualizado": "Status do funcionario atualizado.",
};

/**
 * Modulo de funcionarios do tenant.
 *
 * A UI trabalha apenas com dados do tenant atual. Server actions validam a
 * permissao antes de gravar e nunca expõem service role ao navegador.
 */
export function FuncionariosModule({
  cargos,
  erro,
  filtros,
  funcionarios,
  sucesso,
}: FuncionariosModuleProps) {
  return (
    <FadeIn className="space-y-5">
      <ModuleToast
        erro={erro}
        mensagensSucesso={MENSAGENS_SUCESSO}
        sucesso={sucesso}
      />

      <GlassPanel className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Badge variant="info">Equipe e acesso</Badge>
            <h1 className="mt-3 text-2xl font-semibold tracking-normal">
              Funcionarios
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Convide funcionarios, defina cargos e controle os modulos visiveis
              para cada perfil.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Resumo
              label="Funcionarios"
              valor={String(funcionarios.length)}
              tone="info"
            />
            <Resumo
              label="Ativos"
              valor={String(
                funcionarios.filter((item) => item.status === "active").length,
              )}
              tone="success"
            />
            <Resumo
              label="Cargos"
              valor={String(cargos.length)}
              tone="warning"
            />
          </div>
        </div>
      </GlassPanel>

      <GlassCard className="p-5">
        <form className="grid gap-4 md:grid-cols-[1fr_auto]">
          <div className="grid gap-2">
            <Label htmlFor="busca">Pesquisa</Label>
            <Input
              defaultValue={filtros.busca}
              id="busca"
              name="busca"
              placeholder="Nome, email ou cargo"
            />
          </div>
          <div className="flex items-end">
            <Button className="w-full" type="submit" variant="outline">
              <Search />
              Pesquisar
            </Button>
          </div>
        </form>
      </GlassCard>

      <GlassCard className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">Convite de funcionário</h2>
            <p className="text-sm text-muted-foreground">
              Convide e defina o cargo em um modal central.
            </p>
          </div>
          <EntityModal
            description="Informe dados de contato e cargo do funcionário."
            eyebrow="Cadastro"
            title="Criar funcionário"
            triggerIcon={<Plus className="h-4 w-4" />}
            triggerLabel="Criar funcionário"
            triggerVariant="default"
          >
            <FuncionarioForm cargos={cargos} modo="criar" />
          </EntityModal>
        </div>
      </GlassCard>

      {funcionarios.length ? (
        <EntityGrid>
          {funcionarios.map((funcionario) => (
            <FuncionarioCard
              cargos={cargos}
              funcionario={funcionario}
              key={funcionario.id}
            />
          ))}
        </EntityGrid>
      ) : (
        <EmptyState
          description="Nenhum funcionario encontrado para os filtros atuais."
          icon={<Filter className="h-5 w-5" />}
          title="Sem funcionarios"
        />
      )}

      <CargosPanel cargos={cargos} />
    </FadeIn>
  );
}

function FuncionarioCard({
  cargos,
  funcionario,
}: {
  cargos: CargoComPermissoes[];
  funcionario: FuncionarioRegistro;
}) {
  const podeAlterarStatus = Boolean(funcionario.member);
  const acaoStatus = funcionario.status === "active" ? "desativar" : "ativar";

  return (
    <GlassCard className="space-y-5 p-5">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={toneStatus(funcionario.status)}>
              {labelStatus(funcionario.status)}
            </StatusBadge>
            <StatusBadge tone={funcionario.member ? "info" : "warning"}>
              {funcionario.member ? "vinculado" : "convite"}
            </StatusBadge>
          </div>
          <h2 className="mt-3 truncate text-xl font-semibold">
            {funcionario.nome}
          </h2>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {funcionario.email} - {funcionario.cargo?.role.name ?? "sem cargo"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {funcionario.convite ? (
            <ConfirmDialog
              description="O convite sera reenviado para o e-mail do funcionario."
              title="Reenviar convite"
              triggerIcon={<MailPlus className="h-4 w-4" />}
              triggerLabel="Reenviar convite"
              triggerVariant="outline"
            >
              <form action={reenviarConviteAction} className="grid gap-3">
                <input
                  name="conviteId"
                  type="hidden"
                  value={funcionario.convite.id}
                />
                <p className="text-sm text-muted-foreground">
                  Confirme o reenvio para {funcionario.email}.
                </p>
                <Button type="submit" variant="outline">
                  <MailPlus />
                  Reenviar convite
                </Button>
              </form>
            </ConfirmDialog>
          ) : null}

          {podeAlterarStatus ? (
            <ConfirmDialog
              description="Esta acao altera o acesso do funcionario ao Gerenciamento."
              title={
                acaoStatus === "ativar"
                  ? "Ativar funcionario"
                  : "Desativar funcionario"
              }
              triggerLabel={acaoStatus === "ativar" ? "Ativar" : "Desativar"}
              triggerVariant={acaoStatus === "ativar" ? "default" : "outline"}
            >
              <form
                action={alterarStatusFuncionarioAction}
                className="grid gap-3"
              >
                <input
                  name="memberId"
                  type="hidden"
                  value={funcionario.member?.id}
                />
                <input name="acao" type="hidden" value={acaoStatus} />
                <p className="text-sm text-muted-foreground">
                  Confirme para {acaoStatus} o acesso de {funcionario.nome}.
                </p>
                <Button
                  type="submit"
                  variant={acaoStatus === "ativar" ? "default" : "outline"}
                >
                  {acaoStatus === "ativar" ? "Ativar" : "Desativar"}
                </Button>
              </form>
            </ConfirmDialog>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Info icon={<Users />} label="Email" valor={funcionario.email} />
        <Info label="Telefone" valor={funcionario.telefone ?? "sem telefone"} />
        <Info
          icon={<ShieldCheck />}
          label="Permissoes do cargo"
          valor={String(funcionario.cargo?.permissoes.length ?? 0)}
        />
      </div>

      <EntityCardActions>
        <EntityViewModal
          description="Resumo do acesso e vinculo deste funcionario."
          title={`Funcionario ${funcionario.nome}`}
          triggerClassName="h-9 justify-center"
          triggerLabel="Visualizar"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <Info label="Nome" valor={funcionario.nome} />
            <Info label="Email" valor={funcionario.email} />
            <Info label="Telefone" valor={funcionario.telefone ?? "sem telefone"} />
            <Info
              label="Cargo"
              valor={funcionario.cargo?.role.name ?? "sem cargo"}
            />
            <Info label="Status" valor={labelStatus(funcionario.status)} />
            <Info
              label="Permissoes"
              valor={String(funcionario.cargo?.permissoes.length ?? 0)}
            />
          </div>
        </EntityViewModal>
        <EntityModal
          description="Atualize cargo, telefone e dados do funcionário."
          eyebrow="Edição"
          title="Editar funcionário"
          triggerLabel="Editar"
        >
          <div className="space-y-5">
            <FuncionarioForm
              cargos={cargos}
              funcionario={funcionario}
              modo="editar"
            />

            <div className="border-t pt-4">
              <ConfirmDialog
                description="A exclusao remove o vinculo ou convite deste funcionario."
                title="Excluir funcionario"
                triggerLabel="Excluir"
              >
                <form action={excluirFuncionarioAction} className="grid gap-3">
                  {funcionario.member ? (
                    <input
                      name="memberId"
                      type="hidden"
                      value={funcionario.member.id}
                    />
                  ) : null}
                  {funcionario.convite ? (
                    <input
                      name="conviteId"
                      type="hidden"
                      value={funcionario.convite.id}
                    />
                  ) : null}
                  <label className="flex items-center gap-2 text-sm">
                    <input name="confirmar" type="checkbox" />
                    Confirmo a exclusao do vinculo/convite.
                  </label>
                  <Button type="submit" variant="destructive">
                    Excluir funcionario
                  </Button>
                </form>
              </ConfirmDialog>
            </div>
          </div>
        </EntityModal>

      </EntityCardActions>
    </GlassCard>
  );
}

function CargosPanel({ cargos }: { cargos: CargoComPermissoes[] }) {
  return (
    <GlassCard className="space-y-5 p-5">
      <div className="flex items-center justify-between gap-3 border-b pb-4">
        <div>
          <p className="font-semibold">Cargos e permissoes</p>
          <p className="text-sm text-muted-foreground">
            Controle quais modulos cada cargo pode acessar.
          </p>
        </div>
        <UserCog className="h-5 w-5 text-cyan-500" />
      </div>

      <EntityModal
        description="Defina o nome, descrição e permissões iniciais do cargo."
        eyebrow="Cadastro"
        title="Criar cargo personalizado"
        triggerIcon={<Plus className="h-4 w-4" />}
        triggerLabel="Criar cargo"
      >
        <form action={criarCargoAction} className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="nomeCargo">Nome do cargo</Label>
              <Input id="nomeCargo" name="nomeCargo" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="descricaoCargo">Descricao</Label>
              <Input id="descricaoCargo" name="descricaoCargo" />
            </div>
          </div>
          <PermissoesChecklist permissoesAtivas={[]} />
          <div className="flex justify-end">
            <Button type="submit">Criar cargo</Button>
          </div>
        </form>
      </EntityModal>

      {cargos.length ? (
        <EntityGrid>
          {cargos.map((cargo) => (
            <GlassCard className="p-4" key={cargo.role.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{cargo.role.name}</p>
                    <StatusBadge
                      tone={cargo.role.is_system ? "info" : "neutral"}
                    >
                      {cargo.role.is_system ? "inicial" : "personalizado"}
                    </StatusBadge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {cargo.role.description ?? "Sem descricao."}
                  </p>
                </div>
                <EntityModal
                  description="Ajuste quais modulos este cargo pode acessar."
                  eyebrow="Permissoes"
                  title={`Permissoes de ${cargo.role.name}`}
                  triggerIcon={<ShieldCheck className="h-4 w-4" />}
                  triggerLabel="Permissoes"
                >
                  <form
                    action={atualizarCargoPermissoesAction}
                    className="grid gap-4"
                  >
                    <input name="roleId" type="hidden" value={cargo.role.id} />
                    <PermissoesChecklist permissoesAtivas={cargo.permissoes} />
                    <div className="flex justify-end">
                      <Button type="submit" variant="outline">
                        Salvar permissoes
                      </Button>
                    </div>
                  </form>
                </EntityModal>
              </div>
            </GlassCard>
          ))}
        </EntityGrid>
      ) : (
        <PremiumEmptyState
          description="Os cargos iniciais ainda nao foram criados para este tenant."
          icon={<UserCog className="h-5 w-5" />}
          title="Sem cargos"
        />
      )}
    </GlassCard>
  );
}

function PermissoesChecklist({
  permissoesAtivas,
}: {
  permissoesAtivas: string[];
}) {
  const ativas = new Set(permissoesAtivas);

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {PERMISSOES_MODULO.map((permissao) => (
        <label
          className="flex items-start gap-3 rounded-lg border bg-background/55 p-3 text-sm"
          key={permissao.code}
        >
          <input
            className="mt-1"
            defaultChecked={ativas.has(permissao.code)}
            name="permissoes"
            type="checkbox"
            value={permissao.code}
          />
          <span>
            <span className="block font-medium">{permissao.label}</span>
            <span className="block text-xs text-muted-foreground">
              {permissao.modulo}
            </span>
          </span>
        </label>
      ))}
    </div>
  );
}

function Resumo({
  label,
  tone,
  valor,
}: {
  label: string;
  tone: "success" | "warning" | "danger" | "info" | "neutral";
  valor: string;
}) {
  return (
    <div className="min-w-32 rounded-lg border bg-background/55 p-3 text-sm">
      <StatusBadge tone={tone}>{label}</StatusBadge>
      <p className="mt-3 text-2xl font-semibold">{valor}</p>
    </div>
  );
}

function Info({
  icon,
  label,
  valor,
}: {
  icon?: React.ReactNode;
  label: string;
  valor: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border bg-background/55 p-3 text-sm">
      {icon ? (
        <div className="mb-2 text-primary [&_svg]:h-4 [&_svg]:w-4">{icon}</div>
      ) : null}
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate font-semibold">{valor}</p>
    </div>
  );
}

function toneStatus(status: FuncionarioRegistro["status"]) {
  if (status === "active" || status === "accepted") return "success";
  if (status === "invited" || status === "pending") return "warning";
  if (status === "disabled" || status === "cancelled" || status === "expired")
    return "danger";
  return "neutral";
}

function labelStatus(status: FuncionarioRegistro["status"]) {
  const labels: Record<FuncionarioRegistro["status"], string> = {
    accepted: "Aceito",
    active: "Ativo",
    cancelled: "Cancelado",
    disabled: "Desativado",
    expired: "Expirado",
    invited: "Convidado",
    pending: "Pendente",
  };

  return labels[status];
}
