"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { carregarContextoAutenticacao, obterCaminhoInicialPorRole } from "./context";
import { supabaseEstaConfigurado } from "../supabase/env";
import { criarClienteSupabaseServer } from "../supabase/server";

function obterCampo(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function comMensagem(path: string, message: string): string {
  const params = new URLSearchParams({ message });
  return `${path}?${params.toString()}`;
}

export async function entrarAction(formData: FormData) {
  if (!supabaseEstaConfigurado()) {
    redirect(comMensagem("/login", "Configure o Supabase para entrar."));
  }

  const supabase = await criarClienteSupabaseServer();
  const email = obterCampo(formData, "email");
  const password = obterCampo(formData, "password");

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(comMensagem("/login", "Não foi possível entrar."));

  const contexto = await carregarContextoAutenticacao();
  redirect(obterCaminhoInicialPorRole(contexto?.role ?? "guest"));
}

export async function cadastrarAction(formData: FormData) {
  if (!supabaseEstaConfigurado()) {
    redirect(comMensagem("/cadastro", "Configure o Supabase para criar contas."));
  }

  const supabase = await criarClienteSupabaseServer();
  const origin = (await headers()).get("origin") ?? "";
  const email = obterCampo(formData, "email");
  const password = obterCampo(formData, "password");
  const fullName = obterCampo(formData, "full_name");

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${origin}/auth/callback?next=/login`
    }
  });

  if (error) redirect(comMensagem("/cadastro", "Não foi possível criar a conta."));
  redirect(comMensagem("/login", "Cadastro criado. Verifique seu email se necessário."));
}

export async function recuperarSenhaAction(formData: FormData) {
  if (!supabaseEstaConfigurado()) {
    redirect(comMensagem("/recuperar-senha", "Configure o Supabase para recuperar senha."));
  }

  const supabase = await criarClienteSupabaseServer();
  const origin = (await headers()).get("origin") ?? "";
  const email = obterCampo(formData, "email");

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/nova-senha`
  });

  if (error) redirect(comMensagem("/recuperar-senha", "Não foi possível enviar o email."));
  redirect(comMensagem("/login", "Enviamos as instruções para seu email."));
}

export async function sairAction() {
  if (!supabaseEstaConfigurado()) {
    redirect("/login");
  }

  const supabase = await criarClienteSupabaseServer();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function atualizarSenhaAction(formData: FormData) {
  if (!supabaseEstaConfigurado()) {
    redirect(comMensagem("/nova-senha", "Configure o Supabase para alterar senha."));
  }

  const supabase = await criarClienteSupabaseServer();
  const password = obterCampo(formData, "password");

  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect(comMensagem("/nova-senha", "Não foi possível alterar a senha."));

  redirect(comMensagem("/login", "Senha atualizada. Entre novamente."));
}
