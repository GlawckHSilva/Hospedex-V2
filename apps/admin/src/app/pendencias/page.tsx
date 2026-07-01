import { redirect } from "next/navigation";

import { AdminLayoutBase } from "../../components/admin/admin-layout-base";
import { PendingModule } from "../../components/confirmations/confirmations-module";
import { exigirAutenticacao } from "../../lib/auth/context";
import {
  carregarDadosConfirmacoes,
  podeLerConfirmacoes
} from "../../lib/confirmations/data";

/**
 * Central operacional de pendências do tenant.
 *
 * Esta tela reaproveita a lógica de confirmação existente, mas deixa claro que
 * o módulo serve para apontar ações pendentes. A gestão completa fica em Reservas.
 */
export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PendenciasPage({ searchParams }: PageProps) {
  const contexto = await exigirAutenticacao();

  if (!contexto.tenant) {
    redirect(
      contexto.role === "super_admin"
        ? "/super-admin"
        : "/sem-acesso?motivo=tenant-nao-encontrado"
    );
  }

  if (!contexto.featureFlags.confirmations) {
    redirect("/sem-acesso?motivo=feature-flag-desabilitada");
  }

  if (!podeLerConfirmacoes(contexto)) {
    redirect("/sem-acesso?motivo=permissao-insuficiente");
  }

  const params = await searchParams;
  const dados = await carregarDadosConfirmacoes(contexto);

  return (
    <AdminLayoutBase contexto={contexto}>
      <PendingModule
        {...dados}
        erro={lerParametro(params, "erro")}
        filtroPagamento={lerParametro(params, "pagamento")}
        sucesso={lerParametro(params, "sucesso")}
        tenantNome={contexto.tenant.name}
      />
    </AdminLayoutBase>
  );
}

function lerParametro(
  params: Record<string, string | string[] | undefined>,
  chave: string
): string | undefined {
  const valor = params[chave];
  return Array.isArray(valor) ? valor[0] : valor;
}
