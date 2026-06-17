import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  AmenityRow,
  CalendarAvailabilityBlockRow,
  JsonValue,
  MediaAssetRow,
  PropertyAmenityRow,
  PropertyRow,
  PropertyType,
  ReservationRow,
  UnitCategoryRow,
  UnitRow
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
  | "address"
  | "timezone"
  | "created_at"
  | "updated_at"
  | "deleted_at"
>;

type MidiaRowPublica = Pick<
  MediaAssetRow,
  | "id"
  | "property_id"
  | "unit_id"
  | "media_type"
  | "storage_bucket"
  | "storage_path"
  | "url"
  | "alt"
  | "sort_order"
  | "is_cover"
  | "status"
>;

type UnidadeRowPublica = Pick<
  UnitRow,
  | "id"
  | "property_id"
  | "unit_category_id"
  | "name"
  | "status"
  | "capacity"
  | "bedrooms"
  | "beds"
  | "bathrooms"
  | "base_price"
>;

type CategoriaRowPublica = Pick<
  UnitCategoryRow,
  "id" | "property_id" | "name" | "description" | "max_guests" | "bedrooms" | "bathrooms"
>;

type ComodidadeRowPublica = Pick<AmenityRow, "id" | "code" | "name" | "category">;
type VinculoComodidadeRowPublica = Pick<
  PropertyAmenityRow,
  "property_id" | "amenity_id"
>;

export type ImagemPublica = {
  id: string;
  url: string;
  alt: string;
  isCover: boolean;
};

export type UnidadePublica = {
  id: string;
  name: string;
  categoryName: string | null;
  description: string | null;
  capacity: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  basePrice: number;
};

export type ComodidadePublica = {
  id: string;
  code: string;
  name: string;
  category: string | null;
};

