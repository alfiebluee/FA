"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import {
  Map as MapLibreMap,
  Marker,
  LngLatBounds,
  type GeoJSONSource,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapControls } from "@/components/map/MapControls";
import { configureMapLibreWorker } from "@/lib/map/worker";
import type { AssessedAircraft, DisplaySettings, MapMode } from "@/lib/aviation/types";
import type { TrailsMap } from "@/lib/hooks/useAviationStore";
import type { ReckonedPosition } from "@/lib/hooks/useDeadReckoning";
import { PUBLIC_META } from "@/lib/config/public";
import { visualCategoryFromType } from "@/lib/aviation/aircraft-types";
import { planViewMarkerSvg } from "@/lib/aviation/marker-svg";
import { destinationPoint, nmToKm } from "@/lib/geo/distance";

type Props = {
  aircraft: AssessedAircraft[];
  focus: AssessedAircraft | null;
  selectedIcao24: string | null;
  trails: TrailsMap;
  positions: Record<string, ReckonedPosition>;
  settings: DisplaySettings;
  mapMode: MapMode;
  onMapMode: (mode: MapMode) => void;
  onSelect: (icao24: string) => void;
  displayMode?: boolean;
};

const OBSERVER_SOURCE = "observer";
const HEATHROW_SOURCE = "heathrow";
const TRAIL_SOURCE = "trail";
const PROJECTED_SOURCE = "projected";
const FOCUS_LINE_SOURCE = "focus-line";
const RADIUS_SOURCE = "radius";
const CORRIDOR_SOURCE = "corridor";
const RADAR_MARKER_KEY = "__observer_radar__";

function circlePolygon(
  lat: number,
  lon: number,
  radiusKm: number,
  points = 72,
): GeoJSON.Feature {
  const coords: [number, number][] = [];
  for (let i = 0; i <= points; i++) {
    const bearing = (i / points) * 360;
    const p = destinationPoint(lat, lon, bearing, radiusKm);
    coords.push([p.longitude, p.latitude]);
  }
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "Polygon", coordinates: [coords] },
  };
}

/** Wedge showing the arrival track that crosses the observation point. */
function arrivalCorridor(lat: number, lon: number): GeoJSON.Feature {
  const heathrow = PUBLIC_META.heathrow;
  const inbound = 58; // aircraft arrive from the north-east
  const halfWidthKm = 7;

  const farLeft = destinationPoint(lat, lon, inbound - 8, 58);
  const farRight = destinationPoint(lat, lon, inbound + 8, 58);
  const nearLeft = destinationPoint(
    heathrow.latitude,
    heathrow.longitude,
    inbound - 90,
    halfWidthKm,
  );
  const nearRight = destinationPoint(
    heathrow.latitude,
    heathrow.longitude,
    inbound + 90,
    halfWidthKm,
  );

  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [farLeft.longitude, farLeft.latitude],
          [farRight.longitude, farRight.latitude],
          [nearRight.longitude, nearRight.latitude],
          [nearLeft.longitude, nearLeft.latitude],
          [farLeft.longitude, farLeft.latitude],
        ],
      ],
    },
  };
}

