import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  AmenityRow,
  JsonValue,
  MediaAssetRow,
  PropertyAmenityRow,
  PropertyReviewRow,
  PropertyRow,
  PropertySettingRow,
  PropertyType,
  RegionalGuideCategory,
  RegionalGuideLocationRow,
} from "@hospedex/types";

type PropriedadeRowPublica = Pick<
  PropertyRow,
  | "id"
  | "tenant_id"
  | "name"
  | "slug"
  | "property_type"
  | "status"
  | "headline"
  | "description"
  | "short_description"
  | "full_description"
  | "is_public"
  | "public_details"
  | "address"
  | "structure_details"
  | "pricing_details"
  | "timezone"
  | "created_at"
  | "updated_at"
  | "deleted_at"
>;

type MidiaRowPublica = Pick<
  MediaAssetRow,
  | "id"
  | "property_id"
  | "media_type"
  | "storage_bucket"
  | "storage_path"
  | "url"
  | "alt"
  | "sort_order"
  | "is_cover"
  | "status"
>;

type ComodidadeRowPublica = Pick<AmenityRow, "id" | "code" | "name" | "category">;
type VinculoComodidadeRowPublica = Pick<
  PropertyAmenityRow,
  "property_id" | "amenity_id"
>;

type RegrasCasaRowPublica = Pick<
  PropertySettingRow,
  | "tenant_id"
  | "property_id"
  | "check_in_time"
  | "check_out_time"
  | "min_nights"
  | "max_nights"
  | "allow_children"
  | "allow_pets"
  | "allow_smoking"
  | "allow_events"
  | "max_guests"
  | "min_responsible_age"
  | "additional_rules"
  | "special_instructions"
  | "cancellation_refund_until_days"
  | "cancellation_refund_until_percentage"
  | "cancellation_late_until_days"
  | "cancellation_late_refund_percentage"
  | "cancellation_no_refund_within_days"
  | "cancellation_notes"
>;

type GuiaRegiaoRowPublica = Pick<
  RegionalGuideLocationRow,
  | "id"
  | "tenant_id"
  | "category"
  | "name"
  | "description"
  | "address"
  | "phone"
  | "whatsapp"
  | "website_url"
  | "opening_hours"
  | "cover_image_url"
  | "display_order"
  | "status"
  | "deleted_at"
>;

type AvaliacaoRowPublica = Pick<
  PropertyReviewRow,
  | "id"
  | "tenant_id"
  | "property_id"
  | "guest_name"
  | "rating"
  | "comment"
  | "reviewed_at"
  | "status"
  | "owner_response"
  | "owner_responded_at"
>;

export type ImagemPublica = {
  id: string;
  url: string;
  alt: string;
  isCover: boolean;
};

export type ComodidadePublica = {
  id: string;
  code: string;
  name: string;
  category: string | null;
};

export type EnderecoPublico = {
  bairro: string;
  cep: string;
  complemento: string;
  googleMapsLink: string;
  linha1: string;
  numero: string;
  cidade: string;
  estado: string;
};

export type EstruturaCasaPublica = {
  bathrooms: number;
  bedrooms: number;
  beds: number;
  garageSpaces: number;
  maxGuests: number;
};

export type ValoresCasaPublica = {
  cleaningFee: number;
  dailyRate: number;
};

export type StatusDisponibilidadePublica =
  | "reserved"
  | "blocked"
  | "interdicted"
  | "maintenance"
  | "cleaning"
  | "unavailable";

export type PeriodoDisponibilidadePublica = {
  startsOn: string;
  endsOn: string;
  status: StatusDisponibilidadePublica;
};

export type PoliticaCancelamentoPublica = {
  itens: string[];
  observacoes: string | null;
};

export type RegrasCasaPublicas = {
  checkIn: string;
  checkOut: string;
  allowPets: boolean;
  allowChildren: boolean;
  allowSmoking: boolean;
  allowEvents: boolean;
  maxGuests: number;
  minResponsibleAge: number;
  minNights: number;
  maxNights: number | null;
  additionalRules: string | null;
  specialInstructions: string | null;
  cancellationPolicy: PoliticaCancelamentoPublica;
  summary: string[];
};

export type LocalGuiaRegiaoPublico = {
  id: string;
  category: RegionalGuideCategory;
  categoryLabel: string;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  websiteUrl: string | null;
  openingHours: string | null;
  coverImageUrl: string | null;
};

export type DistribuicaoAvaliacoesPublicas = {
  stars: number;
  count: number;
  percentage: number;
};

export type AvaliacaoPublica = {
  id: string;
  guestName: string;
  rating: number;
  comment: string;
  reviewedAt: string;
  ownerResponse: string | null;
  ownerRespondedAt: string | null;
};

