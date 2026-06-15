import type {
  CalendarAvailabilityBlockRow,
  CalendarAvailabilityStatus,
  PropertyRow,
  ReservationGuestRow,
  ReservationRow,
  UnitRow
} from "@hospedex/types";

/**
 * Contratos do módulo de Calendário.
 *
 * A UI recebe dados já isolados por tenant. A regra de conflito também existe
 * no banco, mas estes tipos ajudam a manter o painel previsível e modular.
 */

export type FiltrosCalendario = {
  mes: string;
  propriedadeId?: string;
  unidadeId?: string;
};

export type ReservaCalendario = ReservationRow & {
  hospedePrincipal: ReservationGuestRow | null;
};

export type BlocoCalendario = CalendarAvailabilityBlockRow;

export type DiaCalendario = {
  data: string;
  numero: number;
  foraDoMes: boolean;
  blocos: BlocoCalendario[];
  reservas: ReservaCalendario[];
};

export type DadosModuloCalendario = {
  filtros: FiltrosCalendario;
  dias: DiaCalendario[];
  podeGerenciar: boolean;
  propriedades: PropertyRow[];
  unidades: UnitRow[];
  blocos: BlocoCalendario[];
  reservas: ReservaCalendario[];
  resumo: {
    bloqueiosAtivos: number;
    reservasAtivas: number;
    unidadesDisponiveis: number;
    conflitosPermitidos: number;
  };
};

export type SearchParamsCalendario = {
  sucesso?: string | undefined;
  erro?: string | undefined;
};

export const STATUS_BLOQUEIO_CALENDARIO: CalendarAvailabilityStatus[] = [
  "blocked",
  "unavailable"
];

export const LABEL_STATUS_BLOQUEIO: Record<CalendarAvailabilityStatus, string> = {
  available: "Disponível",
  blocked: "Bloqueado",
  unavailable: "Indisponível",
  reserved: "Reservado",
  released: "Liberado"
};

export function statusBloqueiaDisponibilidade(status: CalendarAvailabilityStatus) {
  return ["blocked", "unavailable", "reserved"].includes(status);
}