export function LiveFlightMap({
  aircraft,
  focus,
  selectedIcao24,
  trails,
  positions,
  settings,
  mapMode,
  onMapMode,
  onSelect,
  displayMode,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const markerStateRef = useRef<Map<string, string>>(new Map());
  const readyRef = useRef(false);
  const [mapError, setMapError] = useState(false);
  const [styleReady, setStyleReady] = useState(false);

  const observerLat = settings.observerLat;
  const observerLon = settings.observerLon;
  const heathrow = PUBLIC_META.heathrow;

  const fitView = useCallback(
    (mode: MapMode, map: MapLibreMap, focusAc: AssessedAircraft | null) => {
      // The flight panel floats over the left of the map on wide screens, so
      // bias the framing into the clear area beside it.
      const width = map.getContainer().offsetWidth;
      const panelInset = width >= 1024 ? Math.min(width * 0.48, 720) : 0;
      const padding = {
        top: 90,
        bottom: 110,
        left: panelInset + 70,
        right: 90,
      };

      if (mode === "observer") {
        map.easeTo({
          center: [observerLon, observerLat],
          zoom: 10.5,
          padding,
          duration: 1200,
        });
        return;
      }
      if (mode === "heathrow") {
        map.easeTo({
          center: [heathrow.longitude, heathrow.latitude],
          zoom: 11,
          padding,
          duration: 1200,
        });
        return;
      }

      const bounds = new LngLatBounds();
      bounds.extend([observerLon, observerLat]);
      bounds.extend([heathrow.longitude, heathrow.latitude]);
      if (mode === "follow" && focusAc) {
        bounds.extend([focusAc.longitude, focusAc.latitude]);
      }
      map.fitBounds(bounds, {
        padding,
        duration: 1400,
        maxZoom: mode === "follow" ? 11.5 : 10.5,
      });
    },
    [observerLat, observerLon, heathrow],
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let cancelled = false;
    let map: MapLibreMap;

    try {
      configureMapLibreWorker();
      map = new MapLibreMap({
        container: containerRef.current,
        style: PUBLIC_META.mapStyleUrl,
        center: [
          (observerLon + heathrow.longitude) / 2,
          (observerLat + heathrow.latitude) / 2,
        ],
        zoom: 9.5,
        attributionControl: { compact: true },
        dragRotate: false,
        pitchWithRotate: false,
      });
    } catch {
      queueMicrotask(() => setMapError(true));
      return;
    }

    mapRef.current = map;
    const markers = markersRef.current;
    const markerState = markerStateRef.current;

    map.on("load", () => {
      if (cancelled) return;
      readyRef.current = true;
      dimBasemap(map);

      map.addSource(OBSERVER_SOURCE, {
        type: "geojson",
        data: pointFeature(observerLon, observerLat),
      });
      map.addSource(HEATHROW_SOURCE, {
        type: "geojson",
        data: pointFeature(heathrow.longitude, heathrow.latitude),
      });
      map.addSource(TRAIL_SOURCE, { type: "geojson", data: emptyFc() });
      map.addSource(PROJECTED_SOURCE, { type: "geojson", data: emptyFc() });
      map.addSource(FOCUS_LINE_SOURCE, { type: "geojson", data: emptyFc() });
      map.addSource(RADIUS_SOURCE, {
        type: "geojson",
        data: circlePolygon(observerLat, observerLon, nmToKm(settings.searchRadiusNm)),
      });
      map.addSource(CORRIDOR_SOURCE, {
        type: "geojson",
        data: arrivalCorridor(observerLat, observerLon),
      });

      map.addLayer({
        id: "corridor-fill",
        type: "fill",
        source: CORRIDOR_SOURCE,
        paint: { "fill-color": "#6ee7f2", "fill-opacity": 0.045 },
      });
      map.addLayer({
        id: "corridor-line",
        type: "line",
        source: CORRIDOR_SOURCE,
        paint: {
          "line-color": "#6ee7f2",
          "line-opacity": 0.16,
          "line-width": 1,
          "line-dasharray": [3, 4],
        },
      });
      map.addLayer({
        id: "radius-ring",
        type: "line",
        source: RADIUS_SOURCE,
        paint: {
          "line-color": "#6ee7f2",
          "line-opacity": 0.16,
          "line-width": 1,
          "line-dasharray": [2, 4],
        },
      });
      map.addLayer({
        id: "focus-heathrow-line",
        type: "line",
        source: FOCUS_LINE_SOURCE,
        paint: {
          "line-color": "#6ee7f2",
          "line-width": 1,
          "line-opacity": 0.28,
          "line-dasharray": [1, 3],
        },
      });
      map.addLayer({
        id: "trail-glow",
        type: "line",
        source: TRAIL_SOURCE,
        paint: {
          "line-color": "#6ee7f2",
          "line-width": 7,
          "line-opacity": 0.12,
          "line-blur": 4,
        },
      });
      map.addLayer({
        id: "trail-line",
        type: "line",
        source: TRAIL_SOURCE,
        paint: {
          "line-color": "#a8f4fd",
          "line-width": 1.75,
          "line-opacity": 0.7,
        },
      });
      map.addLayer({
        id: "projected-line",
        type: "line",
        source: PROJECTED_SOURCE,
        paint: {
          "line-color": "#6ee7f2",
          "line-width": 1.25,
          "line-opacity": 0.45,
          "line-dasharray": [2, 3],
        },
      });
      map.addLayer({
        id: "observer-label",
        type: "symbol",
        source: OBSERVER_SOURCE,
        layout: {
          "text-field": "OBSERVATION POINT",
          "text-offset": [0, 3],
          "text-size": 9,
          "text-letter-spacing": 0.24,
          "text-font": ["Noto Sans Regular"],
        },
        paint: {
          "text-color": "#6ee7f2",
          "text-halo-color": "#04070a",
          "text-halo-width": 1.5,
        },
      });
      map.addLayer({
        id: "heathrow-halo",
        type: "circle",
        source: HEATHROW_SOURCE,
        paint: {
          "circle-radius": 16,
          "circle-color": "#6ee7f2",
          "circle-opacity": 0.08,
        },
      });
      map.addLayer({
        id: "heathrow-marker",
        type: "circle",
        source: HEATHROW_SOURCE,
        paint: {
          "circle-radius": 5,
          "circle-color": "#04070a",
          "circle-stroke-width": 1.75,
          "circle-stroke-color": "#a8f4fd",
        },
      });
      map.addLayer({
        id: "heathrow-label",
        type: "symbol",
        source: HEATHROW_SOURCE,
        layout: {
          "text-field": "LHR",
          "text-offset": [0, 1.6],
          "text-size": 10,
          "text-letter-spacing": 0.22,
          // The only font stack OpenFreeMap serves glyphs for.
          "text-font": ["Noto Sans Regular"],
        },
        paint: {
          "text-color": "#f2f8fa",
          "text-halo-color": "#04070a",
          "text-halo-width": 1.5,
        },
      });

      const radarEl = document.createElement("div");
      radarEl.className = "observer-radar-marker";
      radarEl.innerHTML = `
        <div class="observer-radar-rings">
          <span></span><span></span><span></span>
          <i class="observer-radar-sweep"></i>
          <i class="observer-radar-pulse"></i>
          <b></b>
        </div>`;
      markers.set(
        RADAR_MARKER_KEY,
        new Marker({ element: radarEl, anchor: "center" })
          .setLngLat([observerLon, observerLat])
          .addTo(map),
      );

      fitView("overview", map, null);
      setStyleReady(true);
    });

    map.on("error", (event) => {
      // Tile or glyph hiccups should not take the display down.
      if (process.env.NODE_ENV === "development") {
        console.warn("[map]", event.error?.message ?? event);
      }
    });

    return () => {
      cancelled = true;
      markers.forEach((m) => m.remove());
      markers.clear();
      markerState.clear();
      map.remove();
      mapRef.current = null;
      readyRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Aircraft markers — rebuilt only when appearance changes, moved every frame.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current || !styleReady) return;

    const markers = markersRef.current;
    const seen = new Set<string>([RADAR_MARKER_KEY]);

    for (const a of aircraft) {
      seen.add(a.icao24);
      const isFocus = a.icao24 === focus?.icao24;
      const isSelected = a.icao24 === selectedIcao24;
      const isArrival = a.relevance === "arrival";
      const pos = positions[a.icao24];
      const lngLat: [number, number] = pos
        ? [pos.longitude, pos.latitude]
        : [a.longitude, a.latitude];
      const track = pos?.track ?? a.trackDegrees ?? 0;

      let marker = markers.get(a.icao24);
      if (!marker) {
        const el = document.createElement("button");
        el.type = "button";
        el.className = "aircraft-map-marker";
        el.setAttribute("aria-label", `Aircraft ${a.displayLabel}`);
        el.addEventListener("click", (event) => {
          event.stopPropagation();
          onSelect(a.icao24);
        });
        marker = new Marker({ element: el, anchor: "center" })
          .setLngLat(lngLat)
          .addTo(map);
        markers.set(a.icao24, marker);
      }

      marker.setLngLat(lngLat);

      const category = visualCategoryFromType(a.aircraftTypeCode, a.category);
      const colour = isFocus
        ? "#a8f4fd"
        : isSelected
          ? "#f5b942"
          : isArrival
            ? "#6ee7f2"
            : "#93a7b4";
      const size = isFocus ? 34 : isArrival ? 26 : 21;
      const signature = `${a.aircraftTypeCode ?? category}|${colour}|${size}|${isFocus}`;

      const el = marker.getElement();
      if (markerStateRef.current.get(a.icao24) !== signature) {
        markerStateRef.current.set(a.icao24, signature);
        el.innerHTML = `<div class="aircraft-map-marker__inner" style="color:${colour};filter:${
          isFocus ? "drop-shadow(0 0 8px rgba(110,231,242,0.55))" : "none"
        };opacity:${isArrival ? 1 : 0.7}">${planViewMarkerSvg({
          typeCode: a.aircraftTypeCode,
          category,
          size,
        })}</div>`;
      }

      const inner = el.firstElementChild as HTMLElement | null;
      if (inner) inner.style.transform = `rotate(${track}deg)`;
    }

    for (const [id, marker] of markers) {
      if (!seen.has(id)) {
        marker.remove();
        markers.delete(id);
        markerStateRef.current.delete(id);
      }
    }
  }, [aircraft, focus, selectedIcao24, positions, onSelect, styleReady]);

  // Trails, projected path and focus line
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current || !styleReady) return;

    if (focus && trails[focus.icao24]?.length > 1) {
      setGeoJson(map, TRAIL_SOURCE, {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: trails[focus.icao24].map(
            (p) => [p.lon, p.lat] as [number, number],
          ),
        },
      });
    } else {
      setGeoJson(map, TRAIL_SOURCE, emptyFc());
    }

    const livePos = focus ? positions[focus.icao24] : null;
    if (settings.showProjectedPaths && focus && focus.trackDegrees != null) {
      const origin = livePos ?? {
        latitude: focus.latitude,
        longitude: focus.longitude,
        track: focus.trackDegrees,
      };
      const tip = destinationPoint(origin.latitude, origin.longitude, origin.track, 18);
      setGeoJson(map, PROJECTED_SOURCE, {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [origin.longitude, origin.latitude],
            [tip.longitude, tip.latitude],
          ],
        },
      });
    } else {
      setGeoJson(map, PROJECTED_SOURCE, emptyFc());
    }

    if (focus) {
      const origin = livePos ?? {
        latitude: focus.latitude,
        longitude: focus.longitude,
      };
      setGeoJson(map, FOCUS_LINE_SOURCE, {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [origin.longitude, origin.latitude],
            [heathrow.longitude, heathrow.latitude],
          ],
        },
      });
    } else {
      setGeoJson(map, FOCUS_LINE_SOURCE, emptyFc());
    }
  }, [focus, trails, positions, settings.showProjectedPaths, heathrow, styleReady]);

  // Observer-dependent geometry
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current || !styleReady) return;
    setGeoJson(map, OBSERVER_SOURCE, pointFeature(observerLon, observerLat));
    setGeoJson(
      map,
      RADIUS_SOURCE,
      circlePolygon(observerLat, observerLon, nmToKm(settings.searchRadiusNm)),
    );
    setGeoJson(map, CORRIDOR_SOURCE, arrivalCorridor(observerLat, observerLon));
    markersRef.current.get(RADAR_MARKER_KEY)?.setLngLat([observerLon, observerLat]);
  }, [observerLat, observerLon, settings.searchRadiusNm, styleReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    fitView(mapMode, map, focus);
  }, [mapMode, focus, fitView]);

  if (mapError) {
    return (
      <div className="flex h-full items-center justify-center bg-[var(--ink-100)] px-6 text-center text-sm text-[var(--text-tertiary)]">
        Map unavailable — check the map style URL and network access. Live tracking
        continues without it.
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute inset-0 vignette" aria-hidden />
      <MapControls mode={mapMode} onMode={onMapMode} displayMode={displayMode} />
      <p className="pointer-events-none absolute bottom-2 left-3 z-10 max-w-xs text-[9px] leading-relaxed text-[var(--text-tertiary)]">
        Map: OpenFreeMap · OpenStreetMap contributors
      </p>
    </div>
  );
}

/** Push the basemap back so it reads as atmosphere rather than a chart. */
function dimBasemap(map: MapLibreMap) {
  const style = map.getStyle();
  if (!style?.layers) return;
  for (const layer of style.layers) {
    try {
      if (layer.type === "symbol") {
        map.setPaintProperty(layer.id, "text-opacity", 0.4);
        map.setPaintProperty(layer.id, "icon-opacity", 0);
      } else if (layer.type === "line") {
        map.setPaintProperty(layer.id, "line-opacity", 0.55);
      } else if (layer.type === "background") {
        map.setPaintProperty(layer.id, "background-color", "#06090d");
      }
    } catch {
      /* Layer does not support the property — skip it. */
    }
  }
}

function pointFeature(lon: number, lat: number): GeoJSON.Feature {
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "Point", coordinates: [lon, lat] },
  };
}

function setGeoJson(
  map: MapLibreMap,
  sourceId: string,
  data: GeoJSON.Feature | GeoJSON.FeatureCollection,
) {
  const source = map.getSource(sourceId) as GeoJSONSource | undefined;
  if (source) source.setData(data as GeoJSON.FeatureCollection);
}

function emptyFc(): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features: [] };
}
