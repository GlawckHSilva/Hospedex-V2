"use client";

import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";
import { LocateFixed, MapPin, Search, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@hospedex/ui";

const CENTRO_BRASIL: [number, number] = [-14.235, -51.9253];

function numeroCoordenada(valor?: number | null) {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : null;
}

function lerEnderecoDoFormulario(elemento: HTMLElement | null) {
  const formulario = elemento?.closest("form");
  if (!formulario) return "";

  const dados = new FormData(formulario);
  return [
    dados.get("endereco"),
    dados.get("numero"),
    dados.get("bairro"),
    dados.get("cidade"),
    dados.get("estado"),
    dados.get("cep"),
    "Brasil",
  ]
    .map((valor) => String(valor ?? "").trim())
    .filter(Boolean)
    .join(", ");
}

export function PropertyLocationMap({
  active,
  disabled,
  latitude,
  longitude,
}: {
  active: boolean;
  disabled: boolean;
  latitude?: number | null | undefined;
  longitude?: number | null | undefined;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const latitudeInicial = numeroCoordenada(latitude);
  const longitudeInicial = numeroCoordenada(longitude);
  const [position, setPosition] = useState<[number, number] | null>(() =>
    latitudeInicial !== null && longitudeInicial !== null
      ? [latitudeInicial, longitudeInicial]
      : null,
  );
  const positionRef = useRef(position);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    if (!active || !containerRef.current || mapRef.current) return;

    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    void import("leaflet").then((L) => {
      if (cancelled || !containerRef.current) return;

      const currentPosition = positionRef.current;
      const center = currentPosition ?? CENTRO_BRASIL;
      const map = L.map(containerRef.current, {
        center,
        scrollWheelZoom: false,
        zoom: currentPosition ? 16 : 4,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      function createMarker(nextPosition: [number, number]) {
        if (markerRef.current) {
          markerRef.current.setLatLng(nextPosition);
          return;
        }

        const marker = L.marker(nextPosition, { draggable: !disabled }).addTo(
          map,
        );
        marker.on("dragend", () => {
          const coordinates = marker.getLatLng();
          setPosition([coordinates.lat, coordinates.lng]);
          setMessage("Localização atualizada.");
        });
        markerRef.current = marker;
      }

      if (currentPosition) createMarker(currentPosition);

      if (!disabled) {
        map.on("click", (event) => {
          const nextPosition: [number, number] = [
            event.latlng.lat,
            event.latlng.lng,
          ];
          createMarker(nextPosition);
          setPosition(nextPosition);
          setMessage("Localização marcada.");
        });
      }

      mapRef.current = map;
      resizeObserver = new ResizeObserver(() => map.invalidateSize(false));
      resizeObserver.observe(containerRef.current);
      window.setTimeout(() => map.invalidateSize(false), 0);
    });

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [active, disabled]);

  async function locateAddress() {
    const query = lerEnderecoDoFormulario(containerRef.current);
    if (!query) {
      setMessage("Preencha ao menos cidade e estado antes de localizar.");
      return;
    }

    setSearching(true);
    setMessage(null);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=br&q=${encodeURIComponent(query)}`,
      );
      if (!response.ok) throw new Error("Falha ao localizar endereço");
      const results = (await response.json()) as Array<{
        lat: string;
        lon: string;
      }>;
      const result = results[0];
      if (!result) {
        setMessage(
          "Endereço não encontrado. Ajuste os campos ou marque no mapa.",
        );
        return;
      }

      const nextPosition: [number, number] = [
        Number(result.lat),
        Number(result.lon),
      ];
      setPosition(nextPosition);
      mapRef.current?.setView(nextPosition, 17);

      const L = await import("leaflet");
      if (!mapRef.current) return;
      if (markerRef.current) {
        markerRef.current.setLatLng(nextPosition);
      } else {
        const marker = L.marker(nextPosition, { draggable: !disabled }).addTo(
          mapRef.current,
        );
        marker.on("dragend", () => {
          const coordinates = marker.getLatLng();
          setPosition([coordinates.lat, coordinates.lng]);
          setMessage("Localização atualizada.");
        });
        markerRef.current = marker;
      }
      setMessage("Endereço localizado. Arraste o alfinete para ajustar.");
    } catch {
      setMessage(
        "Não foi possível localizar agora. Marque o ponto diretamente no mapa.",
      );
    } finally {
      setSearching(false);
    }
  }

  return (
    <section className="grid gap-2 rounded-xl border bg-background/45 p-3 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <MapPin className="h-4 w-4 text-cyan-500" />
            Localização no mapa
          </p>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
            Localize pelo endereço ou toque no mapa para posicionar o alfinete.
          </p>
        </div>
        <button
          className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-cyan-400/35 bg-cyan-500/10 px-2.5 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-50 dark:text-cyan-200"
          disabled={disabled || searching}
          onClick={() => void locateAddress()}
          type="button"
        >
          {searching ? (
            <LocateFixed className="h-3.5 w-3.5 animate-pulse" />
          ) : (
            <Search className="h-3.5 w-3.5" />
          )}
          <span>Localizar</span>
        </button>
      </div>

      <div
        aria-label="Mapa para selecionar a localização da hospedagem"
        className={cn(
          "h-52 overflow-hidden rounded-lg border bg-muted sm:h-64",
          disabled && "opacity-70",
        )}
        ref={containerRef}
        role="region"
      />

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <LocateFixed className="h-3.5 w-3.5 shrink-0 text-cyan-500" />
        <span>
          {message ||
            (position
              ? "Localização marcada. Arraste o alfinete para refinar."
              : "Nenhum ponto marcado ainda.")}
        </span>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-xs leading-5 text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
        <span>
          O endereço exato fica protegido. No Marketplace, visitantes verão
          apenas a região aproximada; os dados completos ficam restritos à
          operação e à reserva confirmada.
        </span>
      </div>

      <input name="latitude" type="hidden" value={position?.[0] ?? ""} />
      <input name="longitude" type="hidden" value={position?.[1] ?? ""} />
    </section>
  );
}
