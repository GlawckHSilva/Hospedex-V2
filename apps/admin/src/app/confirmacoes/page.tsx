import { redirect } from "next/navigation";

import { AdminLayoutBase } from "../../components/admin/admin-layout-base";
import { ConfirmationsModule } from "../../components/confirmations/confirmations-module";
import { exigirAutenticacao } from "../../lib/auth/context";
import {
  carregarDadosConfirmacoes,
  podeLerConfirmacoes
} from "../../lib/confirmations/data";

/**
 * Area de operacao diaria do tenant.
 *
 * Check-ins, check-outs, pagamentos e limpezas usam o mesmo contexto autenticado
 * para impedir que dados de um proprietario sejam exibidos para outro.
 */
export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ConfirmacoesPage({ searchParams }: PageProps) {
  const contexto = await exigirAutenticacao();

  if (!contexto.tenant) {
    redirect(
      contexto.role === "super_admin"
        ? "/super-admin"
        : "/sem-acesso?motivo=tenant-nao-encontrado"
    );
  }

  if (!podeLerConfirmacoes(contexto)) {
    redirect("/sem-acesso?motivo=permissao-insuficiente");
  }

  const params = await searchParams;
  const dados = await carregarDadosConfirmacoes(contexto);

  return (
    <AdminLayoutBase contexto={contexto}>
      <ConfirmationsModule
        {...dados}
        erro={lerParametro(params, "erro")}
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
