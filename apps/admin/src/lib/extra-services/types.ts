import type {
  ExtraServiceChargeType,
  ExtraServiceRow,
  ExtraServiceStatus,
  PropertyRow
} from "@hospedex/types";

/**
 * Contratos do catálogo de Serviços Extras.
 *
 * O catálogo define o que pode ser aplicado em reservas futuras. Itens já
 * cobrados em reservas continuam gravados em reservation_extra_services.
 */

export const TIPOS_COBRANCA_SERVICO_EXTRA: Array<{
  label: string;
  value: ExtraServiceChargeType;
}> = [
  { label: "Valor fixo", value: "fixed" },
  { label: "Por diária", value: "per_night" },
  { label: "Por hóspede", value: "per_guest" },
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
  per_guest: "Por hóspede",
  per_night: "Por diária",
  per_reservation: "Por reserva"
};

export const LABEL_STATUS_SERVICO_EXTRA: Record<ExtraServiceStatus, string> = {
  active: "Ativo",
  inactive: "Inativo"
};

export type FiltroStatusServicoExtra = ExtraServiceStatus | "todos";
export type FiltroObrigatoriedadeServicoExtra = "obrigatorios" | "opcionais" | "todos";
export type FiltroTipoCobrancaServicoExtra = ExtraServiceChargeType | "todos";

export type FiltrosServicosExtras = {
  busca: string;
  obrigatoriedade: FiltroObrigatoriedadeServicoExtra;
  status: FiltroStatusServicoExtra;
  tipoCobranca: FiltroTipoCobrancaServicoExtra;
};

export type CasaServicoExtra = Pick<PropertyRow, "id" | "name" | "status">;

export type ServicoExtraComCasas = ExtraServiceRow & {
  casas: CasaServicoExtra[];
  usadoEmReservas: boolean;
  usosEmReservas: number;
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