export type EnderecoPublico = {
  linha1: string;
  cidade: string;
  estado: string;
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
  units: UnidadePublica[];
  minPrice: number | null;
  maxGuests: number;
  rules: string[];
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
  "id,tenant_id,name,slug,property_type,status,headline,description,address,timezone,created_at,updated_at,deleted_at";
const CAMPOS_MIDIA =
  "id,property_id,unit_id,media_type,storage_bucket,storage_path,url,alt,sort_order,is_cover,status";
const CAMPOS_UNIDADE =
  "id,property_id,unit_category_id,name,status,capacity,bedrooms,beds,bathrooms,base_price";
const CAMPOS_CATEGORIA =
  "id,property_id,name,description,max_guests,bedrooms,bathrooms";
const CAMPOS_COMODIDADE = "id,code,name,category";
const CAMPOS_VINCULO_COMODIDADE = "property_id,amenity_id";
const CAMPOS_RESERVA_OCUPACAO = "property_id,unit_id,status,check_in,check_out";
const CAMPOS_BLOQUEIO_OCUPACAO = "property_id,unit_id,status,starts_on,ends_on";
const TIPOS_PROPRIEDADE = new Set<PropertyType>([
  "seasonal_home",
  "inn",
  "small_hotel"
]);
const STATUS_RESERVA_OCUPA_UNIDADE = [
  "pending",
  "awaiting_payment",
  "confirmed",
  "checked_in"
];
const STATUS_BLOQUEIA_UNIDADE = ["blocked", "unavailable", "reserved"];

type ReservaOcupacaoPublica = Pick<
  ReservationRow,
  "property_id" | "unit_id" | "status" | "check_in" | "check_out"
>;

type BloqueioOcupacaoPublica = Pick<
  CalendarAvailabilityBlockRow,
  "property_id" | "unit_id" | "status" | "starts_on" | "ends_on"
>;

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
    const limiteConsulta = possuiFiltroDeUnidade(filtros) ? Math.max(limite * 4, 48) : limite;
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
    const propriedadesFiltradas = await aplicarFiltrosDeUnidade(
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

async function aplicarFiltrosDeUnidade(
  supabase: SupabaseClient,
  propriedades: PropriedadePublica[],
  filtros: FiltrosPropriedadesPublicas
) {
  if (!possuiFiltroDeUnidade(filtros)) return propriedades;

  const unidadesIndisponiveis = await carregarUnidadesIndisponiveis(
    supabase,
    propriedades,
    filtros
  );

  return propriedades
    .map((propriedade) => {
      const unidades = propriedade.units.filter((unidade) =>
        unidadeAtendeFiltros(unidade, filtros, unidadesIndisponiveis)
      );

      return recomporPropriedadeComUnidades(propriedade, unidades);
    })
    .filter((propriedade) => propriedade.units.length > 0);
}

async function carregarUnidadesIndisponiveis(
  supabase: SupabaseClient,
  propriedades: PropriedadePublica[],
  filtros: FiltrosPropriedadesPublicas
) {
  if (!periodoValido(filtros.dataInicio, filtros.dataFim)) return new Set<string>();

  const idsPropriedades = propriedades.map((propriedade) => propriedade.id);
  if (!idsPropriedades.length) return new Set<string>();

  const [reservasResultado, bloqueiosResultado] = await Promise.all([
    supabase
      .from("reservations")
      .select(CAMPOS_RESERVA_OCUPACAO)
      .in("property_id", idsPropriedades)
      .in("status", STATUS_RESERVA_OCUPA_UNIDADE)
      .lt("check_in", filtros.dataFim!)
      .gt("check_out", filtros.dataInicio!)
      .returns<ReservaOcupacaoPublica[]>(),
    supabase
      .from("calendar_availability_blocks")
      .select(CAMPOS_BLOQUEIO_OCUPACAO)
      .in("property_id", idsPropriedades)
      .in("status", STATUS_BLOQUEIA_UNIDADE)
      .lt("starts_on", filtros.dataFim!)
      .gt("ends_on", filtros.dataInicio!)
      .returns<BloqueioOcupacaoPublica[]>()
  ]);

  registrarErroLeitura("reservas publicas de disponibilidade", reservasResultado.error);
  registrarErroLeitura("bloqueios publicos de disponibilidade", bloqueiosResultado.error);

  return new Set(
    [
      ...(reservasResultado.data ?? []).map((reserva) => reserva.unit_id),
      ...(bloqueiosResultado.data ?? []).map((bloqueio) => bloqueio.unit_id)
    ].filter((unitId): unitId is string => Boolean(unitId))
  );
}

function unidadeAtendeFiltros(
  unidade: UnidadePublica,
  filtros: FiltrosPropriedadesPublicas,
  unidadesIndisponiveis: Set<string>
) {
  if (filtros.hospedes && unidade.capacity < filtros.hospedes) return false;
  if (filtros.precoMinimo && unidade.basePrice < filtros.precoMinimo) return false;
  if (filtros.precoMaximo && unidade.basePrice > filtros.precoMaximo) return false;
  if (unidadesIndisponiveis.has(unidade.id)) return false;
  return true;
}

function recomporPropriedadeComUnidades(
  propriedade: PropriedadePublica,
  unidades: UnidadePublica[]
): PropriedadePublica {
  return {
    ...propriedade,
    maxGuests: obterMaiorCapacidade(unidades),
    minPrice: obterMenorPreco(unidades),
    units: unidades
  };
}

export async function carregarPropriedadePublica(id: string) {
  const supabase = criarClienteMarketplace();

  if (!supabase || !id) {
    return {
      propriedade: null,
      erro: null,
      supabaseConfigurado: Boolean(supabase)
    };
  }

  try {
    const resultado = await supabase
      .from("properties")
      .select(CAMPOS_PROPRIEDADE)
      .eq("id", id)
      .eq("status", "published")
      .is("deleted_at", null)
      .maybeSingle<PropriedadeRowPublica>();

    registrarErroLeitura("propriedade pública", resultado.error);

    if (!resultado.data) {
      return {
        propriedade: null,
        erro: null,
        supabaseConfigurado: true
      };
    }

    const [propriedade] = await montarPropriedadesPublicas(supabase, [resultado.data]);

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
  propriedades: PropriedadeRowPublica[]
) {
  if (!propriedades.length) return [];

  const ids = propriedades.map((propriedade) => propriedade.id);
  const [midiasResultado, unidadesResultado, categoriasResultado, vinculosResultado] =
    await Promise.all([
      supabase
        .from("media_assets")
        .select(CAMPOS_MIDIA)
        .eq("media_type", "image")
        .eq("status", "active")
        .in("property_id", ids)
        .order("sort_order", { ascending: true })
        .returns<MidiaRowPublica[]>(),
      supabase
        .from("units")
        .select(CAMPOS_UNIDADE)
        .eq("status", "active")
        .in("property_id", ids)
        .order("base_price", { ascending: true })
        .returns<UnidadeRowPublica[]>(),
      supabase
        .from("unit_categories")
        .select(CAMPOS_CATEGORIA)
        .in("property_id", ids)
        .returns<CategoriaRowPublica[]>(),
      supabase
        .from("property_amenities")
        .select(CAMPOS_VINCULO_COMODIDADE)
        .in("property_id", ids)
        .returns<VinculoComodidadeRowPublica[]>()
    ]);

  registrarErroLeitura("mídias públicas", midiasResultado.error);
  registrarErroLeitura("unidades públicas", unidadesResultado.error);
  registrarErroLeitura("categorias públicas", categoriasResultado.error);
  registrarErroLeitura("comodidades vinculadas", vinculosResultado.error);

  const comodidades = await carregarComodidadesPublicas(
    supabase,
    vinculosResultado.data ?? []
  );

  return propriedades.map((propriedade) =>
    montarPropriedadePublica(propriedade, {
      supabase,
      midias: midiasResultado.data ?? [],
      unidades: unidadesResultado.data ?? [],
      categorias: categoriasResultado.data ?? [],
      vinculosComodidades: vinculosResultado.data ?? [],
      comodidades
    })
  );
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
    unidades: UnidadeRowPublica[];
    categorias: CategoriaRowPublica[];
    vinculosComodidades: VinculoComodidadeRowPublica[];
    comodidades: ComodidadeRowPublica[];
  }
): PropriedadePublica {
  const endereco = normalizarEndereco(propriedade.address);
  const midias = relacionamentos.midias.filter(
    (midia) => midia.property_id === propriedade.id && !midia.unit_id
  );
  const imagens = midias
    .map((midia) => montarImagemPublica(relacionamentos.supabase, midia))
    .filter((imagem): imagem is ImagemPublica => Boolean(imagem));
  const unidades = montarUnidadesPublicas(propriedade.id, relacionamentos);
  const comodidades = montarComodidadesPublicas(propriedade.id, relacionamentos);
  const minPrice = obterMenorPreco(unidades);
  const maxGuests = Math.max(...unidades.map((unidade) => unidade.capacity), 1);

  return {
    id: propriedade.id,
    tenantId: propriedade.tenant_id,
    name: propriedade.name,
    slug: propriedade.slug,
    propertyType: propriedade.property_type,
    propertyTypeLabel: rotuloTipoPropriedade(propriedade.property_type),
    headline:
      propriedade.headline ??
      "Hospedagem independente com curadoria Hospedex.",
    description:
      propriedade.description ??
      "Esta propriedade ainda está preparando uma descrição pública completa.",
    address: endereco,
    locationLabel: formatarLocalizacao(endereco),
    images: imagens,
    coverImage: imagens.find((imagem) => imagem.isCover) ?? imagens[0] ?? null,
    amenities: comodidades,
    units: unidades,
    minPrice,
    maxGuests,
    rules: [
      "Check-in e check-out confirmados pelo proprietário.",
      "Documento dos hóspedes pode ser solicitado antes da entrada.",
      "Regras específicas da unidade são confirmadas na solicitação de reserva."
    ]
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

function montarUnidadesPublicas(
  propriedadeId: string,
  relacionamentos: {
    unidades: UnidadeRowPublica[];
    categorias: CategoriaRowPublica[];
  }
): UnidadePublica[] {
  return relacionamentos.unidades
    .filter((unidade) => unidade.property_id === propriedadeId)
    .map((unidade) => {
      const categoria = relacionamentos.categorias.find(
        (item) => item.id === unidade.unit_category_id
      );

      return {
        id: unidade.id,
        name: unidade.name,
        categoryName: categoria?.name ?? null,
        description: categoria?.description ?? null,
        capacity: unidade.capacity,
        bedrooms: unidade.bedrooms,
        beds: unidade.beds,
        bathrooms: unidade.bathrooms,
        basePrice: Number(unidade.base_price)
      };
    });
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
    linha1: obterTextoJson(endereco, "linha1"),
    cidade: obterTextoJson(endereco, "cidade") || obterTextoJson(endereco, "city"),
    estado: obterTextoJson(endereco, "estado") || obterTextoJson(endereco, "state")
  };
}

function obterTextoJson(valor: Record<string, JsonValue>, chave: string): string {
  const dado = valor[chave];
  return typeof dado === "string" ? dado : "";
}

function valorEhObjeto(valor: JsonValue): valor is Record<string, JsonValue> {
  return Boolean(valor) && typeof valor === "object" && !Array.isArray(valor);
}

function formatarLocalizacao(endereco: EnderecoPublico) {
  return [endereco.cidade, endereco.estado].filter(Boolean).join(", ") || "Brasil";
}

function obterMenorPreco(unidades: readonly UnidadePublica[]) {
  const precos = unidades
    .map((unidade) => unidade.basePrice)
    .filter((preco) => Number.isFinite(preco) && preco > 0);

  return precos.length ? Math.min(...precos) : null;
}

function obterMaiorCapacidade(unidades: readonly UnidadePublica[]) {
  return Math.max(...unidades.map((unidade) => unidade.capacity), 0);
}

function possuiFiltroDeUnidade(filtros: FiltrosPropriedadesPublicas) {
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

function limitarQuantidade(valor: number) {
  return Math.min(Math.max(valor, 1), 60);
}

function registrarErroLeitura(contexto: string, erro: { message: string } | null) {
  if (!erro) return;
  throw new Error(`Erro ao carregar ${contexto}: ${erro.message}`);
}

function obterMensagemErro(erro: unknown) {
  if (erro instanceof Error) return erro.message;
  return "Não foi possível carregar o marketplace agora.";
}
