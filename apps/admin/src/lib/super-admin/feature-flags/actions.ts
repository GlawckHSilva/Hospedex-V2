"use server";

import type { FeatureFlagRow } from "@hospedex/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirSuperAdmin } from "../../auth/context";
import { criarClienteSupabaseServer } from "../../supabase/server";
import { FEATURE_FLAGS_CONTROLADAS } from "./config";

const CAMINHO_FLAGS = "/super-admin/feature-flags";

type SupabaseServer = Awaited<ReturnType<typeof criarClienteSupabaseServer>>;

export async function alternarFeatureFlagAction(formData: FormData) {
  const contexto = await exigirSuperAdmin();
  const supabase = await criarClienteSupabaseServer();
  const key = textoObrigatorio(formData, "key", "feature flag");
  const ativa = textoObrigatorio(formData, "ativa", "status") === "true";
  const config = FEATURE_FLAGS_CONTROLADAS.find((flag) => flag.key === key);

  if (!config) {
    redirect(`${CAMINHO_FLAGS}?erro=${encodeURIComponent("Feature flag nao controlada.")}`);
  }

  try {
    const { data, error } = await supabase
      .from("feature_flags")
      .upsert(
        {
          default_enabled: ativa,
          description: config.descricao,
          key: config.key,
          module: config.module,
          owner_configurable: config.ownerConfigurable
        },
        { onConflict: "key" }
      )
      .select("*")
      .single<FeatureFlagRow>();

    if (error || !data) throw new Error(error?.message ?? "Feature flag nao retornada.");

    await registrarAuditoria(supabase, contexto.userId, data, "super_admin.feature_flag.toggled");
    revalidarModulo();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao alternar feature flag.");
  }

  redirect(`${CAMINHO_FLAGS}?sucesso=feature-flag-atualizada`);
}

async function registrarAuditoria(
  supabase: SupabaseServer,
  actorId: string,
  flag: FeatureFlagRow,
  action: string
) {
  const { error } = await supabase.from("audit_logs").insert({
    action,
    actor_id: actorId,
    entity_id: flag.id,
    entity_table: "feature_flags",
    metadata: { key: flag.key },
    tenant_id: null
  });

  if (error) console.error("Erro ao registrar auditoria de feature flag.", error.message);
}

function textoObrigatorio(formData: FormData, chave: string, label: string): string {
  const valor = formData.get(chave)?.toString().trim();
  if (!valor) throw new ErroRegraFeatureFlag(`Informe ${label}.`);
  return valor;
}

function redirecionarComErro(erro: unknown, mensagemLog: string): never {
  const mensagem =
    erro instanceof ErroRegraFeatureFlag
      ? erro.message
      : "Nao foi possivel concluir a operacao da feature flag.";

  if (!(erro instanceof ErroRegraFeatureFlag)) {
    console.error(mensagemLog, erro);
  }

  redirect(`${CAMINHO_FLAGS}?erro=${encodeURIComponent(mensagem)}`);
}

function revalidarModulo() {
  revalidatePath(CAMINHO_FLAGS);
  revalidatePath("/super-admin");
}

class ErroRegraFeatureFlag extends Error {}
