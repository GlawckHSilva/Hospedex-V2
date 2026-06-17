import { redirect } from "next/navigation";

import { AdminLayoutBase } from "../../components/admin/admin-layout-base";
import { PropertyModule } from "../../components/properties/property-module";
import { exigirAutenticacao } from "../../lib/auth/context";
import {
  carregarDadosModuloPropriedades,
  podeLerPropriedades
} from "../../lib/properties/data";

/**
 * Página de Propriedades do Admin V2.
 *
 * O tenant autenticado é obrigatório porque propriedades nunca podem ser listadas
 * fora do escopo do cliente atual.
 */

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PropriedadesPage({ searchParams }: PageProps) {
  const contexto = await exigirAutenticacao();

  if (!contexto.tenant) {
    redirect(
      contexto.role === "super_admin"
        ? "/super-admin"
        : "/sem-acesso?motivo=tenant-nao-encontrado"
    );
  }

  if (!podeLerPropriedades(contexto)) {
    redirect("/sem-acesso?motivo=permissao-insuficiente");
  }

  const params = await searchParams;
  const dados = await carregarDadosModuloPropriedades(contexto);

  return (
    <AdminLayoutBase contexto={contexto}>
      <PropertyModule
        {...dados}
        erro={lerParametro(params, "erro")}
        modo="propriedades"
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
