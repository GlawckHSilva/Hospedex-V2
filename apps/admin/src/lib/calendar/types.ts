import type {
  CalendarAvailabilityBlockRow,
  CalendarAvailabilityStatus,
  CleaningTaskRow,
  MaintenanceTaskRow,
  PropertyRow,
  ReservationGuestRow,
  ReservationRow,
  ReservationStatus
} from "@hospedex/types";

/**
 * Contratos do módulo de Calendário.
 *
 * A UI recebe dados já isolados por tenant. A regra de conflito também existe
 * no banco, mas estes tipos ajudam a manter o painel previsível e modular.
 */

export type FiltrosCalendario = {
  mes: string;
  semana: string;
  visao: VisaoCalendario;
  propriedadeId?: string;
};

export type VisaoCalendario = "mensal" | "semanal" | "agenda";

export type ReservaCalendario = ReservationRow & {
  hospedePrincipal: ReservationGuestRow | null;
};

export type BlocoCalendario = CalendarAvailabilityBlockRow;
export type LimpezaCalendario = CleaningTaskRow;
export type ManutencaoCalendario = MaintenanceTaskRow;

export type DiaCalendario = {
  data: string;
  numero: number;
  foraDoMes: boolean;
  blocos: BlocoCalendario[];
  reservas: ReservaCalendario[];
  checkIns: ReservaCalendario[];
  checkOuts: ReservaCalendario[];
  limpezas: LimpezaCalendario[];
  manutencoes: ManutencaoCalendario[];
};

export type DadosModuloCalendario = {
  filtros: FiltrosCalendario;
  dias: DiaCalendario[];
  podeGerenciar: boolean;
  propriedades: PropertyRow[];
  blocos: BlocoCalendario[];
  limpezas: LimpezaCalendario[];
  manutencoes: ManutencaoCalendario[];
  reservas: ReservaCalendario[];
  resumo: {
    bloqueiosAtivos: number;
    checkInsProximos: number;
    checkOutsProximos: number;
    limpezasPendentes: number;
    manutencoesPendentes: number;
    reservasAtivas: number;
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

export type MotivoBloqueioCalendario =
  | "maintenance"
  | "interdicted"
  | "owner_use"
  | "unavailable"
  | "cleaning"
  | "other";

export const MOTIVOS_BLOQUEIO_CALENDARIO: MotivoBloqueioCalendario[] = [
  "maintenance",
  "interdicted",
  "owner_use",
  "unavailable",
  "cleaning",
  "other"
];

export const LABEL_MOTIVO_BLOQUEIO: Record<MotivoBloqueioCalendario, string> = {
  maintenance: "Manutencao",
  interdicted: "Interditado",
  owner_use: "Uso proprio",
  unavailable: "Indisponivel",
  cleaning: "Limpeza",
  other: "Outro"
};

export const LABEL_STATUS_BLOQUEIO: Record<CalendarAvailabilityStatus, string> = {
  available: "Disponível",
  blocked: "Bloqueado",
  interdicted: "Interditado",
  maintenance: "Manutenção",
  cleaning: "Limpeza",
  unavailable: "Indisponível",
  reserved: "Reservado",
  released: "Liberado"
};

export function statusBloqueiaDisponibilidade(status: CalendarAvailabilityStatus) {
  return [
    "blocked",
    "interdicted",
    "maintenance",
    "cleaning",
    "unavailable",
    "reserved"
  ].includes(status);
}

export const LABEL_STATUS_RESERVA_CALENDARIO: Record<ReservationStatus, string> = {
  pending: "Pendente",
  awaiting_payment: "Aguardando pagamento",
  confirmed: "Confirmada",
  checked_in: "Hospedado",
  checked_out: "Check-out",
  completed: "Concluida",
  cancelled: "Cancelada"
};

export const CLASSE_STATUS_RESERVA_CALENDARIO: Record<ReservationStatus, string> = {
  pending: "border-amber-400/35 bg-amber-400/12 text-amber-950 dark:text-amber-100",
  awaiting_payment: "border-sky-400/35 bg-sky-400/12 text-sky-950 dark:text-sky-100",
  confirmed: "border-emerald-400/35 bg-emerald-400/12 text-emerald-950 dark:text-emerald-100",
  checked_in: "border-cyan-400/35 bg-cyan-400/12 text-cyan-950 dark:text-cyan-100",
  checked_out: "border-violet-400/35 bg-violet-400/12 text-violet-950 dark:text-violet-100",
  completed: "border-slate-400/35 bg-slate-400/12 text-slate-950 dark:text-slate-100",
  cancelled: "border-rose-400/35 bg-rose-400/12 text-rose-950 dark:text-rose-100"
};
