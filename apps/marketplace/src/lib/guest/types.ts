import type {
  ReservationChargeStatus,
  ReservationChargeType,
  ReservationPaymentMethod,
  ReservationPaymentRecordStatus,
  ReservationPaymentStatus,
  ReservationStatus
} from "@hospedex/types";

export type EstadoProtegido = "ok" | "nao_autenticado" | "sem_permissao" | "erro";

export type PerfilHospede = {
  avatarUrl: string | null;
  cidade: string | null;
  documento: string | null;
  email: string;
  estado: string | null;
  id: string;
  nome: string | null;
  telefone: string | null;
};

export type PropriedadeReservaHospede = {
  bairro: string | null;
  camas: number;
  banheiros: number;
  cidade: string | null;
  diaria: number | null;
  enderecoLinha: string | null;
  estado: string | null;
  garagem: number;
  googleMapsLink: string | null;
  id: string;
  imagemCapa: string | null;
  nome: string;
  quartos: number;
  regras: string[];
  slug: string;
};

export type ProprietarioReservaHospede = {
  avatarUrl: string | null;
  cidade: string | null;
  empreendimento: string | null;
  estado: string | null;
  nome: string | null;
  telefone: string | null;
  whatsapp: string | null;
};

export type HospedePrincipalReserva = {
  documento: string | null;
  email: string | null;
  nome: string;
  telefone: string | null;
};

export type InstrucaoPagamentoHospede = {
  formaPagamento: ReservationPaymentMethod | null;
  instrucoes: string | null;
  mensagemPreparada: string | null;
  proprietarioNome: string | null;
  proprietarioTelefone: string | null;
  proprietarioWhatsapp: string | null;
  statusPagamento: ReservationPaymentStatus;
};

export type CobrancaReservaHospede = {
  formaPagamento: ReservationPaymentMethod | null;
  instrucoes: string | null;
  status: ReservationChargeStatus;
  tipo: ReservationChargeType;
  valor: number;
  valorPago: number;
  valorPendente: number;
  vencimento: string | null;
};

export type PagamentoReservaHospede = {
  confirmadoEm: string | null;
  criadoEm: string;
  formaPagamento: ReservationPaymentMethod | null;
  status: ReservationPaymentRecordStatus;
  valor: number;
};

export type FinanceiroReservaHospede = {
  cobrancaAberta: CobrancaReservaHospede | null;
  pagamentos: PagamentoReservaHospede[];
  statusPagamento: ReservationPaymentStatus;
  valorPago: number;
  valorPendente: number;
  valorTotal: number;
};

export type TimelineReservaHospede = {
  data: string;
  descricao: string;
  status: ReservationStatus;
};

export type ReservaHospedeResumo = {
  checkIn: string;
  checkOut: string;
  codigo: string;
  criadaEm: string;
  formaPagamento: ReservationPaymentMethod | null;
  hospede: HospedePrincipalReserva | null;
  hospedesQuantidade: number;
  horarioPrevistoCheckIn: string | null;
  horarioPrevistoCheckOut: string | null;
  id: string;
  financeiro: FinanceiroReservaHospede;
  pagamento: InstrucaoPagamentoHospede | null;
  propriedade: PropriedadeReservaHospede | null;
  status: ReservationStatus;
  statusPagamento: ReservationPaymentStatus;
  total: number;
};

export type ReservaHospedeDetalhe = ReservaHospedeResumo & {
  checkInHorario: string | null;
  checkOutHorario: string | null;
  comodidades: string[];
  guiaRegiao: Array<{
    categoria: string;
    endereco: string | null;
    nome: string;
    telefone: string | null;
    whatsapp: string | null;
  }>;
  observacoes: string | null;
  proprietario: ProprietarioReservaHospede | null;
  regrasCasa: string[];
  taxaLimpeza: number;
  timeline: TimelineReservaHospede[];
};
