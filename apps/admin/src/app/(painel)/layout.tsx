import type { ReactNode } from "react";

import { AdminLayoutBase } from "../../components/admin/admin-layout-base";
import { exigirAutenticacao } from "../../lib/auth/context";

export const dynamic = "force-dynamic";

/**
 * Mantem o shell autenticado montado entre as rotas do Gerenciamento.
 * As paginas filhas continuam responsaveis pelas permissoes e dados do modulo.
 */
export default async function PainelLayout({ children }: { children: ReactNode }) {
  const contexto = await exigirAutenticacao();

  return <AdminLayoutBase contexto={contexto}>{children}</AdminLayoutBase>;
}
