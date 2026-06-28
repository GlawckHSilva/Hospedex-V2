"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { criarClienteSupabaseServer } from "../supabase/server";

export async function loginHospedeAction(formData: FormData) {
  const email = textoObrigatorio(formData, "email", "e-mail");
  const senha = textoObrigatorio(formData, "senha", "senha");

  const supabase = await criarClienteSupabaseServer();
  if (!supabase) redirect("/login?erro=supabase");

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: senha
  });

  if (error) {
    redirect(`/login?erro=${encodeURIComponent("Nao foi possivel entrar.")}`);
  }

  await supabase.rpc("link_guest_reservations");
  redirect("/minhas-reservas");
}

export async function cadastroHospedeAction(formData: FormData) {
  const nome = textoObrigatorio(formData, "nome", "nome");
  const email = textoObrigatorio(formData, "email", "e-mail");
  const telefone = textoOpcional(formData, "telefone");
  const senha = textoObrigatorio(formData, "senha", "senha");

  const supabase = await criarClienteSupabaseServer();
  if (!supabase) redirect("/cadastro?erro=supabase");

  const { data, error } = await supabase.auth.signUp({
    email,
    options: {
      data: {
        full_name: nome,
        phone: telefone,
        profile_context: "guest"
      },
      emailRedirectTo: `${await obterBaseUrl()}/login?cadastro=confirmado`
    },
    password: senha
  });

  if (error) {
    redirect(`/cadastro?erro=${encodeURIComponent("Nao foi possivel criar sua conta.")}`);
  }

  if (data.session) {
    await supabase.rpc("link_guest_reservations");
    redirect("/minhas-reservas");
  }

  redirect("/login?cadastro=sucesso");
}

export async function recuperarSenhaHospedeAction(formData: FormData) {
  const email = textoObrigatorio(formData, "email", "e-mail");
  const supabase = await criarClienteSupabaseServer();
  if (!supabase) redirect("/login?erro=supabase");

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await obterBaseUrl()}/login`
  });

  redirect("/login?recuperacao=enviada");
}

export async function sairHospedeAction() {
  const supabase = await criarClienteSupabaseServer();
  await supabase?.auth.signOut();
  redirect("/login");
}

export async function atualizarPerfilHospedeAction(formData: FormData) {
  const supabase = await criarClienteSupabaseServer();
  if (!supabase) redirect("/perfil?erro=supabase");

  const { data: usuarioResultado } = await supabase.auth.getUser();
  const usuario = usuarioResultado.user;
  if (!usuario) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({
      city: textoOpcional(formData, "cidade"),
      document_number: textoOpcional(formData, "documento"),
      full_name: textoObrigatorio(formData, "nome", "nome"),
      phone: textoOpcional(formData, "telefone"),
      state: textoOpcional(formData, "estado")
    })
    .eq("id", usuario.id);

  if (error) {
    console.error("Erro ao atualizar perfil do hospede.", error);
    redirect("/perfil?erro=perfil");
  }

  revalidatePath("/perfil");
  revalidatePath("/minhas-reservas");
  redirect("/perfil?sucesso=perfil");
}

function textoObrigatorio(formData: FormData, chave: string, label: string) {
  const valor = formData.get(chave)?.toString().trim();
  if (!valor) throw new Error(`Informe ${label}.`);
  return valor;
}

function textoOpcional(formData: FormData, chave: string) {
  const valor = formData.get(chave)?.toString().trim();
  return valor || null;
}

async function obterBaseUrl() {
  const cabecalhos = await headers();
  const host = cabecalhos.get("host") ?? "localhost:3000";
  const protocolo = cabecalhos.get("x-forwarded-proto") ?? "http";

  return `${protocolo}://${host}`;
}
