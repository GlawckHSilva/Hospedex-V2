import type { ComponentProps } from "react";

import { Button, Input, Label } from "@hospedex/ui";

import {
  atualizarFuncionarioAction,
  criarFuncionarioAction
} from "../../lib/staff/actions";
import type { CargoComPermissoes, FuncionarioRegistro } from "../../lib/staff/types";

export type FuncionarioFormProps = {
  cargos: CargoComPermissoes[];
  funcionario?: FuncionarioRegistro;
  modo: "criar" | "editar";
};

const campoClasse =
  "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function FuncionarioForm({ cargos, funcionario, modo }: FuncionarioFormProps) {
  const action = modo === "criar" ? criarFuncionarioAction : atualizarFuncionarioAction;
  const cargoPadrao = funcionario?.cargo?.role.id ?? cargos[0]?.role.id ?? "";
  const bloqueado = cargos.length === 0;

  return (
    <form action={action} className="grid gap-4">
      {funcionario?.member ? <input name="memberId" type="hidden" value={funcionario.member.id} /> : null}
      {funcionario?.convite ? <input name="conviteId" type="hidden" value={funcionario.convite.id} /> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <CampoTexto
          defaultValue={funcionario?.nome ?? ""}
          disabled={bloqueado}
          label="Nome"
          name="nome"
          required
        />
        <CampoTexto
          defaultValue={funcionario?.email ?? ""}
          disabled={bloqueado || Boolean(funcionario?.member)}
          label="Email"
          name="email"
          required
          type="email"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <CampoTexto
          defaultValue={funcionario?.telefone ?? ""}
          disabled={bloqueado}
          label="Telefone"
          name="telefone"
        />
        <div className="grid gap-2">
          <Label htmlFor={`role-${funcionario?.id ?? "novo"}`}>Cargo</Label>
          <select
            className={campoClasse}
            defaultValue={cargoPadrao}
            disabled={bloqueado}
            id={`role-${funcionario?.id ?? "novo"}`}
            name="roleId"
            required
          >
            {cargos.map((cargo) => (
              <option key={cargo.role.id} value={cargo.role.id}>
                {cargo.role.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {bloqueado ? (
        <p className="text-sm text-destructive">
          Cadastre ou gere os cargos iniciais antes de convidar funcionarios.
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button disabled={bloqueado} type="submit">
          {modo === "criar" ? "Criar convite" : "Salvar funcionario"}
        </Button>
      </div>
    </form>
  );
}

function CampoTexto({
  label,
  name,
  ...props
}: {
  label: string;
  name: string;
} & ComponentProps<typeof Input>) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} {...props} />
    </div>
  );
}
