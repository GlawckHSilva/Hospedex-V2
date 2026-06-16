import { AdminLayoutBase } from "../../components/admin/admin-layout-base";
import { SuperAdminDiagnostic } from "../../components/super-admin/super-admin-diagnostic";
import { SuperAdminDashboard } from "../../components/super-admin/super-admin-dashboard";
import { exigirSuperAdmin } from "../../lib/auth/context";
import { carregarDashboardSuperAdmin } from "../../lib/super-admin/data";

export const dynamic = "force-dynamic";

const TEMPO_LIMITE_SUPER_ADMIN_MS = 12_000;

export default async function SuperAdminPage() {
  try {
    const contexto = await comTimeout(
      exigirSuperAdmin(),
      "Sessao invalida, role nao encontrada ou permissoes insuficientes."
    );
    const dados = await comTimeout(
      carregarDashboardSuperAdmin(contexto),
      "Erro ao carregar dados do Super Admin."
    );

    return (
      <AdminLayoutBase contexto={contexto}>
        <SuperAdminDashboard {...dados} />
      </AdminLayoutBase>
    );
  } catch (erro) {
    if (erroEhRedirectNext(erro)) throw erro;

    return (
      <SuperAdminDiagnostic
        detalhe={erro instanceof Error ? erro.message : "Erro ao carregar dados do Super Admin."}
        titulo={classificarErroSuperAdmin(erro)}
      />
    );
  }
}

async function comTimeout<T>(consulta: Promise<T>, mensagem: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, rejeitar) => {
    timer = setTimeout(() => rejeitar(new Error(mensagem)), TEMPO_LIMITE_SUPER_ADMIN_MS);
  });

  try {
    return await Promise.race([consulta, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function erroEhRedirectNext(erro: unknown) {
  const digest =
    typeof erro === "object" && erro && "digest" in erro
      ? String((erro as { digest?: unknown }).digest)
      : "";

  return digest.includes("NEXT_REDIRECT");
}

function classificarErroSuperAdmin(erro: unknown) {
  const mensagem = erro instanceof Error ? erro.message : "";

  if (mensagem.includes("Vari")) return "Variaveis do Supabase ausentes.";
  if (mensagem.includes("Sessao") || mensagem.includes("sessao")) return "Sessao invalida.";
  if (mensagem.includes("profile") || mensagem.includes("Perfil")) return "Perfil nao encontrado.";
  if (mensagem.includes("role") || mensagem.includes("Role")) return "Role nao encontrada.";
  if (mensagem.includes("tenant") || mensagem.includes("Tenant")) return "Tenant nao encontrado.";
  if (mensagem.includes("permiss")) return "Permissoes insuficientes.";

  return "Erro ao carregar dados do Super Admin.";
}
