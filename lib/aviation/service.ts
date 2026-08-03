import { AdsbLolProvider } from "@/lib/providers/aircraft/adsb-lol";
import { getSharedMockProvider } from "@/lib/providers/aircraft/mock";
import { Flightradar24AircraftPlaceholder } from "@/lib/providers/aircraft/flightradar24-placeholder";
import type { AircraftPositionProvider } from "@/lib/providers/aircraft/interface";
import { NullFlightDetailsProvider } from "@/lib/providers/flight-details/null-provider";
import { Flightradar24PlaceholderProvider } from "@/lib/providers/flight-details/flightradar24-placeholder";
import type { FlightDetailsProvider } from "@/lib/providers/flight-details/interface";
import { getServerConfig } from "@/lib/config/server";
import { enrichAll } from "@/lib/aviation/enrich";
import {
  selectFocusAircraft,
  type FocusSelectionState,
} from "@/lib/aviation/focus-selection";
import type { NearbyAircraftResponse, ProviderStatus } from "@/lib/aviation/types";
import { DEFAULTS } from "@/lib/config/scoring";

type CacheEntry = {
  response: NearbyAircraftResponse;
  expiresAt: number;
  focusState: FocusSelectionState;
  includeContextTraffic: boolean;
};

let cache: CacheEntry | null = null;
let focusState: FocusSelectionState = { focusIcao24: null, focusSinceMs: 0 };
let inFlight: Promise<NearbyAircraftResponse> | null = null;

export function createAircraftProvider(forceDemo = false): {
  provider: AircraftPositionProvider;
  isDemo: boolean;
} {
  const config = getServerConfig();
  if (forceDemo || config.AIRCRAFT_PROVIDER === "mock") {
    return { provider: getSharedMockProvider(), isDemo: true };
  }
  if (config.AIRCRAFT_PROVIDER === "fr24") {
    return {
      provider: new Flightradar24AircraftPlaceholder(
        config.FR24_API_KEY || undefined,
        config.FR24_BASE_URL || undefined,
      ),
      isDemo: false,
    };
  }
  return {
    provider: new AdsbLolProvider(config.ADSB_LOL_BASE_URL),
    isDemo: false,
  };
}

export function createFlightDetailsProvider(): FlightDetailsProvider {
  const config = getServerConfig();
  if (config.FLIGHT_DETAILS_PROVIDER === "fr24") {
    return new Flightradar24PlaceholderProvider(
      config.FR24_API_KEY || undefined,
      config.FR24_BASE_URL || undefined,
    );
  }
  return new NullFlightDetailsProvider();
}

export async function fetchNearbyAircraft(options: {
  forceDemo?: boolean;
  observerLat?: number;
  observerLon?: number;
  radiusNm?: number;
  skipCache?: boolean;
  includeContextTraffic?: boolean;
}): Promise<NearbyAircraftResponse> {
  const config = getServerConfig();
  const observerLat = options.observerLat ?? config.NEXT_PUBLIC_OBSERVER_LAT;
  const observerLon = options.observerLon ?? config.NEXT_PUBLIC_OBSERVER_LON;
  const radiusNm = options.radiusNm ?? config.NEXT_PUBLIC_SEARCH_RADIUS_NM;
  const forceDemo = options.forceDemo ?? false;
  const includeContextTraffic = options.includeContextTraffic ?? false;

  if (
    !options.skipCache &&
    cache &&
    cache.expiresAt > Date.now() &&
    cache.response.isDemo === forceDemo &&
    cache.includeContextTraffic === includeContextTraffic
  ) {
    return cache.response;
  }

  if (inFlight && !options.skipCache) {
    return inFlight;
  }

  inFlight = (async () => {
    let providerStatus: ProviderStatus = "live";
    let providerName = "adsb.lol";
    let isDemo = forceDemo;
    let message: string | null = null;

    const { provider, isDemo: providerIsDemo } = createAircraftProvider(forceDemo);
    providerName = provider.name;
    isDemo = providerIsDemo;

    let raw;
    try {
      raw = await provider.getNearbyAircraft(observerLat, observerLon, radiusNm);
    } catch (err) {
      const code = (err as Error & { code?: string }).code;
      if (!forceDemo && config.AIRCRAFT_PROVIDER === "adsblol") {
        // Automatic fallback to demo
        const mock = getSharedMockProvider();
        raw = await mock.getNearbyAircraft(observerLat, observerLon, radiusNm);
        providerName = mock.name;
        isDemo = true;
        providerStatus = code === "RATE_LIMITED" ? "rate-limited" : "demo";
        message =
          code === "RATE_LIMITED"
            ? "Live API rate-limited — showing demonstration data."
            : "Live data unavailable — showing demonstration data.";
      } else {
        throw err;
      }
    }

    if (isDemo) providerStatus = "demo";

    const detailsProvider = createFlightDetailsProvider();
    // Only fetch details for a limited set to avoid hammering APIs
    const detailsMap = new Map<
      string,
      Awaited<ReturnType<FlightDetailsProvider["getFlightDetails"]>>
    >();
    if (detailsProvider.name !== "none") {
      const top = raw.slice(0, 8);
      await Promise.all(
        top.map(async (a) => {
          try {
            detailsMap.set(a.icao24, await detailsProvider.getFlightDetails(a));
          } catch {
            detailsMap.set(a.icao24, null);
          }
        }),
      );
    }

    const assessed = enrichAll(raw, observerLat, observerLon, detailsMap);
    const arrivals = assessed.filter((a) => a.relevance === "arrival");

    // The default view is Heathrow arrivals overflying the observation point.
    // The "all nearby traffic" view adds everything else the provider reported
    // inside the radius — departures, general aviation, rotorcraft included —
    // nearest first, capped so the map stays responsive.
    const context = assessed
      .filter((a) => a.relevance === "context")
      .sort(
        (a, b) =>
          a.assessment.distanceFromObserverKm - b.assessment.distanceFromObserverKm,
      )
      .slice(0, DEFAULTS.maxContextAircraft);

    const visible = includeContextTraffic ? [...arrivals, ...context] : arrivals;

    const nowMs = Date.now();
    focusState = selectFocusAircraft({
      aircraft: arrivals,
      previous: focusState.focusSinceMs
        ? focusState
        : { focusIcao24: null, focusSinceMs: nowMs },
      nowMs,
    });

    const response: NearbyAircraftResponse = {
      aircraft: visible,
      focusIcao24: focusState.focusIcao24,
      providerStatus,
      providerName,
      fetchedAt: new Date().toISOString(),
      observer: { latitude: observerLat, longitude: observerLon },
      searchRadiusNm: radiusNm,
      message,
      isDemo,
      scannedCount: assessed.length,
      arrivalCount: arrivals.length,
    };

    cache = {
      response,
      expiresAt: Date.now() + DEFAULTS.serverCacheTtlMs,
      focusState,
      includeContextTraffic,
    };
    return response;
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

/** Exported for health checks without mutating focus state heavily */
export async function pingLiveProvider(): Promise<{
  ok: boolean;
  provider: string;
  error?: string;
}> {
  try {
    const config = getServerConfig();
    if (config.AIRCRAFT_PROVIDER === "mock") {
      return { ok: true, provider: "mock" };
    }
    const { provider } = createAircraftProvider(false);
    await provider.getNearbyAircraft(
      config.NEXT_PUBLIC_OBSERVER_LAT,
      config.NEXT_PUBLIC_OBSERVER_LON,
      5,
    );
    return { ok: true, provider: provider.name };
  } catch (err) {
    return {
      ok: false,
      provider: "adsb.lol",
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
