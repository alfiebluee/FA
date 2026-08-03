import { NextResponse } from "next/server";
import { getServerConfig } from "@/lib/config/server";
import { PUBLIC_META } from "@/lib/config/public";
import { FOCUS_SELECTION, SCORING } from "@/lib/config/scoring";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = getServerConfig();
    return NextResponse.json({
      observationPointLabel: PUBLIC_META.observationPointLabel,
      targetAirport: {
        icao: config.heathrow.icao,
        iata: config.heathrow.iata,
        name: config.heathrow.name,
        // Approximate reference only — not a residential address
        latitude: config.heathrow.latitude,
        longitude: config.heathrow.longitude,
      },
      // Observer coords intentionally omitted from default public config payload
      // to avoid casual exposure; settings drawer reveals after explicit confirm.
      hasObserverConfigured: true,
      searchRadiusNm: config.NEXT_PUBLIC_SEARCH_RADIUS_NM,
      refreshIntervalMs: config.NEXT_PUBLIC_REFRESH_INTERVAL_MS,
      mapStyleUrl: config.NEXT_PUBLIC_MAP_STYLE_URL,
      aircraftProvider: config.AIRCRAFT_PROVIDER,
      flightDetailsProvider: config.FLIGHT_DETAILS_PROVIDER,
      focusSelection: {
        maxFocusDistanceNm: FOCUS_SELECTION.maxFocusDistanceNm,
        hysteresisMargin: FOCUS_SELECTION.hysteresisMargin,
        minFocusDwellMs: FOCUS_SELECTION.minFocusDwellMs,
        minArrivalScore: FOCUS_SELECTION.minArrivalScore,
      },
      scoringSummary: {
        highConfidence: SCORING.classification.highConfidence,
        probable: SCORING.classification.probable,
        possible: SCORING.classification.possible,
      },
      disclaimer: PUBLIC_META.disclaimer,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Config error" },
      { status: 500 },
    );
  }
}
