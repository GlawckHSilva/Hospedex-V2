"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { criarClienteSupabaseServer } from "../supabase/server";

const BUCKET_AVATARES = "hospedex-profile-avatars";
const LIMITE_AVATAR_BYTES = 5 * 1024 * 1024;
const MIME_AVATAR: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

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
    redirect(`/login?erro=${encodeURIComponent("Não foi possível entrar.")}`);
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
    redirect(`/cadastro?erro=${encodeURIComponent("Não foi possível criar sua conta.")}`);
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

  const { data: perfilAtual } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", usuario.id)
    .maybeSingle<{ avatar_url: string | null }>();
  const removerAvatar = formData.get("removerAvatar") === "1";
  const arquivoAvatar = formData.get("avatar");
  const avatarUrl = removerAvatar
    ? null
    : await enviarAvatarHospede(supabase, usuario.id, arquivoAvatar);

  const { error } = await supabase
    .from("profiles")
    .update({
      ...(removerAvatar || avatarUrl ? { avatar_url: avatarUrl } : {}),
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

  if ((removerAvatar || avatarUrl) && perfilAtual?.avatar_url) {
    await removerAvatarAntigo(supabase, perfilAtual.avatar_url);
  }

  revalidatePath("/perfil");
  revalidatePath("/minhas-reservas");
  revalidatePath("/reservas");
  revalidatePath("/pendencias");
  redirect("/perfil?sucesso=perfil");
}

export async function cancelarReservaHospedeAction(formData: FormData) {
  const reservaId = textoObrigatorio(formData, "reservaId", "reserva");
  const motivo = textoOpcional(formData, "motivo");
  const caminhoReserva = `/minhas-reservas/${reservaId}`;
  const supabase = await criarClienteSupabaseServer();

  if (!supabase) {
    redirect(`${caminhoReserva}?erro=${encodeURIComponent("Não foi possível conectar ao Supabase.")}`);
  }

  const { data: usuarioResultado } = await supabase.auth.getUser();
  if (!usuarioResultado.user) redirect("/login");

  const { error } = await supabase.rpc("cancel_guest_reservation", {
    p_reason: motivo,
    p_reservation_id: reservaId
  });

  if (error) {
    console.error("Erro ao cancelar reserva pelo hospede.", error);
    redirect(`${caminhoReserva}?erro=${encodeURIComponent(traduzirErroCancelamentoHospede(error.message))}`);
  }

  revalidatePath("/minhas-reservas");
  revalidatePath(caminhoReserva);
  redirect(`${caminhoReserva}?sucesso=reserva-cancelada`);
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

async function enviarAvatarHospede(
  supabase: NonNullable<Awaited<ReturnType<typeof criarClienteSupabaseServer>>>,
  userId: string,
  arquivo: FormDataEntryValue | null
) {
  if (!(arquivo instanceof File) || arquivo.size === 0) return null;
  if (arquivo.size > LIMITE_AVATAR_BYTES) {
    redirect("/perfil?erro=avatar-tamanho");
  }

  const extensao = MIME_AVATAR[arquivo.type];
  if (!extensao || !(await arquivoPareceImagemValida(arquivo))) {
    redirect("/perfil?erro=avatar-formato");
  }

  const caminho = `${userId}/avatar-${Date.now()}.${extensao}`;
  const { error } = await supabase.storage
    .from(BUCKET_AVATARES)
    .upload(caminho, arquivo, {
      cacheControl: "3600",
      contentType: arquivo.type,
      upsert: true
    });

  if (error) {
    console.error("Erro ao enviar avatar do hospede.", error);
    redirect("/perfil?erro=avatar-upload");
  }

  return supabase.storage.from(BUCKET_AVATARES).getPublicUrl(caminho).data.publicUrl;
}

async function arquivoPareceImagemValida(arquivo: File) {
  const bytes = new Uint8Array(await arquivo.slice(0, 12).arrayBuffer());
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png =
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47;
  const webp =
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50;

  return jpeg || png || webp;
}

async function removerAvatarAntigo(
  supabase: NonNullable<Awaited<ReturnType<typeof criarClienteSupabaseServer>>>,
  avatarUrl: string
) {
  const marcador = `/storage/v1/object/public/${BUCKET_AVATARES}/`;
  const indice = avatarUrl.indexOf(marcador);
  if (indice < 0) return;

  const caminho = decodeURIComponent(avatarUrl.slice(indice + marcador.length));
  if (!caminho) return;
  await supabase.storage.from(BUCKET_AVATARES).remove([caminho]);
}

function traduzirErroCancelamentoHospede(mensagemBanco: string) {
  const mensagem = mensagemBanco.toLocaleLowerCase("pt-BR");

  if (mensagem.includes("entre")) return "Entre novamente para cancelar esta reserva.";
  if (mensagem.includes("nao encontrada")) return "Reserva não encontrada para esta conta.";
  if (mensagem.includes("ja foi cancelada")) return "Esta reserva ja foi cancelada.";
  if (mensagem.includes("hospedagem") || mensagem.includes("encerrada")) {
    return "Esta reserva já está em hospedagem ou encerrada. Fale com o proprietário.";
  }
  if (mensagem.includes("calendario")) return "Não foi possível liberar o período no calendário.";
  if (mensagem.includes("financeiro")) return "Não foi possível atualizar o financeiro da reserva.";

  return "Não foi possível cancelar a reserva.";
}

async function obterBaseUrl() {
  const cabecalhos = await headers();
  const host = cabecalhos.get("host") ?? "localhost:3000";
  const protocolo = cabecalhos.get("x-forwarded-proto") ?? "http";

  return `${protocolo}://${host}`;
}
