import type {
  JsonValue,
  ReservationPaymentMethod,
  ReservationPaymentStatus,
  ReservationStatus
} from "@hospedex/types";

import { carregarPropriedadePublica } from "../marketplace/data";
import { criarClienteSupabaseServer } from "../supabase/server";
import type {
  EstadoProtegido,
  HospedePrincipalReserva,
  InstrucaoPagamentoHospede,
  PerfilHospede,
  PropriedadeReservaHospede,
  ReservaHospedeDetalhe,
  ReservaHospedeResumo,
  TimelineReservaHospede
} from "./types";

type ResultadoProtegido<T> = {
  dados: T | null;
  estado: EstadoProtegido;
  mensagem: string | null;
};

type PerfilRow = {
  avatar_url: string | null;
  city: string | null;
  document_number: string | null;
  email: string;
  full_name: string | null;
  id: string;
  phone: string | null;
  platform_role: "user" | "super_admin";
  state: string | null;
};

type ReservaRow = {
  check_in: string;
  check_out: string;
  code: string;
  created_at: string;
  currency: string;
  guest_notes: string | null;
  guests_count: number;
  id: string;
  notes: string | null;
  owner_id: string;
  payment_method: ReservationPaymentMethod | null;
  payment_status: ReservationPaymentStatus;
  property_id: string;
  status: ReservationStatus;
  tenant_id: string;
  total_amount: number;
};

type HospedeReservaRow = {
  document_number: string | null;
  email: string | null;
  full_name: string;
  is_primary: boolean;
  phone: string | null;
  reservation_id: string;
};

type PropriedadeRow = {
  address: JsonValue;
  id: string;
  name: string;
  pricing_details: JsonValue;
  slug: string;
  structure_details: JsonValue;
};

type MidiaRow = {
  alt: string | null;
  is_cover: boolean;
  property_id: string;
  sort_order: number;
  storage_bucket: string | null;
  storage_path: string | null;
  url: string | null;
};

type InstrucaoPagamentoRow = {
  instruction: string | null;
  owner_name: string | null;
  owner_phone: string | null;
  owner_whatsapp: string | null;
  payment_method: ReservationPaymentMethod | null;
  payment_status: ReservationPaymentStatus;
  prepared_message: string | null;
  reservation_id: string;
};

type HistoricoRow = {
  created_at: string;
  reason: string | null;
  to_status: ReservationStatus;
};

const CAMPOS_RESERVA =
  "id,tenant_id,property_id,owner_id,code,status,check_in,check_out,guests_count,total_amount,currency,payment_method,payment_status,notes,guest_notes,created_at";
const CAMPOS_PROPRIEDADE = "id,name,slug,address,structure_details,pricing_details";
const CAMPOS_MIDIA =
  "property_id,url,storage_bucket,storage_path,alt,is_cover,sort_order";

export async function carregarPerfilHospede(): Promise<
  ResultadoProtegido<PerfilHospede>
> {
  const contexto = await carregarContextoHospede();
  if (contexto.estado !== "ok" || !contexto.dados) return erroDoContexto(contexto);

  return {
    dados: contexto.dados.perfil,
    estado: "ok",
    mensagem: null
  };
}

export async function carregarReservasHospede(): Promise<
  ResultadoProtegido<ReservaHospedeResumo[]>
> {
  const contexto = await carregarContextoHospede();
  if (contexto.estado !== "ok" || !contexto.dados) return erroDoContexto(contexto);

  const supabase = contexto.dados.supabase;

  await supabase.rpc("link_guest_reservations");

  const { data, error } = await supabase
    .from("reservations")
    .select(CAMPOS_RESERVA)
    .eq("guest_user_id", contexto.dados.perfil.id)
    .order("check_in", { ascending: false })
    .returns<ReservaRow[]>();

  if (error) {
    console.error("Erro ao carregar reservas do hospede.", error);
    return {
      dados: null,
      estado: "erro",
      mensagem: "Nao foi possivel carregar suas reservas."
    };
  }

  const reservas = data ?? [];
  const complementos = await carregarComplementosReservas(supabase, reservas);

  return {
    dados: reservas.map((reserva) => montarResumoReserva(reserva, complementos)),
    estado: "ok",
    mensagem: null
  };
}

