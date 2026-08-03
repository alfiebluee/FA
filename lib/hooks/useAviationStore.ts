"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type {
  AssessedAircraft,
  DisplaySettings,
  MapMode,
  NearbyAircraftResponse,
  ProviderStatus,
} from "@/lib/aviation/types";
import { getPublicDefaults, SETTINGS_STORAGE_KEY } from "@/lib/config/public";
import { FOCUS_SELECTION } from "@/lib/config/scoring";

export type TrailPoint = { lat: number; lon: number; t: number };
export type TrailsMap = Record<string, TrailPoint[]>;

export type AviationStore = {
  aircraft: AssessedAircraft[];
  focus: AssessedAircraft | null;
  focusIcao24: string | null;
  manualFocusIcao24: string | null;
  autoFocus: boolean;
  selectedIcao24: string | null;
  providerStatus: ProviderStatus;
  providerName: string;
  fetchedAt: string | null;
  message: string | null;
  isDemo: boolean;
  loading: boolean;
  error: string | null;
  offline: boolean;
  settings: DisplaySettings;
  mapMode: MapMode;
  trails: TrailsMap;
  settingsOpen: boolean;
  displayMode: boolean;
  scannedCount: number;
  arrivalCount: number;
};

type Listener = () => void;

function loadSettings(): DisplaySettings {
  const defaults = getPublicDefaults();
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return defaults;
    const stored = JSON.parse(raw) as Partial<DisplaySettings> & {
      showNonHeathrowTraffic?: boolean;
    };
    const merged = { ...defaults, ...stored };
    // Migrate the previous boolean flag to the traffic view mode
    if (!stored.trafficView && stored.showNonHeathrowTraffic) {
      merged.trafficView = "all";
    }
    delete (merged as { showNonHeathrowTraffic?: boolean }).showNonHeathrowTraffic;
    return merged;
  } catch {
    return defaults;
  }
}

