import type { PropertyRow } from "@hospedex/types";

/**
 * Centraliza a regra operacional de casas ativas.
 *
 * A exclusao de casa e logica para preservar financeiro e auditoria. Por isso,
 * os modulos operacionais devem ignorar registros ligados a propriedades
 * arquivadas, sem apagar lancamentos financeiros vinculados.
 */

type PropriedadeAtivaReferencia = Pick<PropertyRow, "id" | "deleted_at">;
type RegistroComPropriedade = { property_id: string | null };

export function criarIdsPropriedadesAtivas(
  propriedades: PropriedadeAtivaReferencia[]
): Set<string> {
  return new Set(
    propriedades
      .filter((propriedade) => !propriedade.deleted_at)
      .map((propriedade) => propriedade.id)
  );
}

export function filtrarPorPropriedadesAtivas<TRegistro extends RegistroComPropriedade>(
  registros: TRegistro[],
  propriedades: PropriedadeAtivaReferencia[] | ReadonlySet<string>
): TRegistro[] {
  const idsAtivos =
    Array.isArray(propriedades) ? criarIdsPropriedadesAtivas(propriedades) : propriedades;

  return registros.filter((registro) => {
    const propriedadeId = registro.property_id;
    if (!propriedadeId) return false;
    return idsAtivos.has(propriedadeId);
  });
}