export type ResumoAvaliacoesPublicas = {
  average: number | null;
  total: number;
  distribution: DistribuicaoAvaliacoesPublicas[];
  comments: AvaliacaoPublica[];
};

export type PropriedadePublica = {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  propertyType: PropertyType;
  propertyTypeLabel: string;
  headline: string;
  description: string;
  address: EnderecoPublico;
  locationLabel: string;
  images: ImagemPublica[];
  coverImage: ImagemPublica | null;
  amenities: ComodidadePublica[];
  minPrice: number | null;
  maxGuests: number;
  structure: EstruturaCasaPublica;
  pricing: ValoresCasaPublica;
  availability: PeriodoDisponibilidadePublica[];
  availabilityError: string | null;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  rules: string[];
  checkIn: string;
  checkOut: string;
  houseRules: RegrasCasaPublicas;
  regionalGuide: LocalGuiaRegiaoPublico[];
  reviews: ResumoAvaliacoesPublicas;
};

export type ResultadoPropriedadesPublicas = {
  propriedades: PropriedadePublica[];
  erro: string | null;
  supabaseConfigurado: boolean;
};

export type FiltrosPropriedadesPublicas = {
  cidade?: string | undefined;
  dataFim?: string | undefined;
  dataInicio?: string | undefined;
  estado?: string | undefined;
  tipo?: PropertyType | undefined;
  hospedes?: number | undefined;
  limite?: number;
  precoMaximo?: number | undefined;
  precoMinimo?: number | undefined;
};

export type DestinoEmDestaque = {
  cidade: string;
  estado: string;
  total: number;
  imagem: ImagemPublica | null;
};

const CAMPOS_PROPRIEDADE =
  "id,tenant_id,name,slug,property_type,status,headline,description,short_description,full_description,is_public,public_details,address,structure_details,pricing_details,timezone,created_at,updated_at,deleted_at";
const CAMPOS_MIDIA =
  "id,property_id,media_type,storage_bucket,storage_path,url,alt,sort_order,is_cover,status";
const CAMPOS_COMODIDADE = "id,code,name,category";
const CAMPOS_VINCULO_COMODIDADE = "property_id,amenity_id";
const CAMPOS_REGRAS_CASA =
  "tenant_id,property_id,check_in_time,check_out_time,min_nights,max_nights,allow_children,allow_pets,allow_smoking,allow_events,max_guests,min_responsible_age,additional_rules,special_instructions,cancellation_refund_until_days,cancellation_refund_until_percentage,cancellation_late_until_days,cancellation_late_refund_percentage,cancellation_no_refund_within_days,cancellation_notes";
const CAMPOS_GUIA_REGIAO =
  "id,tenant_id,category,name,description,address,phone,whatsapp,website_url,opening_hours,cover_image_url,display_order,status,deleted_at";
const CAMPOS_AVALIACAO_PUBLICA =
  "id,tenant_id,property_id,guest_name,rating,comment,reviewed_at,status,owner_response,owner_responded_at";
const TIPOS_PROPRIEDADE = new Set<PropertyType>([
  "seasonal_home",
  "inn",
  "small_hotel"
]);
const STATUS_DISPONIBILIDADE_PUBLICA = [
  "blocked",
  "interdicted",
  "maintenance",
  "cleaning",
  "unavailable",
  "reserved"
] as const;

type DisponibilidadeRowPublica = {
  ends_on: string;
  property_id: string;
  starts_on: string;
  status: StatusDisponibilidadePublica;
};

type ResultadoDisponibilidadePublica = {
  erro: string | null;
  periodos: DisponibilidadeRowPublica[];
};

let clienteMarketplace: SupabaseClient | null = null;

export function supabaseMarketplaceConfigurado() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}

export function normalizarTipoPropriedade(valor: string | undefined) {
  if (!valor || !TIPOS_PROPRIEDADE.has(valor as PropertyType)) return undefined;
  return valor as PropertyType;
}

