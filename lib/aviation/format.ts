import { kmToNm } from "@/lib/geo/distance";
import type { ClockMode, UnitsMode } from "@/lib/aviation/types";

export function formatLondonTime(date: Date, clock: ClockMode = "24h"): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: clock === "12h",
  }).format(date);
}

export function formatLondonDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "Arrival time unavailable";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

export function formatAltitude(feet: number | null, units: UnitsMode): string {
  if (feet == null) return "—";
  if (units === "metric") {
    return `${Math.round(feet * 0.3048).toLocaleString()} m`;
  }
  return `${Math.round(feet).toLocaleString()} ft`;
}

export function formatSpeed(knots: number | null, units: UnitsMode): string {
  if (knots == null) return "—";
  if (units === "metric") {
    return `${Math.round(knots * 1.852).toLocaleString()} km/h`;
  }
  return `${Math.round(knots).toLocaleString()} kt`;
}

export function formatVerticalRate(fpm: number | null, units: UnitsMode): string {
  if (fpm == null) return "—";
  const sign = fpm > 0 ? "+" : "";
  if (units === "metric") {
    const mps = fpm * 0.00508;
    return `${sign}${mps.toFixed(1)} m/s`;
  }
  return `${sign}${Math.round(fpm)} fpm`;
}

export function formatDistanceKm(
  km: number | null,
  units: UnitsMode,
  includeNm = true,
): string {
  if (km == null) return "—";
  if (units === "metric") {
    return `${km.toFixed(1)} km`;
  }
  if (includeNm) {
    return `${km.toFixed(1)} km · ${kmToNm(km).toFixed(1)} nm`;
  }
  return `${km.toFixed(1)} km`;
}

export function formatBearing(deg: number | null): string {
  if (deg == null) return "—";
  return `${Math.round(deg).toString().padStart(3, "0")}°`;
}

export function formatEtaSeconds(seconds: number | null): string {
  if (seconds == null) return "—";
  if (seconds < 60) return `~${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `~${m}m ${s.toString().padStart(2, "0")}s`;
}

export function formatRelativeAge(iso: string | null, now = Date.now()): string {
  if (!iso) return "—";
  const age = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (age < 2) return "just now";
  if (age < 60) return `${age}s ago`;
  return `${Math.floor(age / 60)}m ago`;
}
