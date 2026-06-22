import { Power, ShieldCheck, UserRound } from "lucide-react";

import type { ProprietarioCompleto } from "../../../lib/super-admin/proprietarios/types";
import { alterarStatusProprietarioAction } from "../../../lib/super-admin/proprietarios/actions";
import { ActionButton } from "../../management/action-button";
import { ConfirmDialog } from "../../management/entity-modal";
import {
  CabecalhoAba,
  EstadoVazio,
  Info,
  formatarData,
  labelTenant,
  lerLimites,
  obterStatusLicenca
} from "./proprietario-detail-shared";

/** Abas de identidade e licenciamento do proprietario. */

export function AbaPerfil({ proprietario }: { proprietario: ProprietarioCompleto }) {
  const bloqueado = ["suspended", "cancelled"].includes(proprietario.tenant.status);
  const acao = bloqueado ? "ativar" : "bloquear";

  return (
    <div className="space-y-4">
      <CabecalhoAba
        descricao="Dados principais e estado de acesso do cliente."
        icon={<UserRound />}
        titulo="Perfil do proprietario"
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Info label="Nome" valor={proprietario.profile?.full_name ?? "Nao informado"} />
        <Info label="E-mail" valor={proprietario.profile?.email ?? "Nao informado"} />
        <Info label="Telefone" valor={proprietario.profile?.phone ?? "Nao informado"} />
        <Info label="Documento" valor="Nao informado" />
        <Info label="Empresa / tenant" valor={proprietario.tenant.name} />
        <Info label="Cadastro" valor={formatarData(proprietario.tenant.created_at)} />
        <Info label="Ultimo acesso" valor="Nao disponivel no perfil publico" />
        <Info label="Status" valor={labelTenant(proprietario.tenant.status)} />
      </div>

      <ConfirmDialog
        description={
          bloqueado
            ? "O proprietario voltara a acessar o tenant conforme a licenca e as permissoes atuais."
            : "O acesso deste tenant sera restringido sem apagar o historico."
        }
        title={bloqueado ? "Liberar acesso do proprietario" : "Bloquear proprietario"}
        triggerAction="status"
        triggerIcon={<Power />}
        triggerLabel={bloqueado ? "Liberar acesso" : "Bloquear acesso"}
      >
        <form action={alterarStatusProprietarioAction} className="space-y-4">
          <input name="tenantId" type="hidden" value={proprietario.tenant.id} />
          <input name="ownerId" type="hidden" value={proprietario.tenant.owner_id} />
          <input name="acao" type="hidden" value={acao} />
          <p className="text-sm text-muted-foreground">
            Confirme a alteracao administrativa para o tenant {proprietario.tenant.name}.
          </p>
          <ActionButton className="w-full" icon={<Power />} type="submit" variant="status">
            {bloqueado ? "Confirmar liberacao" : "Confirmar bloqueio"}
          </ActionButton>
        </form>
      </ConfirmDialog>
    </div>
  );
}

export function AbaLicenca({ proprietario }: { proprietario: ProprietarioCompleto }) {
  const limites = lerLimites(proprietario);

  return (
    <div className="space-y-4">
      <CabecalhoAba
        descricao="Plano, validade e limites aplicados ao tenant."
        icon={<ShieldCheck />}
        titulo="Licenca"
      />
      {proprietario.license ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Info label="Plano atual" valor={proprietario.plan?.name ?? "Sem plano"} />
          <Info label="Status" valor={obterStatusLicenca(proprietario)} />
          <Info label="Inicio" valor={formatarData(proprietario.license.starts_at)} />
          <Info
            label="Vencimento"
            valor={
              proprietario.license.expires_at
                ? formatarData(proprietario.license.expires_at)
                : "Sem vencimento"
            }
          />
          <Info label="Limite de casas" valor={String(limites.propriedades)} />
          <Info label="Limite de unidades" valor={String(limites.unidades)} />
          <Info label="Limite de funcionarios" valor={limites.funcionarios} />
        </div>
      ) : (
        <EstadoVazio texto="Nenhuma licenca vinculada a este proprietario." />
      )}
      <p className="text-xs text-muted-foreground">
        Renovacao, troca de plano e limites ficam disponiveis na acao Editar e no modulo Licencas.
      </p>
    </div>
  );
}