function createStore() {
  let state: AviationStore = {
    aircraft: [],
    focus: null,
    focusIcao24: null,
    manualFocusIcao24: null,
    autoFocus: true,
    selectedIcao24: null,
    providerStatus: "loading",
    providerName: "",
    fetchedAt: null,
    message: null,
    isDemo: false,
    loading: true,
    error: null,
    offline: false,
    settings: getPublicDefaults(),
    mapMode: "overview",
    trails: {},
    settingsOpen: false,
    displayMode: false,
    scannedCount: 0,
    arrivalCount: 0,
  };

  const listeners = new Set<Listener>();
  let abortController: AbortController | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  const emit = () => listeners.forEach((l) => l());

  const setState = (partial: Partial<AviationStore>) => {
    state = { ...state, ...partial };
    emit();
  };

  const updateTrails = (aircraft: AssessedAircraft[]): TrailsMap => {
    const next: TrailsMap = { ...state.trails };
    const now = Date.now();
    for (const a of aircraft) {
      const prev = next[a.icao24] ?? [];
      const last = prev[prev.length - 1];
      if (
        !last ||
        Math.abs(last.lat - a.latitude) > 0.00005 ||
        Math.abs(last.lon - a.longitude) > 0.00005
      ) {
        next[a.icao24] = [...prev, { lat: a.latitude, lon: a.longitude, t: now }].slice(
          -FOCUS_SELECTION.maxTrailPoints,
        );
      }
    }
    // Prune aircraft not seen recently
    const active = new Set(aircraft.map((a) => a.icao24));
    for (const key of Object.keys(next)) {
      if (!active.has(key)) delete next[key];
    }
    return next;
  };

  const resolveFocus = (
    aircraft: AssessedAircraft[],
    serverFocusId: string | null,
  ): { focus: AssessedAircraft | null; focusIcao24: string | null } => {
    if (!state.autoFocus && state.manualFocusIcao24) {
      const manual = aircraft.find((a) => a.icao24 === state.manualFocusIcao24);
      if (manual) return { focus: manual, focusIcao24: manual.icao24 };
    }
    const id = serverFocusId;
    const focus = id ? (aircraft.find((a) => a.icao24 === id) ?? null) : null;
    return { focus, focusIcao24: focus?.icao24 ?? null };
  };

  const fetchAircraft = async () => {
    if (typeof window !== "undefined" && !navigator.onLine) {
      setState({ offline: true, providerStatus: "error", error: "Offline" });
      return;
    }

    abortController?.abort();
    abortController = new AbortController();

    const params = new URLSearchParams();
    if (state.settings.forceDemo) params.set("demo", "true");
    if (state.settings.trafficView === "all") params.set("context", "true");
    // Only send coords if user overrode defaults (still server-validated)
    params.set("lat", String(state.settings.observerLat));
    params.set("lon", String(state.settings.observerLon));
    params.set("radiusNm", String(state.settings.searchRadiusNm));

    try {
      const res = await fetch(`/api/aircraft/nearby?${params}`, {
        signal: abortController.signal,
        cache: "no-store",
      });
      if (!res.ok) {
        const body = (await res
          .json()
          .catch(() => null)) as NearbyAircraftResponse | null;
        if (body?.aircraft) {
          applyResponse(body);
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as NearbyAircraftResponse;
      applyResponse(data);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setState({
        loading: false,
        error: err instanceof Error ? err.message : "Fetch failed",
        providerStatus: state.aircraft.length ? "stale" : "error",
      });
    }
  };

  const applyResponse = (data: NearbyAircraftResponse) => {
    const { focus, focusIcao24 } = resolveFocus(data.aircraft, data.focusIcao24);
    setState({
      aircraft: data.aircraft,
      focus,
      focusIcao24,
      providerStatus: data.providerStatus,
      providerName: data.providerName,
      fetchedAt: data.fetchedAt,
      message: data.message,
      isDemo: data.isDemo,
      loading: false,
      error: null,
      offline: false,
      trails: updateTrails(data.aircraft),
      scannedCount: data.scannedCount ?? data.aircraft.length,
      arrivalCount:
        data.arrivalCount ??
        data.aircraft.filter((a) => a.relevance === "arrival").length,
    });
  };

  return {
    subscribe(listener: Listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot() {
      return state;
    },
    getServerSnapshot() {
      return state;
    },
    init(opts: { forceDemo?: boolean; displayMode?: boolean }) {
      const settings = loadSettings();
      if (opts.forceDemo) settings.forceDemo = true;
      setState({
        settings,
        displayMode: opts.displayMode ?? false,
        mapMode: settings.mapFollowMode ? "follow" : "overview",
      });
      void fetchAircraft();
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = setInterval(() => void fetchAircraft(), settings.refreshIntervalMs);
    },
    refresh: fetchAircraft,
    setSettings(partial: Partial<DisplaySettings>) {
      const settings = { ...state.settings, ...partial };
      setState({ settings });
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      } catch {
        /* ignore */
      }
      if (partial.refreshIntervalMs && pollTimer) {
        clearInterval(pollTimer);
        pollTimer = setInterval(() => void fetchAircraft(), settings.refreshIntervalMs);
      }
      void fetchAircraft();
    },
    resetSettings() {
      const settings = getPublicDefaults();
      setState({ settings });
      try {
        localStorage.removeItem(SETTINGS_STORAGE_KEY);
      } catch {
        /* ignore */
      }
      void fetchAircraft();
    },
    setMapMode(mapMode: MapMode) {
      setState({ mapMode });
    },
    selectAircraft(icao24: string | null) {
      setState({ selectedIcao24: icao24 });
    },
    makeFocus(icao24: string) {
      const focus = state.aircraft.find((a) => a.icao24 === icao24) ?? null;
      setState({
        autoFocus: false,
        manualFocusIcao24: icao24,
        focus,
        focusIcao24: icao24,
        selectedIcao24: icao24,
      });
    },
    returnToAutoFocus() {
      setState({
        autoFocus: true,
        manualFocusIcao24: null,
        selectedIcao24: null,
      });
      void fetchAircraft();
    },
    setSettingsOpen(open: boolean) {
      setState({ settingsOpen: open });
    },
    destroy() {
      abortController?.abort();
      if (pollTimer) clearInterval(pollTimer);
    },
  };
}

export type AviationStoreApi = ReturnType<typeof createStore>;

let storeSingleton: AviationStoreApi | null = null;

export function getAviationStore(): AviationStoreApi {
  if (!storeSingleton) storeSingleton = createStore();
  return storeSingleton;
}

export function useAviationStore(): AviationStore & { api: AviationStoreApi } {
  const api = getAviationStore();
  const state = useSyncExternalStore(
    api.subscribe,
    api.getSnapshot,
    api.getServerSnapshot,
  );
  return { ...state, api };
}

/**
 * Null until mounted so the server-rendered markup never disagrees with the
 * client clock during hydration.
 */
export function useLocalClock(): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setNow(new Date()));
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(id);
    };
  }, []);
  return now;
}

function subscribeReducedMotion(onStoreChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getReducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );
}

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  const toggle = useCallback(async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen();
    }
  }, []);
  return { isFullscreen, toggle };
}

export function useInterpolatedNumber(
  target: number | null,
  durationMs = 800,
): number | null {
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);

    if (target == null || reduced) {
      fromRef.current = target;
      frameRef.current = requestAnimationFrame(() => setValue(target));
      return () => {
        if (frameRef.current) cancelAnimationFrame(frameRef.current);
      };
    }

    const from = fromRef.current ?? target;
    fromRef.current = target;
    if (Math.abs(from - target) < 0.01) {
      frameRef.current = requestAnimationFrame(() => setValue(target));
      return () => {
        if (frameRef.current) cancelAnimationFrame(frameRef.current);
      };
    }

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) ** 3;
      setValue(from + (target - from) * eased);
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target, durationMs, reduced]);

  return value;
}