export async function carregarPropriedadesPublicas(
  filtros: FiltrosPropriedadesPublicas = {}
): Promise<ResultadoPropriedadesPublicas> {
  const supabase = criarClienteMarketplace();

  if (!supabase) {
    return {
      propriedades: [],
      erro: null,
      supabaseConfigurado: false
    };
  }

  try {
    const limite = limitarQuantidade(filtros.limite ?? 24);
    const limiteConsulta = possuiFiltroDaCasa(filtros) ? Math.max(limite * 4, 48) : limite;
    let consulta = supabase
      .from("properties")
      .select(CAMPOS_PROPRIEDADE)
      .eq("status", "published")
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(limiteConsulta);

    if (filtros.tipo) {
      consulta = consulta.eq("property_type", filtros.tipo);
    }

    const cidade = filtros.cidade?.trim();
    if (cidade) {
      consulta = consulta.filter("address->>cidade", "ilike", `%${cidade}%`);
    }

    const estado = filtros.estado?.trim();
    if (estado) {
      consulta = consulta.filter("address->>estado", "ilike", `%${estado}%`);
    }

    const propriedadesResultado = await consulta.returns<PropriedadeRowPublica[]>();
    registrarErroLeitura("propriedades públicas", propriedadesResultado.error);

    const propriedades = await montarPropriedadesPublicas(
      supabase,
      propriedadesResultado.data ?? []
    );
    const propriedadesFiltradas = await aplicarFiltrosDaCasa(
      supabase,
      propriedades,
      filtros
    );

    return {
      propriedades: propriedadesFiltradas.slice(0, limite),
      erro: null,
      supabaseConfigurado: true
    };
  } catch (erro) {
    return {
      propriedades: [],
      erro: obterMensagemErro(erro),
      supabaseConfigurado: true
    };
  }
}

async function aplicarFiltrosDaCasa(
  supabase: SupabaseClient,
  propriedades: PropriedadePublica[],
  filtros: FiltrosPropriedadesPublicas
) {
  if (!possuiFiltroDaCasa(filtros)) return propriedades;

  const propriedadesIndisponiveis = await carregarPropriedadesIndisponiveis(
    supabase,
    propriedades,
    filtros
  );

  return propriedades.filter((propriedade) =>
    propriedadeAtendeFiltros(propriedade, filtros, propriedadesIndisponiveis)
  );
}

async function carregarPropriedadesIndisponiveis(
  supabase: SupabaseClient,
  propriedades: PropriedadePublica[],
  filtros: FiltrosPropriedadesPublicas
) {
  if (!periodoValido(filtros.dataInicio, filtros.dataFim)) return new Set<string>();

  const idsPropriedades = propriedades.map((propriedade) => propriedade.id);
  if (!idsPropriedades.length) return new Set<string>();

  const disponibilidade = await carregarDisponibilidadePublica(
    supabase,
    idsPropriedades,
    filtros.dataInicio!,
    filtros.dataFim!
  );

  if (disponibilidade.erro) {
    throw new Error(disponibilidade.erro);
  }

  return new Set(disponibilidade.periodos.map((periodo) => periodo.property_id));
}

async function carregarDisponibilidadePublica(
  supabase: SupabaseClient,
  propriedadeIds: string[],
  dataInicio: string,
  dataFim: string
): Promise<ResultadoDisponibilidadePublica> {
  if (!propriedadeIds.length) {
    return { erro: null, periodos: [] };
  }

  // A disponibilidade publica passa por RPC para nao expor tabelas internas
  // como calendar_availability_blocks ou reservations ao visitante anonimo.
  const resultado = await supabase
    .rpc("get_public_property_availability", {
      p_ends_on: dataFim,
      p_property_ids: propriedadeIds,
      p_starts_on: dataInicio
    })
    .returns<DisponibilidadeRowPublica[]>();

  if (resultado.error) {
    return {
      erro: `Nao foi possivel carregar a disponibilidade publica: ${resultado.error.message}`,
      periodos: []
    };
  }

  const periodos = Array.isArray(resultado.data)
    ? (resultado.data as DisponibilidadeRowPublica[])
    : [];

  return {
    erro: null,
    periodos: periodos.filter((periodo) =>
      STATUS_DISPONIBILIDADE_PUBLICA.includes(periodo.status)
    )
  };
}

function propriedadeAtendeFiltros(
  propriedade: PropriedadePublica,
  filtros: FiltrosPropriedadesPublicas,
  propriedadesIndisponiveis: Set<string>
) {
  if (filtros.hospedes && propriedade.maxGuests < filtros.hospedes) return false;
  if (
    filtros.precoMinimo &&
    (propriedade.minPrice === null || propriedade.minPrice < filtros.precoMinimo)
  ) {
    return false;
  }
  if (
    filtros.precoMaximo &&
    (propriedade.minPrice === null || propriedade.minPrice > filtros.precoMaximo)
  ) {
    return false;
  }
  if (propriedadesIndisponiveis.has(propriedade.id)) return false;
  return true;
}

