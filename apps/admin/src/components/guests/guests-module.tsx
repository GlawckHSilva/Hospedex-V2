import { Search, ShieldAlert, Star, UserRound, UsersRound } from "lucide-react";
import type { ReactNode } from "react";

import { Badge, Button, Card, CardContent, FadeIn, Input, Label } from "@hospedex/ui";

import { ModuleToast } from "../admin/module-toast";
import {
  LABEL_STATUS_HOSPEDE_CRM,
  STATUS_HOSPEDE_CRM,
  type DadosModuloHospedes,
  type SearchParamsHospedes
} from "../../lib/guests/types";
import { GuestCard } from "./guest-card";

/**
 * Modulo de Hospedes e CRM.
 *
 * A tela entrega CRM operacional sem disparos reais de WhatsApp ou e-mail. Essas
 * integracoes ficam apenas preparadas no modelo de dados.
 */

export type GuestsModuleProps = DadosModuloHospedes & SearchParamsHospedes;

const MENSAGENS_SUCESSO_HOSPEDES: Record<string, string> = {
  "hospede-atualizado": "Hospede atualizado com sucesso.",
  "hospede-excluido": "Hospede excluido com sucesso.",
  "status-hospede": "Status do hospede atualizado."
};

const campoClasse =
  "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function GuestsModule({
  erro,
  filtros,
  hospedes,
  podeGerenciar,
  resumo,
  sucesso,
  tenantNome
}: GuestsModuleProps) {
  return (
    <FadeIn className="space-y-5">
      <ModuleToast
        erro={erro}
        mensagensSucesso={MENSAGENS_SUCESSO_HOSPEDES}
        sucesso={sucesso}
      />

      <section className="admin-glass-panel p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Badge variant={podeGerenciar ? "info" : "warning"}>
              {podeGerenciar ? "CRM editavel" : "Somente leitura"}
            </Badge>
            <h1 className="mt-3 text-2xl font-semibold tracking-normal">Hospedes e CRM</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {tenantNome} · WhatsApp, e-mails, campanhas e fidelizacao preparados para etapas futuras.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Resumo icon={<UsersRound />} label="Total" valor={String(resumo.total)} />
            <Resumo icon={<UserRound />} label="Ativos" valor={String(resumo.ativos)} />
            <Resumo icon={<ShieldAlert />} label="Atencao" valor={String(resumo.atencao)} />
            <Resumo icon={<Star />} label="Bloqueados" valor={String(resumo.bloqueados)} />
          </div>
        </div>
      </section>

      <Card className="admin-glass-card">
        <CardContent className="p-5">
          <form className="grid gap-4 lg:grid-cols-[1fr_0.6fr_auto]">
            <CampoBusca defaultValue={filtros.busca ?? ""} />
            <CampoStatus defaultValue={filtros.status ?? "todos"} />
            <div className="flex items-end">
              <Button className="w-full" type="submit" variant="outline">
                <Search />
                Filtrar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {hospedes.length > 0 ? (
        <section className="grid gap-5">
          {hospedes.map((hospede) => (
            <GuestCard hospede={hospede} key={hospede.id} podeGerenciar={podeGerenciar} />
          ))}
        </section>
      ) : (
        <Card className="admin-glass-card">
          <CardContent className="p-5 text-sm text-muted-foreground">
            Nenhum hospede encontrado. Hospedes serao consolidados a partir das reservas criadas.
          </CardContent>
        </Card>
      )}
    </FadeIn>
  );
}

function Resumo({
  icon,
  label,
  valor
}: {
  icon: ReactNode;
  label: string;
  valor: string;
}) {
  return (
    <div className="min-w-36 rounded-lg border bg-background/55 p-3 text-sm">
      <div className="mb-2 text-primary [&_svg]:h-4 [&_svg]:w-4">{icon}</div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate font-semibold">{valor}</p>
    </div>
  );
}

function CampoBusca({ defaultValue }: { defaultValue: string }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="busca">Busca</Label>
      <Input
        defaultValue={defaultValue}
        id="busca"
        name="busca"
        placeholder="Nome, telefone ou e-mail"
      />
    </div>
  );
}

function CampoStatus({ defaultValue }: { defaultValue: string }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="status">Status</Label>
      <select className={campoClasse} defaultValue={defaultValue} id="status" name="status">
        {STATUS_HOSPEDE_CRM.map((status) => (
          <option key={status} value={status}>
            {LABEL_STATUS_HOSPEDE_CRM[status]}
          </option>
        ))}
      </select>
    </div>
  );
}