export async function carregarReservaHospede(
  reservaId: string
): Promise<ResultadoProtegido<ReservaHospedeDetalhe>> {
  const contexto = await carregarContextoHospede();
  if (contexto.estado !== "ok" || !contexto.dados) return erroDoContexto(contexto);

  const supabase = contexto.dados.supabase;
  await supabase.rpc("link_guest_reservations");

  const { data, error } = await supabase
    .from("reservations")
    .select(CAMPOS_RESERVA)
    .eq("id", reservaId)
    .eq("guest_user_id", contexto.dados.perfil.id)
    .maybeSingle<ReservaRow>();

  if (error) {
    console.error("Erro ao carregar detalhe da reserva do hospede.", error);
    return {
      dados: null,
      estado: "erro",
      mensagem: "Nao foi possivel carregar esta reserva."
    };
  }

  if (!data) {
    return {
      dados: null,
      estado: "sem_permissao",
      mensagem: "Reserva nao encontrada ou sem permissao para esta conta."
    };
  }

  const complementos = await carregarComplementosReservas(supabase, [data], {
    carregarHistorico: true
  });
  const resumo = montarResumoReserva(data, complementos);
  const propriedadePublica = resumo.propriedade?.slug
    ? (await carregarPropriedadePublica(resumo.propriedade.slug)).propriedade
    : null;

  return {
    dados: {
      ...resumo,
      checkInHorario: propriedadePublica?.checkIn ?? null,
      checkOutHorario: propriedadePublica?.checkOut ?? null,
      comodidades: propriedadePublica?.amenities.map((comodidade) => comodidade.name) ?? [],
      guiaRegiao:
        propriedadePublica?.regionalGuide.map((local) => ({
          categoria: local.categoryLabel,
          endereco: local.address,
          nome: local.name,
          telefone: local.phone,
          whatsapp: local.whatsapp
        })) ?? [],
      observacoes: data.guest_notes ?? data.notes,
      regrasCasa:
        propriedadePublica?.houseRules.summary ??
        resumo.propriedade?.regras ??
        [],
      taxaLimpeza: propriedadePublica?.pricing.cleaningFee ?? 0,
      timeline: montarTimeline(data, complementos.historicoPorReserva.get(data.id) ?? [])
    },
    estado: "ok",
    mensagem: null
  };
}

async function carregarContextoHospede(): Promise<
  ResultadoProtegido<{
    perfil: PerfilHospede;
    supabase: NonNullable<Awaited<ReturnType<typeof criarClienteSupabaseServer>>>;
  }>
> {
  const supabase = await criarClienteSupabaseServer();

  if (!supabase) {
    return {
      dados: null,
      estado: "erro",
      mensagem: "Variaveis do Supabase ausentes no Marketplace."
    };
  }

  const { data: usuarioResultado, error: usuarioErro } = await supabase.auth.getUser();
  const usuario = usuarioResultado.user;

  if (usuarioErro || !usuario) {
    return {
      dados: null,
      estado: "nao_autenticado",
      mensagem: "Entre para visualizar suas reservas."
    };
  }

  const { data: perfil, error: perfilErro } = await supabase
    .from("profiles")
    .select(
      "id,email,full_name,phone,avatar_url,platform_role,document_number,city,state"
    )
    .eq("id", usuario.id)
    .maybeSingle<PerfilRow>();

  if (perfilErro || !perfil) {
    console.error("Perfil do hospede nao encontrado.", perfilErro);
    return {
      dados: null,
      estado: "erro",
      mensagem: "Perfil nao encontrado para esta conta."
    };
  }

  if (perfil.platform_role === "super_admin" || (await usuarioPossuiTenant(supabase, perfil.id))) {
    return {
      dados: null,
      estado: "sem_permissao",
      mensagem: "Esta conta pertence ao gerenciamento e nao pode acessar a Area do Hospede."
    };
  }

  return {
    dados: {
      perfil: {
        avatarUrl: perfil.avatar_url,
        cidade: perfil.city,
        documento: perfil.document_number,
        email: perfil.email,
        estado: perfil.state,
        id: perfil.id,
        nome: perfil.full_name,
        telefone: perfil.phone
      },
      supabase
    },
    estado: "ok",
    mensagem: null
  };
}

async function usuarioPossuiTenant(
  supabase: NonNullable<Awaited<ReturnType<typeof criarClienteSupabaseServer>>>,
  userId: string
) {
  const { data, error } = await supabase
    .from("tenant_members")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1);

  if (error) {
    console.error("Erro ao validar se usuario pertence a tenant.", error);
    return false;
  }

  return Boolean(data?.length);
}

