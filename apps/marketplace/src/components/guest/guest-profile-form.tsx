import { Mail, MapPin, Phone, User } from "lucide-react";
import type { ComponentType, ReactNode } from "react";

import { GlassCard, GlassInput } from "@hospedex/ui";

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
          <h1 className="mt-2 text-3xl font-semibold">Dados do hospede</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Atualize apenas dados basicos usados nas reservas.
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
        <Campo label="Nome" icon={User}>
          <GlassInput defaultValue={perfil.nome ?? ""} name="nome" required />
        </Campo>
        <Campo label="E-mail" icon={Mail}>
          <GlassInput defaultValue={perfil.email} disabled type="email" />
        </Campo>
        <Campo label="Telefone" icon={Phone}>
          <GlassInput defaultValue={perfil.telefone ?? ""} name="telefone" />
        </Campo>
        <Campo label="CPF opcional" icon={User}>
          <GlassInput defaultValue={perfil.documento ?? ""} name="documento" />
        </Campo>
        <Campo label="Cidade" icon={MapPin}>
          <GlassInput defaultValue={perfil.cidade ?? ""} name="cidade" />
        </Campo>
        <Campo label="Estado" icon={MapPin}>
          <GlassInput defaultValue={perfil.estado ?? ""} maxLength={2} name="estado" />
        </Campo>
        <div className="sm:col-span-2">
          <FormSubmitButton pendingText="Salvando...">Salvar perfil</FormSubmitButton>
        </div>
      </form>
    </GlassCard>
  );
}

function Campo({
  children,
  icon: Icone,
  label
}: {
  children: ReactNode;
  icon: ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <div className="relative">
        <Icone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <div className="[&_input]:pl-10">{children}</div>
      </div>
    </label>
  );
}
