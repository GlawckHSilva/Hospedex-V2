"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirAutenticacao } from "../auth/context";
import { criarClienteSupabaseServer } from "../supabase/server";
import {
  carregarNotificacoesGerenciamento,
  podeUsarNotificacoesGerenciamento
} from "./data";

const CAMINHO_NOTIFICACOES = "/notificacoes";

class ErroNotificacao extends Error {}

type EscopoNotificacao = {
  tenantId: string;
  userId: string;
};

export async function marcarNotificacaoLidaAction(formData: FormData) {
  const escopo = await carregarEscopoNotificacao();

  try {
    await salvarEstado(escopo, textoObrigatorio(formData, "notificationKey", "notificacao"), {
      read_at: new Date().toISOString()
    });
    revalidarNotificacoes();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao marcar notificacao como lida.");
  }

  redirect(`${CAMINHO_NOTIFICACOES}?sucesso=notificacao-lida`);
}

export async function marcarTodasNotificacoesLidasAction() {
  const contexto = await exigirAutenticacao();

  if (!contexto.tenant) {
    redirect("/sem-acesso?motivo=tenant-nao-encontrado");
  }

  if (!contexto.featureFlags.notifications) {
    redirect("/sem-acesso?motivo=feature-flag-desabilitada");
  }

  if (!podeUsarNotificacoesGerenciamento(contexto)) {
    redirect("/sem-acesso?motivo=permissao-insuficiente");
  }

  try {
    const dados = await carregarNotificacoesGerenciamento(contexto, {
      status: "nao_lidas",
      tipo: "todos"
    });
    const agora = new Date().toISOString();
    const supabase = await criarClienteSupabaseServer();
    const linhas = dados.itens.map((item) => ({
      notification_key: item.key,
      read_at: agora,
      tenant_id: contexto.tenant!.id,
      user_id: contexto.userId
    }));

    if (linhas.length) {
      const { error } = await supabase
        .from("management_notification_states")
        .upsert(linhas, { onConflict: "tenant_id,user_id,notification_key" });

      if (error) throw new Error(error.message);
    }

    revalidarNotificacoes();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao marcar todas notificacoes como lidas.");
  }

  redirect(`${CAMINHO_NOTIFICACOES}?sucesso=todas-lidas`);
}

export async function excluirNotificacaoAction(formData: FormData) {
  const escopo = await carregarEscopoNotificacao();

  try {
    await salvarEstado(escopo, textoObrigatorio(formData, "notificationKey", "notificacao"), {
      deleted_at: new Date().toISOString(),
      read_at: new Date().toISOString()
    });
    revalidarNotificacoes();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao excluir notificacao.");
  }

  redirect(`${CAMINHO_NOTIFICACOES}?sucesso=notificacao-excluida`);
}

async function carregarEscopoNotificacao(): Promise<EscopoNotificacao> {
  const contexto = await exigirAutenticacao();

  if (!contexto.tenant) {
    redirect(
      contexto.role === "super_admin"
        ? "/super-admin"
        : "/sem-acesso?motivo=tenant-nao-encontrado"
    );
  }

  if (!contexto.featureFlags.notifications) {
    redirect("/sem-acesso?motivo=feature-flag-desabilitada");
  }

  if (!podeUsarNotificacoesGerenciamento(contexto)) {
    redirect("/sem-acesso?motivo=permissao-insuficiente");
  }

  return {
    tenantId: contexto.tenant.id,
    userId: contexto.userId
  };
}

async function salvarEstado(
  escopo: EscopoNotificacao,
  notificationKey: string,
  dados: { deleted_at?: string; read_at?: string }
) {
  const supabase = await criarClienteSupabaseServer();
  const { error } = await supabase.from("management_notification_states").upsert(
    {
      ...dados,
      notification_key: notificationKey,
      tenant_id: escopo.tenantId,
      user_id: escopo.userId
    },
    { onConflict: "tenant_id,user_id,notification_key" }
  );

  if (error) throw new Error(error.message);
}

function textoObrigatorio(formData: FormData, chave: string, label: string): string {
  const valor = formData.get(chave)?.toString().trim();
  if (!valor) throw new ErroNotificacao(`Informe ${label}.`);
  return valor;
}

function redirecionarComErro(erro: unknown, mensagemLog: string): never {
  const mensagem =
    erro instanceof ErroNotificacao ? erro.message : "Nao foi possivel atualizar a notificacao.";

  if (!(erro instanceof ErroNotificacao)) {
    console.error(mensagemLog, erro);
  }

  redirect(`${CAMINHO_NOTIFICACOES}?erro=${encodeURIComponent(mensagem)}`);
}

function revalidarNotificacoes() {
  revalidatePath(CAMINHO_NOTIFICACOES);
  revalidatePath("/");
  revalidatePath("/pendencias");
  revalidatePath("/confirmacoes");
  revalidatePath("/reservas");
  revalidatePath("/limpeza");
}
