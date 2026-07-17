import { redirect } from "next/navigation";

import { SettingsModule } from "../../../components/settings/settings-module";
import { exigirAutenticacao } from "../../../lib/auth/context";
import {
  carregarDadosConfiguracoesGerenciamento,
  podeLerConfiguracoes
} from "../../../lib/settings/data";

/**
 * Configuracoes do Gerenciamento.
 *
 * Super Admin possui configuracoes proprias em /super-admin/configuracoes. Esta
 * rota e exclusiva para tenant de proprietario/equipe e respeita feature flags.
 */

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ConfiguracoesPage({ searchParams }: PageProps) {
  const contexto = await exigirAutenticacao();

  if (!contexto.tenant) {
    redirect(
      contexto.role === "super_admin"
        ? "/super-admin"
        : "/sem-acesso?motivo=tenant-nao-encontrado"
    );
  }

  if (!podeLerConfiguracoes(contexto)) {
    redirect("/sem-acesso?motivo=permissao-insuficiente");
  }

  const params = await searchParams;
  const dados = await carregarDadosConfiguracoesGerenciamento(contexto);
  const erro = lerParametro(params, "erro");
  const sucesso = lerParametro(params, "sucesso");

  return (
    <>
      <SettingsModule
        {...dados}
        {...(erro ? { erro } : {})}
        {...(sucesso ? { sucesso } : {})}
      />
    </>
  );
}

function lerParametro(
  params: Record<string, string | string[] | undefined>,
  chave: string
): string | undefined {
  const valor = params[chave];
  return Array.isArray(valor) ? valor[0] : valor;
}