export async function carregarPropriedadePublica(slugOuId: string) {
  const supabase = criarClienteMarketplace();

  if (!supabase || !slugOuId) {
    return {
      propriedade: null,
      erro: null,
      supabaseConfigurado: Boolean(supabase)
    };
  }

  try {
    const identificador = slugOuId.trim();
    let consulta = supabase
      .from("properties")
      .select(CAMPOS_PROPRIEDADE)
      .eq("status", "published")
      .is("deleted_at", null);

    consulta = valorEhUuid(identificador)
      ? consulta.eq("id", identificador)
      : consulta.eq("slug", identificador);

    const resultado = await consulta.maybeSingle<PropriedadeRowPublica>();

    registrarErroLeitura("propriedade pública", resultado.error);

    if (!resultado.data) {
      return {
        propriedade: null,
        erro: null,
        supabaseConfigurado: true
      };
    }

    const [propriedade] = await montarPropriedadesPublicas(supabase, [resultado.data], {
      detalhes: true
    });

    return {
      propriedade: propriedade ?? null,
      erro: null,
      supabaseConfigurado: true
    };
  } catch (erro) {
    return {
      propriedade: null,
      erro: obterMensagemErro(erro),
      supabaseConfigurado: true
    };
  }
}

export function obterDestinosEmDestaque(
  propriedades: readonly PropriedadePublica[]
): DestinoEmDestaque[] {
  const destinos = new Map<string, DestinoEmDestaque>();

  for (const propriedade of propriedades) {
    if (!propriedade.address.cidade) continue;

    const chave = `${propriedade.address.cidade}-${propriedade.address.estado}`;
    const destino = destinos.get(chave);

    destinos.set(chave, {
      cidade: propriedade.address.cidade,
      estado: propriedade.address.estado,
      total: (destino?.total ?? 0) + 1,
      imagem: destino?.imagem ?? propriedade.coverImage
    });
  }

  return [...destinos.values()]
    .sort((destinoA, destinoB) => destinoB.total - destinoA.total)
    .slice(0, 4);
}

function criarClienteMarketplace() {
  if (!supabaseMarketplaceConfigurado()) return null;
  if (clienteMarketplace) return clienteMarketplace;

  clienteMarketplace = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  return clienteMarketplace;
}

async function montarPropriedadesPublicas(
  supabase: SupabaseClient,
  propriedades: PropriedadeRowPublica[],
  opcoes: { detalhes?: boolean } = {}
) {
  if (!propriedades.length) return [];

  const ids = propriedades.map((propriedade) => propriedade.id);
  const tenantIds = [...new Set(propriedades.map((propriedade) => propriedade.tenant_id))];
  const [midiasResultado, vinculosResultado] = await Promise.all([
      supabase
        .from("media_assets")
        .select(CAMPOS_MIDIA)
        .eq("media_type", "image")
        .eq("status", "active")
        .in("property_id", ids)
        .order("sort_order", { ascending: true })
        .returns<MidiaRowPublica[]>(),
      supabase
        .from("property_amenities")
        .select(CAMPOS_VINCULO_COMODIDADE)
        .in("property_id", ids)
        .returns<VinculoComodidadeRowPublica[]>()
    ]);

  registrarErroLeitura("mídias públicas", midiasResultado.error);
  registrarErroLeitura("comodidades vinculadas", vinculosResultado.error);

  const comodidades = await carregarComodidadesPublicas(
    supabase,
    vinculosResultado.data ?? []
  );
  const detalhes = opcoes.detalhes
    ? await carregarDetalhesPublicosPropriedade(supabase, ids, tenantIds)
    : criarDetalhesPublicosVazios();

  return propriedades.map((propriedade) =>
    montarPropriedadePublica(propriedade, {
      supabase,
      midias: midiasResultado.data ?? [],
      vinculosComodidades: vinculosResultado.data ?? [],
      comodidades,
      regras: detalhes.regras,
      guiaRegiao: detalhes.guiaRegiao,
      avaliacoes: detalhes.avaliacoes,
      disponibilidade: detalhes.disponibilidade,
      disponibilidadeErro: detalhes.disponibilidadeErro
    })
  );
}

type DetalhesPublicosPropriedade = {
  regras: RegrasCasaRowPublica[];
  guiaRegiao: GuiaRegiaoRowPublica[];
  avaliacoes: AvaliacaoRowPublica[];
  disponibilidade: DisponibilidadeRowPublica[];
  disponibilidadeErro: string | null;
};

function criarDetalhesPublicosVazios(): DetalhesPublicosPropriedade {
  return {
    regras: [],
    guiaRegiao: [],
    avaliacoes: [],
    disponibilidade: [],
    disponibilidadeErro: null
  };
}

