"use client";

import { Camera, Mail, MapPin, Phone, Trash2, User } from "lucide-react";
import { useMemo, useState } from "react";

import { GlassCard, GlassInput } from "@hospedex/ui";

import {
  MarketplaceIconField,
  marketplaceInputWithIconClass,
} from "../forms/marketplace-icon-field";
import { atualizarPerfilHospedeAction, sairHospedeAction } from "../../lib/guest/actions";
import type { PerfilHospede } from "../../lib/guest/types";
import { FormSubmitButton } from "./form-submit-button";

export function GuestProfileForm({
  mensagem,
  perfil
}: {
  mensagem: string | null;
  perfil: PerfilHospede;
}) {
  const [previewAvatar, setPreviewAvatar] = useState(perfil.avatarUrl);
  const iniciais = useMemo(() => obterIniciais(perfil.nome ?? perfil.email), [
    perfil.email,
    perfil.nome
  ]);

  return (
    <GlassCard className="p-6">
      <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            Meu perfil
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Dados do hóspede</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Atualize apenas dados básicos usados nas reservas.
          </p>
        </div>
        <form action={sairHospedeAction}>
          <button className="text-sm font-medium text-muted-foreground transition hover:text-foreground" type="submit">
            Sair
          </button>
        </form>
      </div>

      {mensagem ? (
        <div className="mt-5 rounded-lg border border-primary/25 bg-primary/10 p-3 text-sm text-primary">
          {mensagem}
        </div>
      ) : null}

      <form
        action={atualizarPerfilHospedeAction}
        className="mt-6 grid gap-4 sm:grid-cols-2"
      >
        <div className="sm:col-span-2">
          <div className="flex flex-col gap-4 rounded-2xl border border-border bg-background/35 p-4 sm:flex-row sm:items-center">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-primary/30 bg-primary/10 text-xl font-semibold text-primary">
              {previewAvatar ? (
                <img
                  alt="Foto do perfil"
                  className="h-full w-full object-cover"
                  src={previewAvatar}
                />
              ) : (
                iniciais
              )}
            </div>
            <div className="grid gap-2">
              <p className="text-sm font-semibold text-foreground">Foto do perfil</p>
              <p className="text-sm text-muted-foreground">
                Use JPG, PNG ou WebP com ate 5 MB. A foto aparece nas suas
                reservas para o anfitriao.
              </p>
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-primary/25 px-3 py-2 text-sm font-medium text-primary transition hover:bg-primary/10">
                  <Camera className="h-4 w-4" />
                  Trocar foto
                  <input
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    name="avatar"
                    onChange={(evento) => {
                      const arquivo = evento.currentTarget.files?.[0];
                      if (arquivo) {
                        setPreviewAvatar(URL.createObjectURL(arquivo));
                      }
                    }}
                    type="file"
                  />
                </label>
                {perfil.avatarUrl ? (
                  <button
                    className="inline-flex items-center gap-2 rounded-lg border border-destructive/35 px-3 py-2 text-sm font-medium text-destructive transition hover:bg-destructive/10"
                    name="removerAvatar"
                    type="submit"
                    value="1"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remover foto
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <MarketplaceIconField label="Nome" icon={User}>
          <GlassInput
            className={marketplaceInputWithIconClass}
            defaultValue={perfil.nome ?? ""}
            name="nome"
            required
          />
        </MarketplaceIconField>
        <MarketplaceIconField label="E-mail" icon={Mail}>
          <GlassInput
            className={marketplaceInputWithIconClass}
            defaultValue={perfil.email}
            disabled
            type="email"
          />
        </MarketplaceIconField>
        <MarketplaceIconField label="Telefone" icon={Phone}>
          <GlassInput
            className={marketplaceInputWithIconClass}
            defaultValue={perfil.telefone ?? ""}
            name="telefone"
          />
        </MarketplaceIconField>
        <MarketplaceIconField label="CPF opcional" icon={User}>
          <GlassInput
            className={marketplaceInputWithIconClass}
            defaultValue={perfil.documento ?? ""}
            name="documento"
          />
        </MarketplaceIconField>
        <MarketplaceIconField label="Cidade" icon={MapPin}>
          <GlassInput
            className={marketplaceInputWithIconClass}
            defaultValue={perfil.cidade ?? ""}
            name="cidade"
          />
        </MarketplaceIconField>
        <MarketplaceIconField label="Estado" icon={MapPin}>
          <GlassInput
            className={marketplaceInputWithIconClass}
            defaultValue={perfil.estado ?? ""}
            maxLength={2}
            name="estado"
          />
        </MarketplaceIconField>
        <div className="sm:col-span-2">
          <FormSubmitButton pendingText="Salvando...">Salvar perfil</FormSubmitButton>
        </div>
      </form>
    </GlassCard>
  );
}

function obterIniciais(valor: string) {
  return valor
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("");
}