async function carregarComplementosReservas(
  supabase: NonNullable<Awaited<ReturnType<typeof criarClienteSupabaseServer>>>,
  reservas: ReservaRow[],
  opcoes: { carregarHistorico?: boolean } = {}
) {
  const reservaIds = reservas.map((reserva) => reserva.id);
  const propriedadeIds = [...new Set(reservas.map((reserva) => reserva.property_id))];

  if (!reservas.length) {
    return {
      hospedesPorReserva: new Map<string, HospedePrincipalReserva>(),
      historicoPorReserva: new Map<string, HistoricoRow[]>(),
      instrucoesPorReserva: new Map<string, InstrucaoPagamentoHospede>(),
      propriedadesPorId: new Map<string, PropriedadeReservaHospede>()
    };
  }

  const [hospedes, propriedades, midias, instrucoes, historico] = await Promise.all([
    supabase
      .from("reservation_guests")
      .select("reservation_id,full_name,email,phone,document_number,is_primary")
      .in("reservation_id", reservaIds)
      .returns<HospedeReservaRow[]>(),
    supabase
      .from("properties")
      .select(CAMPOS_PROPRIEDADE)
      .in("id", propriedadeIds)
      .returns<PropriedadeRow[]>(),
    supabase
      .from("media_assets")
      .select(CAMPOS_MIDIA)
      .in("property_id", propriedadeIds)
      .eq("status", "active")
      .order("sort_order", { ascending: true })
      .returns<MidiaRow[]>(),
    supabase.rpc("get_guest_reservation_payment_guidance", {
      p_reservation_ids: reservaIds
    }) as unknown as Promise<{
      data: InstrucaoPagamentoRow[] | null;
      error: Error | null;
    }>,
    opcoes.carregarHistorico
      ? supabase
          .from("reservation_status_history")
          .select("reservation_id,to_status,reason,created_at")
          .in("reservation_id", reservaIds)
          .order("created_at", { ascending: true })
          .returns<(HistoricoRow & { reservation_id: string })[]>()
      : Promise.resolve({ data: [], error: null })
  ]);

  if (hospedes.error) console.error("Erro ao carregar hospedes da reserva.", hospedes.error);
  if (propriedades.error) console.error("Erro ao carregar casas das reservas.", propriedades.error);
  if (midias.error) console.error("Erro ao carregar imagens das reservas.", midias.error);
  if (instrucoes.error) console.error("Erro ao carregar instrucoes de pagamento.", instrucoes.error);
  if (historico.error) console.error("Erro ao carregar timeline da reserva.", historico.error);

  return {
    hospedesPorReserva: mapearHospedes(hospedes.data ?? []),
    historicoPorReserva: mapearHistorico(historico.data ?? []),
    instrucoesPorReserva: mapearInstrucoes(instrucoes.data ?? []),
    propriedadesPorId: mapearPropriedades(
      propriedades.data ?? [],
      midias.data ?? [],
      supabase
    )
  };
}

function erroDoContexto<T>(
  contexto: ResultadoProtegido<unknown>
): ResultadoProtegido<T> {
  return {
    dados: null,
    estado: contexto.estado === "ok" ? "erro" : contexto.estado,
    mensagem: contexto.mensagem
  };
}

function montarResumoReserva(
  reserva: ReservaRow,
  complementos: Awaited<ReturnType<typeof carregarComplementosReservas>>
): ReservaHospedeResumo {
  return {
    checkIn: reserva.check_in,
    checkOut: reserva.check_out,
    codigo: reserva.code,
    criadaEm: reserva.created_at,
    formaPagamento: reserva.payment_method,
    hospede: complementos.hospedesPorReserva.get(reserva.id) ?? null,
    hospedesQuantidade: reserva.guests_count,
    id: reserva.id,
    pagamento: complementos.instrucoesPorReserva.get(reserva.id) ?? null,
    propriedade: complementos.propriedadesPorId.get(reserva.property_id) ?? null,
    status: reserva.status,
    statusPagamento: reserva.payment_status,
    total: Number(reserva.total_amount ?? 0)
  };
}

function mapearHospedes(hospedes: HospedeReservaRow[]) {
  const mapa = new Map<string, HospedePrincipalReserva>();

  for (const hospede of hospedes) {
    if (!hospede.is_primary) continue;

    mapa.set(hospede.reservation_id, {
      documento: hospede.document_number,
      email: hospede.email,
      nome: hospede.full_name,
      telefone: hospede.phone
    });
  }

  return mapa;
}