async function carregarDetalhesPublicosPropriedade(
  supabase: SupabaseClient,
  propriedadeIds: string[],
  tenantIds: string[]
): Promise<DetalhesPublicosPropriedade> {
  if (!propriedadeIds.length) return criarDetalhesPublicosVazios();

  const inicioDisponibilidade = formatarDataIso(new Date());
  const fimDisponibilidade = formatarDataIso(
    new Date(new Date().setFullYear(new Date().getFullYear() + 1))
  );
  const [regrasResultado, guiaResultado, avaliacoesResultado, disponibilidadeResultado] =
    await Promise.all([
    supabase
      .from("property_settings")
      .select(CAMPOS_REGRAS_CASA)
      .in("property_id", propriedadeIds)
      .returns<RegrasCasaRowPublica[]>(),
    supabase
      .from("regional_guide_locations")
      .select(CAMPOS_GUIA_REGIAO)
      .in("tenant_id", tenantIds)
      .eq("status", "active")
      .is("deleted_at", null)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true })
      .returns<GuiaRegiaoRowPublica[]>(),
    supabase
      .from("property_reviews")
      .select(CAMPOS_AVALIACAO_PUBLICA)
      .in("property_id", propriedadeIds)
      .eq("status", "approved")
      .order("reviewed_at", { ascending: false })
      .limit(80)
      .returns<AvaliacaoRowPublica[]>(),
    carregarDisponibilidadePublica(
      supabase,
      propriedadeIds,
      inicioDisponibilidade,
      fimDisponibilidade
    )
    ]);

  registrarErroLeitura("regras publicas da propriedade", regrasResultado.error);
  registrarErroLeitura("guia publico da regiao", guiaResultado.error);
  registrarErroLeitura("avaliacoes publicas", avaliacoesResultado.error);

  return {
    regras: regrasResultado.data ?? [],
    guiaRegiao: guiaResultado.data ?? [],
    avaliacoes: avaliacoesResultado.data ?? [],
    disponibilidade: disponibilidadeResultado.periodos,
    disponibilidadeErro: disponibilidadeResultado.erro
  };
}

async function carregarComodidadesPublicas(
  supabase: SupabaseClient,
  vinculos: VinculoComodidadeRowPublica[]
) {
  const ids = [...new Set(vinculos.map((vinculo) => vinculo.amenity_id))];
  if (!ids.length) return [];

  const resultado = await supabase
    .from("amenities")
    .select(CAMPOS_COMODIDADE)
    .in("id", ids)
    .order("name", { ascending: true })
    .returns<ComodidadeRowPublica[]>();

  registrarErroLeitura("comodidades públicas", resultado.error);
  return resultado.data ?? [];
}

function montarPropriedadePublica(
  propriedade: PropriedadeRowPublica,
  relacionamentos: {
    supabase: SupabaseClient;
    midias: MidiaRowPublica[];
    vinculosComodidades: VinculoComodidadeRowPublica[];
    comodidades: ComodidadeRowPublica[];
    regras: RegrasCasaRowPublica[];
    guiaRegiao: GuiaRegiaoRowPublica[];
    avaliacoes: AvaliacaoRowPublica[];
    disponibilidade: DisponibilidadeRowPublica[];
    disponibilidadeErro: string | null;
  }
): PropriedadePublica {
  const endereco = normalizarEndereco(propriedade.address);
  const estrutura = normalizarEstruturaCasa(propriedade.structure_details);
  const valores = normalizarValoresCasa(propriedade.pricing_details);
  const detalhesPublicos = valorEhObjeto(propriedade.public_details)
    ? propriedade.public_details
    : {};
  const midias = relacionamentos.midias.filter(
    (midia) => midia.property_id === propriedade.id
  );
  const imagens = midias
    .map((midia) => montarImagemPublica(relacionamentos.supabase, midia))
    .filter((imagem): imagem is ImagemPublica => Boolean(imagem));
  const comodidades = montarComodidadesPublicas(propriedade.id, relacionamentos);
  const minPrice = valores.dailyRate > 0 ? valores.dailyRate : null;
  const regrasCasa = montarRegrasCasaPublicas(
    relacionamentos.regras.find((regra) => regra.property_id === propriedade.id),
    estrutura.maxGuests
  );
  const tituloPublico = obterTextoJson(detalhesPublicos, "publicTitle");
  const descricaoPublica = obterTextoJson(detalhesPublicos, "publicDescription");

  return {
    id: propriedade.id,
    tenantId: propriedade.tenant_id,
    name: obterTextoJson(detalhesPublicos, "displayName") || propriedade.name,
    slug: propriedade.slug,
    propertyType: propriedade.property_type,
    propertyTypeLabel: rotuloTipoPropriedade(propriedade.property_type),
    headline:
      tituloPublico ||
      propriedade.headline ||
      propriedade.short_description ||
      "Hospedagem independente com curadoria Hospedex.",
    description:
      descricaoPublica ||
      propriedade.full_description ||
      propriedade.description ||
      propriedade.short_description ||
      "Esta propriedade ainda está preparando uma descrição pública completa.",
    address: endereco,
    locationLabel: formatarLocalizacao(endereco),
    images: imagens,
    coverImage: imagens.find((imagem) => imagem.isCover) ?? imagens[0] ?? null,
    amenities: comodidades,
    minPrice,
    maxGuests: regrasCasa.maxGuests,
    structure: {
      ...estrutura,
      maxGuests: regrasCasa.maxGuests
    },
    pricing: valores,
    availability: montarDisponibilidadePublica(
      propriedade.id,
      relacionamentos.disponibilidade
    ),
    availabilityError: relacionamentos.disponibilidadeErro,
    bedrooms: estrutura.bedrooms,
    beds: estrutura.beds,
    bathrooms: estrutura.bathrooms,
    rules: [
      ...regrasCasa.summary
    ],
    checkIn: regrasCasa.checkIn,
    checkOut: regrasCasa.checkOut,
    houseRules: regrasCasa,
    regionalGuide: montarGuiaRegiaoPublico(
      propriedade.tenant_id,
      relacionamentos.guiaRegiao
    ),
    reviews: montarAvaliacoesPublicas(propriedade.id, relacionamentos.avaliacoes)
  };
}

