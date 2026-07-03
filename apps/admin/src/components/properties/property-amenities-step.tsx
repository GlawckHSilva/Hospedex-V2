"use client";

import type { AmenityRow } from "@hospedex/types";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Input, Label } from "@hospedex/ui";

import { ActionButton } from "../management/action-button";

/**
 * Etapa reutilizavel de comodidades do cadastro de Casas.
 *
 * Comodidades do sistema apenas criam vinculo com a casa. Itens personalizados
 * podem ser renomeados sem permitir alteracao de dados pertencentes a outro tenant.
 */
export function PropertyAmenitiesStep({
  comodidades,
  disabled,
  onQuantidadeValidaChange,
  selecionadas,
}: {
  comodidades: AmenityRow[];
  disabled: boolean;
  onQuantidadeValidaChange?: (quantidade: number) => void;
  selecionadas: Set<string>;
}) {
  const [novaComodidade, setNovaComodidade] = useState("");
  const [personalizadas, setPersonalizadas] = useState<string[]>([]);
  const [selecionadasSistema, setSelecionadasSistema] = useState(() =>
    new Set(
      comodidades
        .filter((comodidade) => comodidade.is_system && selecionadas.has(comodidade.id))
        .map((comodidade) => comodidade.id),
    ),
  );
  const [personalizadasExistentes, setPersonalizadasExistentes] = useState(() =>
    comodidades
      .filter((comodidade) => !comodidade.is_system)
      .map((comodidade) => ({
        id: comodidade.id,
        nome: comodidade.name,
        selecionada: selecionadas.has(comodidade.id),
      })),
  );
  const quantidadeComodidadesValidas = useMemo(
    () =>
      selecionadasSistema.size +
      personalizadas.filter((nome) => nome.trim()).length +
      personalizadasExistentes.filter(
        (comodidade) => comodidade.selecionada && comodidade.nome.trim(),
      ).length,
    [personalizadas, personalizadasExistentes, selecionadasSistema],
  );

  useEffect(() => {
    onQuantidadeValidaChange?.(quantidadeComodidadesValidas);
  }, [onQuantidadeValidaChange, quantidadeComodidadesValidas]);

  function adicionarComodidade() {
    const nome = novaComodidade.trim();
    const jaExiste = [
      ...personalizadas,
      ...personalizadasExistentes.map((item) => item.nome),
    ].some(
      (item) =>
        item.trim().toLocaleLowerCase("pt-BR") ===
        nome.toLocaleLowerCase("pt-BR"),
    );
    if (!nome || jaExiste) return;
    setPersonalizadas((atuais) => [...atuais, nome]);
    setNovaComodidade("");
  }

  function atualizarComodidadeExistente(
    id: string,
    dados: Partial<{ nome: string; selecionada: boolean }>,
  ) {
    setPersonalizadasExistentes((atuais) =>
      atuais.map((item) => (item.id === id ? { ...item, ...dados } : item)),
    );
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-xl border border-cyan-300/25 bg-cyan-500/10 p-4 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground">
          {quantidadeComodidadesValidas > 0
            ? `${quantidadeComodidadesValidas} comodidade${quantidadeComodidadesValidas === 1 ? "" : "s"} selecionada${quantidadeComodidadesValidas === 1 ? "" : "s"}`
            : "Nenhuma comodidade selecionada."}
        </p>
        <p className="mt-1 leading-6">
          As comodidades ajudam o hóspede a entender o que a hospedagem oferece.
          Adicione pelo menos uma para publicar a casa.
        </p>
      </div>

      <div className="grid gap-3 rounded-xl border bg-background/45 p-4">
        <div>
          <h4 className="font-semibold">Comodidades padrão</h4>
          <p className="text-sm text-muted-foreground">
            Selecione os itens principais que aparecem para o hóspede.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {comodidades
            .filter((comodidade) => comodidade.is_system)
            .map((comodidade) => (
              <label
                className="flex cursor-pointer items-center gap-3 rounded-xl border bg-background/45 px-3 py-3 text-sm transition hover:border-cyan-300/35 hover:bg-cyan-500/5"
                key={comodidade.id}
              >
                <input
                  checked={selecionadasSistema.has(comodidade.id)}
                  disabled={disabled}
                  name="comodidadeIds"
                  onChange={(evento) => {
                    setSelecionadasSistema((atuais) => {
                      const proximas = new Set(atuais);
                      if (evento.currentTarget.checked) {
                        proximas.add(comodidade.id);
                      } else {
                        proximas.delete(comodidade.id);
                      }
                      return proximas;
                    });
                  }}
                  type="checkbox"
                  value={comodidade.id}
                />
                {comodidade.name}
              </label>
            ))}
        </div>
      </div>

      {personalizadasExistentes.length ? (
        <div className="grid gap-3 rounded-xl border bg-background/45 p-4">
          <div>
            <h4 className="font-semibold">Comodidades personalizadas</h4>
            <p className="text-sm text-muted-foreground">
              Edite o nome ou remova o item desta casa.
            </p>
          </div>
          {personalizadasExistentes.map((comodidade) => (
            <div
              className="grid gap-2 rounded-xl border bg-background/55 p-3 sm:grid-cols-[auto_1fr_auto] sm:items-center"
              key={comodidade.id}
            >
              <input
                checked={comodidade.selecionada}
                disabled={disabled}
                name="comodidadeIds"
                onChange={(evento) =>
                  atualizarComodidadeExistente(comodidade.id, {
                    selecionada: evento.currentTarget.checked,
                  })
                }
                type="checkbox"
                value={comodidade.id}
              />
              <input
                name="comodidadePersonalizadaExistenteIds"
                type="hidden"
                value={comodidade.id}
              />
              <Input
                disabled={disabled}
                maxLength={80}
                name="comodidadePersonalizadaExistenteNomes"
                onChange={(evento) =>
                  atualizarComodidadeExistente(comodidade.id, {
                    nome: evento.currentTarget.value,
                  })
                }
                value={comodidade.nome}
              />
              <ActionButton
                aria-label={`Remover ${comodidade.nome}`}
                disabled={disabled}
                icon={<Trash2 className="h-4 w-4" />}
                onClick={() =>
                  setPersonalizadasExistentes((atuais) =>
                    atuais.filter((item) => item.id !== comodidade.id),
                  )
                }
                size="icon"
                type="button"
                variant="delete"
              >
                Remover
              </ActionButton>
            </div>
          ))}
        </div>
      ) : null}

      <div className="rounded-xl border bg-background/45 p-4">
        <Label htmlFor="novaComodidade">Nome da nova comodidade</Label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <Input
            disabled={disabled}
            id="novaComodidade"
            maxLength={80}
            onChange={(evento) => setNovaComodidade(evento.currentTarget.value)}
            placeholder="Ex.: Fogão a lenha, academia, canoa..."
            value={novaComodidade}
          />
          <ActionButton
            disabled={disabled}
            icon={<Plus className="h-4 w-4" />}
            onClick={adicionarComodidade}
            type="button"
            variant="add"
          >
            Adicionar comodidade
          </ActionButton>
        </div>

        {personalizadas.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {personalizadas.map((nome) => (
              <span
                className="inline-flex items-center gap-2 rounded-xl border bg-background/60 px-2 py-1 text-sm"
                key={nome}
              >
                <input
                  name="comodidadesPersonalizadas"
                  readOnly
                  type="hidden"
                  value={nome}
                />
                {nome}
                <ActionButton
                  aria-label={`Remover ${nome}`}
                  disabled={disabled}
                  icon={<Trash2 className="h-4 w-4" />}
                  onClick={() =>
                    setPersonalizadas((atuais) =>
                      atuais.filter((item) => item !== nome),
                    )
                  }
                  size="icon"
                  type="button"
                  variant="delete"
                >
                  Remover
                </ActionButton>
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
