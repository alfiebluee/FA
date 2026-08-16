import { DEFAULTS, HEATHROW, FOCUS_SELECTION } from "@/lib/config/scoring";
import type { DisplaySettings } from "@/lib/aviation/types";

export function getPublicDefaults(): DisplaySettings {
  return {
    observerLat: Number(process.env.NEXT_PUBLIC_OBSERVER_LAT ?? 51.59568),
    observerLon: Number(process.env.NEXT_PUBLIC_OBSERVER_LON ?? -0.12603),
    searchRadiusNm: Number(
      process.env.NEXT_PUBLIC_SEARCH_RADIUS_NM ?? DEFAULTS.searchRadiusNm,
    ),
    refreshIntervalMs: Number(
      process.env.NEXT_PUBLIC_REFRESH_INTERVAL_MS ?? DEFAULTS.refreshIntervalMs,
    ),
    minArrivalScore: FOCUS_SELECTION.minArrivalScore,
    trafficView: "arrivals",
    showProjectedPaths: true,
    showRadarAnimation: true,
    mapFollowMode: true,
    units: "aviation",
    clock: "24h",
    forceDemo: false,
    desktopNotifications: false,
  };
}

export const PUBLIC_META = {
  observationPointLabel: "ALEXANDRA PARK",
  targetAirportIcao: process.env.NEXT_PUBLIC_TARGET_AIRPORT ?? "EGLL",
  targetAirportName: HEATHROW.name,
  mapStyleUrl: process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? DEFAULTS.mapStyleUrl,
  heathrow: HEATHROW,
  disclaimer:
    "Live aviation data is approximate and must not be used for navigation or operational decision-making.",
} as const;

export const SETTINGS_STORAGE_KEY = "final-approach-settings-v2";
