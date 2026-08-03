import type { NormalisedAircraft } from "@/lib/aviation/types";
import { describeAircraftType } from "@/lib/aviation/aircraft-types";
import type { AdsbLolAircraft } from "@/lib/validation/aircraft";

function parseAltitude(value: number | string | null | undefined): number | null {
  if (value == null) return null;
  if (typeof value === "string") {
    if (value.toLowerCase() === "ground") return 0;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return Number.isFinite(value) ? value : null;
}

function cleanCallsign(flight: string | null | undefined): string | null {
  if (!flight) return null;
  const cleaned = flight.trim().toUpperCase();
  return cleaned.length > 0 ? cleaned : null;
}

export function normaliseAdsbLolAircraft(
  raw: AdsbLolAircraft,
  dataSource = "adsb.lol",
): NormalisedAircraft | null {
  const lat = raw.lat;
  const lon = raw.lon;
  if (lat == null || lon == null || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }

  const typeCode = raw.t?.trim() || null;
  const verticalRate = raw.baro_rate ?? raw.geom_rate ?? null;

  return {
    icao24: raw.hex.toLowerCase(),
    callsign: cleanCallsign(raw.flight),
    registration: raw.r?.trim() || null,
    aircraftTypeCode: typeCode,
    aircraftDescription: describeAircraftType(typeCode),
    latitude: lat,
    longitude: lon,
    altitudeFeet: parseAltitude(raw.alt_baro),
    geometricAltitudeFeet: raw.alt_geom ?? null,
    groundSpeedKnots: raw.gs ?? null,
    trackDegrees: raw.track ?? raw.true_heading ?? null,
    verticalRateFeetPerMinute: verticalRate,
    squawk: raw.squawk ?? null,
    category: raw.category ?? null,
    seenSecondsAgo: raw.seen_pos ?? raw.seen ?? null,
    dataSource,
  };
}

export function sanitizeDisplayString(value: string | null | undefined): string | null {
  if (value == null) return null;
  // Strip control characters; avoid HTML injection if ever rendered unsafely
  return value.replace(/[\u0000-\u001F\u007F<>]/g, "").trim() || null;
}
