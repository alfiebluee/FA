import { planViewBody } from "@/components/aircraft/AircraftSilhouette";
import { resolveAirframeProfile } from "@/lib/aviation/airframe-profiles";
import type { AircraftCategoryVisual } from "@/lib/aviation/types";

/**
 * Plan-view aircraft markup for MapLibre DOM markers. Shares its geometry with
 * AircraftSilhouette but is emitted as a string, because MapLibre markers are
 * plain DOM elements rather than React trees.
 */
export function planViewMarkerSvg(options: {
  typeCode: string | null;
  category: AircraftCategoryVisual;
  size: number;
}): string {
  const { typeCode, category, size } = options;

  if (category === "helicopter") {
    return `<svg width="${size}" height="${size}" viewBox="0 0 120 120" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <circle cx="56" cy="52" r="42" fill="none" stroke="currentColor" stroke-width="2" opacity="0.3"/>
      <ellipse cx="56" cy="52" rx="12" ry="20"/>
      <path d="M56 70 L60 70 L62 106 L54 106 Z"/>
      <path d="M46 102 L70 102 L70 107 L46 107 Z" opacity="0.8"/>
    </svg>`;
  }

  const profile = resolveAirframeProfile(typeCode, category);
  return `<svg width="${size}" height="${size}" viewBox="0 0 120 120" fill="currentColor" xmlns="http://www.w3.org/2000/svg">${planViewBody(profile)}</svg>`;
}
