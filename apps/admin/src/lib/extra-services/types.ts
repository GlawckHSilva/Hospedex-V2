import type {
  ExtraServiceChargeType,
  ExtraServiceRow,
  ExtraServiceStatus,
  PropertyRow
} from "@hospedex/types";

/**
 * Contratos do catalogo de Servicos Extras.
 *
 * O catalogo define o que pode ser aplicado em reservas futuras. Itens ja
 * cobrados em reservas continuam gravados em reservation_extra_services.
 */

export const TIPOS_COBRANCA_SERVICO_EXTRA: Array<{
  label: string;
  value: ExtraServiceChargeType;
}> = [
  { label: "Valor fixo", value: "fixed" },
  { label: "Por diaria", value: "per_night" },
  { label: "Por hospede", value: "per_guest" },
  { label: "Por reserva", value: "per_reservation" }
];

export const STATUS_SERVICO_EXTRA: Array<{
  label: string;
  value: ExtraServiceStatus | "todos";
}> = [
  { label: "Todos", value: "todos" },
  { label: "Ativos", value: "active" },
  { label: "Inativos", value: "inactive" }
];

export const LABEL_TIPO_COBRANCA: Record<ExtraServiceChargeType, string> = {
  fixed: "Valor fixo",
  per_guest: "Por hospede",
  per_night: "Por diaria",
  per_reservation: "Por reserva"
};

export const LABEL_STATUS_SERVICO_EXTRA: Record<ExtraServiceStatus, string> = {
  active: "Ativo",
  inactive: "Inativo"
};

export type FiltroStatusServicoExtra = ExtraServiceStatus | "todos";

export type FiltrosServicosExtras = {
  status: FiltroStatusServicoExtra;
};

export type CasaServicoExtra = Pick<PropertyRow, "id" | "name" | "status">;

export type ServicoExtraComCasas = ExtraServiceRow & {
  casas: CasaServicoExtra[];
};

export type ResumoServicosExtras = {
  ativos: number;
  inativos: number;
  obrigatorios: number;
  total: number;
};

export type DadosModuloServicosExtras = {
  casas: CasaServicoExtra[];
  filtros: FiltrosServicosExtras;
  podeGerenciar: boolean;
  resumo: ResumoServicosExtras;
  servicos: ServicoExtraComCasas[];
  tenantNome: string;
};

export type SearchParamsServicosExtras = {
  erro?: string;
  sucesso?: string;
};