function montarRegrasCasaPublicas(
  regras: RegrasCasaRowPublica | undefined,
  maxGuestsEstrutura: number
): RegrasCasaPublicas {
  const checkIn = `A partir das ${formatarHorarioRegra(regras?.check_in_time, "14:00")}`;
  const checkOut = `Até ${formatarHorarioRegra(regras?.check_out_time, "11:00")}`;
  const minNights = Math.max(regras?.min_nights ?? 1, 1);
  const maxNights = regras?.max_nights ?? null;
  const maxGuests = Math.max(regras?.max_guests ?? maxGuestsEstrutura, 1);
  const minResponsibleAge = Math.max(regras?.min_responsible_age ?? 18, 0);
  const allowChildren = regras?.allow_children ?? true;
  const allowPets = regras?.allow_pets ?? false;
  const allowSmoking = regras?.allow_smoking ?? false;
  const allowEvents = regras?.allow_events ?? false;
  const additionalRules = normalizarTextoOpcional(regras?.additional_rules);
  const specialInstructions = normalizarTextoOpcional(regras?.special_instructions);
  const cancellationPolicy = montarPoliticaCancelamentoPublica(regras);
  const summary = [
    `${checkIn}; check-out ${checkOut.replace(/^Até /, "até ")}.`,
    `Capacidade máxima de ${maxGuests} ${maxGuests === 1 ? "hóspede" : "hóspedes"}.`,
    `Estadia mínima de ${minNights} ${minNights === 1 ? "noite" : "noites"}.`,
    allowPets ? "Pets permitidos pelo proprietário." : "Pets não permitidos.",
    allowSmoking ? "Fumantes permitidos em áreas autorizadas." : "Ambiente para não fumantes.",
    allowEvents ? "Eventos permitidos conforme aprovação prévia." : "Eventos não permitidos."
  ];

  if (maxNights) {
    summary.push(`Estadia máxima de ${maxNights} ${maxNights === 1 ? "noite" : "noites"}.`);
  }

  if (minResponsibleAge > 0) {
    summary.push(`Responsável pela reserva a partir de ${minResponsibleAge} anos.`);
  }

  if (additionalRules) {
    summary.push(additionalRules);
  }

  return {
    checkIn,
    checkOut,
    allowChildren,
    allowPets,
    allowSmoking,
    allowEvents,
    maxGuests,
    minResponsibleAge,
    minNights,
    maxNights,
    additionalRules,
    specialInstructions,
    cancellationPolicy,
    summary
  };
}

function montarPoliticaCancelamentoPublica(
  regras: RegrasCasaRowPublica | undefined
): PoliticaCancelamentoPublica {
  if (!regras) {
    return {
      itens: [],
      observacoes: null
    };
  }

  const itens = [
    `Até ${regras.cancellation_refund_until_days} dias antes do check-in: reembolso de ${formatarPercentual(
      regras.cancellation_refund_until_percentage
    )}.`,
    `Até ${regras.cancellation_late_until_days} dias antes do check-in: reembolso de ${formatarPercentual(
      regras.cancellation_late_refund_percentage
    )}.`,
    `Dentro dos últimos ${regras.cancellation_no_refund_within_days} dias: sem reembolso.`
  ];

  return {
    itens,
    observacoes: normalizarTextoOpcional(regras.cancellation_notes)
  };
}