function mapearInstrucoes(instrucoes: InstrucaoPagamentoRow[]) {
  const mapa = new Map<string, InstrucaoPagamentoHospede>();

  for (const instrucao of instrucoes) {
    mapa.set(instrucao.reservation_id, {
      formaPagamento: instrucao.payment_method,
      instrucoes: instrucao.instruction,
      mensagemPreparada: instrucao.prepared_message,
      proprietarioNome: instrucao.owner_name,
      proprietarioTelefone: instrucao.owner_phone,
      proprietarioWhatsapp: instrucao.owner_whatsapp,
      statusPagamento: instrucao.payment_status
    });
  }

  return mapa;
}

function mapearHistorico(historico: Array<HistoricoRow & { reservation_id: string }>) {
  const mapa = new Map<string, HistoricoRow[]>();

  for (const item of historico) {
    const lista = mapa.get(item.reservation_id) ?? [];
    lista.push(item);
    mapa.set(item.reservation_id, lista);
  }

  return mapa;
}

function mapearPropriedades(
  propriedades: PropriedadeRow[],
  midias: MidiaRow[],
  supabase: NonNullable<Awaited<ReturnType<typeof criarClienteSupabaseServer>>>
) {
  const midiasPorPropriedade = new Map<string, MidiaRow[]>();
  for (const midia of midias) {
    const lista = midiasPorPropriedade.get(midia.property_id) ?? [];
    lista.push(midia);
    midiasPorPropriedade.set(midia.property_id, lista);
  }

  const mapa = new Map<string, PropriedadeReservaHospede>();

  for (const propriedade of propriedades) {
    const endereco = objetoJson(propriedade.address);
    const estrutura = objetoJson(propriedade.structure_details);
    const valores = objetoJson(propriedade.pricing_details);
    const capa = escolherImagemCapa(
      midiasPorPropriedade.get(propriedade.id) ?? [],
      supabase
    );

    mapa.set(propriedade.id, {
      bairro: textoJson(endereco, "bairro"),
      camas: numeroJson(estrutura, "beds"),
      banheiros: numeroJson(estrutura, "bathrooms"),
      cidade: textoJson(endereco, "cidade"),
      diaria: numeroJson(valores, "dailyRate"),
      enderecoLinha: montarEndereco(endereco),
      estado: textoJson(endereco, "estado"),
      garagem: numeroJson(estrutura, "garageSpaces"),
      googleMapsLink: textoJson(endereco, "googleMapsLink"),
      id: propriedade.id,
      imagemCapa: capa,
      nome: propriedade.name,
      quartos: numeroJson(estrutura, "bedrooms"),
      regras: [],
      slug: propriedade.slug
    });
  }

  return mapa;
}

function montarTimeline(
  reserva: ReservaRow,
  historico: HistoricoRow[]
): TimelineReservaHospede[] {
  const itens: TimelineReservaHospede[] = [
    {
      data: reserva.created_at,
      descricao: "Solicitacao criada no Marketplace.",
      status: reserva.status
    }
  ];

  for (const item of historico) {
    itens.push({
      data: item.created_at,
      descricao: item.reason ?? "Status da reserva atualizado.",
      status: item.to_status
    });
  }

  return itens.sort((a, b) => a.data.localeCompare(b.data));
}

function escolherImagemCapa(
  midias: MidiaRow[],
  supabase: NonNullable<Awaited<ReturnType<typeof criarClienteSupabaseServer>>>
) {
  const imagem = midias.find((midia) => midia.is_cover) ?? midias[0];
  if (!imagem) return null;
  if (imagem.url) return imagem.url;
  if (!imagem.storage_bucket || !imagem.storage_path) return null;

  return supabase.storage
    .from(imagem.storage_bucket)
    .getPublicUrl(imagem.storage_path).data.publicUrl;
}

function objetoJson(valor: JsonValue): Record<string, JsonValue> {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return {};
  return valor as Record<string, JsonValue>;
}

function textoJson(objeto: Record<string, JsonValue>, chave: string) {
  const valor = objeto[chave];
  return typeof valor === "string" ? valor : null;
}

function numeroJson(objeto: Record<string, JsonValue>, chave: string) {
  const valor = objeto[chave];
  if (typeof valor === "number") return valor;
  if (typeof valor === "string") {
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : 0;
  }
  return 0;
}

function montarEndereco(endereco: Record<string, JsonValue>) {
  const partes = [
    textoJson(endereco, "linha1"),
    textoJson(endereco, "numero"),
    textoJson(endereco, "bairro")
  ].filter(Boolean);

  return partes.length ? partes.join(", ") : null;
}
