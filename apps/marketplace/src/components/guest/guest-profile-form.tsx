import { Mail, MapPin, Phone, User } from "lucide-react";

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

      <form action={atualizarPerfilHospedeAction} className="mt-6 grid gap-4 sm:grid-cols-2">
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