function montarGuiaRegiaoPublico(
  tenantId: string,
  locais: GuiaRegiaoRowPublica[]
): LocalGuiaRegiaoPublico[] {
  return locais
    .filter(
      (local) =>
        local.tenant_id === tenantId &&
        local.status === "active" &&
        local.deleted_at === null
    )
    .map((local) => ({
      id: local.id,
      category: local.category,
      categoryLabel: rotuloCategoriaGuiaRegiao(local.category),
      name: local.name,
      description: normalizarTextoOpcional(local.description),
      address: normalizarTextoOpcional(local.address),
      phone: normalizarTextoOpcional(local.phone),
      whatsapp: normalizarTextoOpcional(local.whatsapp),
      websiteUrl: normalizarTextoOpcional(local.website_url),
      openingHours: normalizarTextoOpcional(local.opening_hours),
      coverImageUrl: normalizarTextoOpcional(local.cover_image_url)
    }));
}

function montarAvaliacoesPublicas(
  propriedadeId: string,
  avaliacoes: AvaliacaoRowPublica[]
): ResumoAvaliacoesPublicas {
  const publicadas = avaliacoes
    .filter(
      (avaliacao) =>
        avaliacao.property_id === propriedadeId && avaliacao.status === "approved"
    )
    .map((avaliacao) => ({
      ...avaliacao,
      rating: limitarNotaAvaliacao(avaliacao.rating)
    }));
  const total = publicadas.length;
  const soma = publicadas.reduce((acumulado, avaliacao) => acumulado + avaliacao.rating, 0);
  const average = total ? Number((soma / total).toFixed(1)) : null;
  const distribution = [5, 4, 3, 2, 1].map((stars) => {
    const count = publicadas.filter((avaliacao) => avaliacao.rating === stars).length;

    return {
      stars,
      count,
      percentage: total ? Math.round((count / total) * 100) : 0
    };
  });

  return {
    average,
    total,
    distribution,
    comments: publicadas.map((avaliacao) => ({
      id: avaliacao.id,
      guestName: avaliacao.guest_name,
      rating: avaliacao.rating,
      comment: avaliacao.comment,
      reviewedAt: avaliacao.reviewed_at,
      ownerResponse: normalizarTextoOpcional(avaliacao.owner_response),
      ownerRespondedAt: avaliacao.owner_responded_at
    }))
  };
}

function montarImagemPublica(
  supabase: SupabaseClient,
  midia: MidiaRowPublica
): ImagemPublica | null {
  const url = obterUrlMidia(supabase, midia);
  if (!url) return null;

  return {
    id: midia.id,
    url,
    alt: midia.alt ?? "Foto da propriedade Hospedex",
    isCover: midia.is_cover
  };
}

function obterUrlMidia(supabase: SupabaseClient, midia: MidiaRowPublica) {
  if (midia.url) return midia.url;
  if (!midia.storage_bucket || !midia.storage_path) return null;

  return supabase.storage
    .from(midia.storage_bucket)
    .getPublicUrl(midia.storage_path).data.publicUrl;
}

function montarComodidadesPublicas(
  propriedadeId: string,
  relacionamentos: {
    vinculosComodidades: VinculoComodidadeRowPublica[];
    comodidades: ComodidadeRowPublica[];
  }
): ComodidadePublica[] {
  const idsAtivos = new Set(
    relacionamentos.vinculosComodidades
      .filter((vinculo) => vinculo.property_id === propriedadeId)
      .map((vinculo) => vinculo.amenity_id)
  );

  return relacionamentos.comodidades
    .filter((comodidade) => idsAtivos.has(comodidade.id))
    .map((comodidade) => ({
      id: comodidade.id,
      code: comodidade.code,
      name: comodidade.name,
      category: comodidade.category
    }));
}

function normalizarEndereco(valor: JsonValue): EnderecoPublico {
  const endereco = valorEhObjeto(valor) ? valor : {};

  return {
    bairro: obterTextoJson(endereco, "bairro"),
    cep: obterTextoJson(endereco, "cep"),
    complemento: obterTextoJson(endereco, "complemento"),
    googleMapsLink: obterTextoJson(endereco, "googleMapsLink"),
    linha1: obterTextoJson(endereco, "linha1"),
    numero: obterTextoJson(endereco, "numero"),
    cidade: obterTextoJson(endereco, "cidade") || obterTextoJson(endereco, "city"),
    estado: obterTextoJson(endereco, "estado") || obterTextoJson(endereco, "state")
  };
}

function normalizarEstruturaCasa(valor: JsonValue): EstruturaCasaPublica {
  const estrutura = valorEhObjeto(valor) ? valor : {};

  return {
    bathrooms: obterNumeroJson(estrutura, "banheiros"),
    bedrooms: obterNumeroJson(estrutura, "quartos"),
    beds: obterNumeroJson(estrutura, "camas"),
    garageSpaces: obterNumeroJson(estrutura, "garagemVagas"),
    maxGuests: obterNumeroJson(estrutura, "hospedesMaximos", 1)
  };
}

