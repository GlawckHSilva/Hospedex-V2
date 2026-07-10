import { redirect } from "next/navigation";

import { AdminLayoutBase } from "../../components/admin/admin-layout-base";
import { InventoryModule } from "../../components/inventory/inventory-module";
import { exigirAutenticacao } from "../../lib/auth/context";
import { carregarDadosModuloInventario } from "../../lib/inventory/data";
import { podeLerInventario } from "../../lib/inventory/permissions";

/**
 * Pagina de Inventario e Manutencao da V2.
 *
 * O Super Admin nao acessa dados de tenants por esta rota. Proprietario e
 * funcionarios precisam de contexto e permissao do tenant atual.
 */

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function InventarioPage({ searchParams }: PageProps) {
  const contexto = await exigirAutenticacao();

  if (!contexto.tenant) {
    redirect(contexto.role === "super_admin" ? "/super-admin" : "/sem-acesso");
  }

  if (!contexto.featureFlags.inventory) {
    redirect("/sem-acesso?motivo=feature-flag-desabilitada");
  }

  if (!podeLerInventario(contexto)) {
    redirect("/sem-acesso?motivo=permissao-insuficiente");
  }

  const params = await searchParams;
  const filtros = montarFiltros(params);
  const dados = await carregarDadosModuloInventario(contexto, filtros);

  return (
    <AdminLayoutBase contexto={contexto}>
      <InventoryModule
        {...dados}
        erro={lerParametro(params, "erro")}
        sucesso={lerParametro(params, "sucesso")}
      />
    </AdminLayoutBase>
  );
}

function montarFiltros(params: Record<string, string | string[] | undefined>) {
  const filtros: {
    propriedadeId?: string;
  } = {};
  const propriedadeId = lerParametro(params, "propriedadeId");

  if (propriedadeId) filtros.propriedadeId = propriedadeId;
  return filtros;
}

function lerParametro(
  params: Record<string, string | string[] | undefined>,
  chave: string
): string | undefined {
  const valor = params[chave];
  return Array.isArray(valor) ? valor[0] : valor;
}
