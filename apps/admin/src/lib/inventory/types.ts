import type {
  InventoryConservationState,
  InventoryItemCategory,
  InventoryItemRow,
  MaintenanceTaskPriority,
  MaintenanceTaskRow,
  MaintenanceTaskStatus,
  MaintenanceTaskType,
  ProfileRow,
  PropertyRow
} from "@hospedex/types";

/**
 * Contratos do modulo de Inventario e Manutencao.
 *
 * Inventario e agenda compartilham propriedade para manter o controle
 * operacional do tenant sem misturar dados entre proprietarios.
 */

export type FiltrosInventario = {
  propriedadeId?: string;
};

export type ItemInventarioCompleto = InventoryItemRow & {
  propriedade: PropertyRow | null;
};

export type TarefaManutencaoCompleta = MaintenanceTaskRow & {
  item: InventoryItemRow | null;
  propriedade: PropertyRow | null;
  responsavel: ProfileRow | null;
};

export type DadosModuloInventario = {
  filtros: FiltrosInventario;
  itens: ItemInventarioCompleto[];
  podeGerenciar: boolean;
  propriedades: PropertyRow[];
  responsaveis: ProfileRow[];
  resumo: {
    itens: number;
    danificados: number;
    faltando: number;
    manutencoesPendentes: number;
  };
  tarefas: TarefaManutencaoCompleta[];
  tenantNome: string;
};

export type SearchParamsInventario = {
  sucesso?: string | undefined;
  erro?: string | undefined;
};

export const CATEGORIAS_INVENTARIO: InventoryItemCategory[] = [
  "kitchen",
  "bedrooms",
  "bathrooms",
  "outdoor_area",
  "electronics",
  "furniture",
  "bed_linen",
  "cleaning",
  "other"
];

export const ESTADOS_CONSERVACAO: InventoryConservationState[] = [
  "new",
  "good",
  "used",
  "damaged",
  "missing"
];

export const PRIORIDADES_MANUTENCAO: MaintenanceTaskPriority[] = [
  "low",
  "medium",
  "high",
  "urgent"
];

export const TIPOS_MANUTENCAO: MaintenanceTaskType[] = [
  "preventive",
  "corrective",
  "inspection",
  "replacement",
  "technical_cleaning",
  "other"
];

export const STATUS_MANUTENCAO: MaintenanceTaskStatus[] = [
  "pending",
  "completed",
  "cancelled"
];

export const LABEL_CATEGORIA_INVENTARIO: Record<InventoryItemCategory, string> = {
  kitchen: "Cozinha",
  bedrooms: "Quartos",
  bathrooms: "Banheiros",
  outdoor_area: "Area externa",
  electronics: "Eletronicos",
  furniture: "Moveis",
  bed_linen: "Roupa de cama",
  cleaning: "Limpeza",
  other: "Outros"
};

export const LABEL_ESTADO_CONSERVACAO: Record<InventoryConservationState, string> = {
  new: "Novo",
  good: "Bom",
  used: "Usado",
  damaged: "Danificado",
  missing: "Faltando"
};

export const LABEL_PRIORIDADE_MANUTENCAO: Record<MaintenanceTaskPriority, string> = {
  low: "Baixa",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente"
};

export const LABEL_TIPO_MANUTENCAO: Record<MaintenanceTaskType, string> = {
  preventive: "Manutencao preventiva",
  corrective: "Manutencao corretiva",
  inspection: "Revisao",
  replacement: "Troca",
  technical_cleaning: "Limpeza tecnica",
  other: "Outro"
};

export const LABEL_STATUS_MANUTENCAO: Record<MaintenanceTaskStatus, string> = {
  pending: "Pendente",
  completed: "Concluida",
  cancelled: "Cancelada"
};