function normalizarValoresCasa(valor: JsonValue): ValoresCasaPublica {
  const valores = valorEhObjeto(valor) ? valor : {};

  return {
    cleaningFee: obterNumeroJson(valores, "taxaLimpeza"),
    dailyRate: obterNumeroJson(valores, "valorDiaria")
  };
}

function montarDisponibilidadePublica(
  propriedadeId: string,
  periodos: DisponibilidadeRowPublica[]
): PeriodoDisponibilidadePublica[] {
  return periodos
    .filter(
      (periodo) =>
        periodo.property_id === propriedadeId &&
        STATUS_DISPONIBILIDADE_PUBLICA.includes(
          periodo.status as (typeof STATUS_DISPONIBILIDADE_PUBLICA)[number]
        )
    )
    .map((periodo) => ({
      endsOn: periodo.ends_on,
      startsOn: periodo.starts_on,
      status: periodo.status as StatusDisponibilidadePublica
    }));
}

function obterTextoJson(valor: Record<string, JsonValue>, chave: string): string {
  const dado = valor[chave];
  return typeof dado === "string" ? dado : "";
}

function obterNumeroJson(
  valor: Record<string, JsonValue>,
  chave: string,
  padrao = 0
) {
  const dado = valor[chave];
  return typeof dado === "number" && Number.isFinite(dado) ? dado : padrao;
}

function normalizarTextoOpcional(valor: string | null | undefined) {
  const texto = valor?.trim();
  return texto ? texto : null;
}

function valorEhObjeto(valor: JsonValue): valor is Record<string, JsonValue> {
  return Boolean(valor) && typeof valor === "object" && !Array.isArray(valor);
}

function formatarLocalizacao(endereco: EnderecoPublico) {
  return [endereco.cidade, endereco.estado].filter(Boolean).join(", ") || "Brasil";
}

function formatarDataIso(data: Date) {
  return data.toISOString().slice(0, 10);
}

function possuiFiltroDaCasa(filtros: FiltrosPropriedadesPublicas) {
  return Boolean(
    filtros.hospedes ||
      filtros.precoMinimo ||
      filtros.precoMaximo ||
      periodoValido(filtros.dataInicio, filtros.dataFim)
  );
}

function periodoValido(dataInicio?: string, dataFim?: string) {
  return Boolean(
    dataInicio &&
      dataFim &&
      /^\d{4}-\d{2}-\d{2}$/.test(dataInicio) &&
      /^\d{4}-\d{2}-\d{2}$/.test(dataFim) &&
      dataFim > dataInicio
  );
}

function rotuloTipoPropriedade(tipo: PropertyType) {
  const rotulos: Record<PropertyType, string> = {
    seasonal_home: "Casa de temporada",
    inn: "Pousada",
    small_hotel: "Pequeno hotel"
  };

  return rotulos[tipo];
}

function rotuloCategoriaGuiaRegiao(categoria: RegionalGuideCategory) {
  const rotulos: Record<RegionalGuideCategory, string> = {
    beaches: "Praias",
    coffee_shops: "Cafeterias",
    hospitals: "Hospitais",
    markets: "Mercados",
    nightlife: "Vida noturna",
    others: "Outros",
    pharmacies: "Farmácias",
    restaurants: "Restaurantes",
    snack_bars: "Lanchonetes",
    tourist_spots: "Pontos turísticos",
    tours: "Passeios",
    waterfalls: "Cachoeiras"
  };

  return rotulos[categoria];
}

function formatarHorarioRegra(valor: string | null | undefined, fallback: string) {
  const horario = valor || fallback;
  const [hora, minuto = "00"] = horario.split(":");
  const horaNormalizada = hora?.padStart(2, "0") || fallback.slice(0, 2);

  return minuto === "00" ? `${horaNormalizada}h` : `${horaNormalizada}h${minuto}`;
}

function formatarPercentual(valor: number) {
  return `${Math.round(valor)}%`;
}

function limitarNotaAvaliacao(valor: number) {
  return Math.min(Math.max(Math.round(valor), 1), 5);
}

function limitarQuantidade(valor: number) {
  return Math.min(Math.max(valor, 1), 60);
}

function valorEhUuid(valor: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    valor
  );
}

function registrarErroLeitura(contexto: string, erro: { message: string } | null) {
  if (!erro) return;
  throw new Error(`Erro ao carregar ${contexto}: ${erro.message}`);
}

function obterMensagemErro(erro: unknown) {
  if (erro instanceof Error) return erro.message;
  return "Não foi possível carregar o marketplace agora.";
}
