"use client";

import { useEffect, useRef, useState } from "react";
import { destinationPoint } from "@/lib/geo/distance";
import type { AssessedAircraft } from "@/lib/aviation/types";

export type ReckonedPosition = {
  latitude: number;
  longitude: number;
  track: number;
};

const KNOTS_TO_KM_PER_S = 1.852 / 3600;
/** ~20fps keeps motion fluid while staying light on low-power displays. */
const FRAME_INTERVAL_MS = 50;
/** Stop extrapolating if the feed goes quiet, so aircraft do not drift away. */
const MAX_EXTRAPOLATION_S = 25;

/**
 * Between eight-second polls, advance each aircraft along its own track at its
 * reported ground speed. Markers glide continuously instead of teleporting,
 * and the display keeps moving even while a request is in flight.
 */
export function useDeadReckoning(
  aircraft: AssessedAircraft[],
  fetchedAt: string | null,
  enabled = true,
): Record<string, ReckonedPosition> {
  const [positions, setPositions] = useState<Record<string, ReckonedPosition>>({});
  const frameRef = useRef<number | null>(null);
  const lastTickRef = useRef(0);
  const aircraftRef = useRef(aircraft);
  const baseTimeRef = useRef<number | null>(null);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    aircraftRef.current = aircraft;
    enabledRef.current = enabled;
    baseTimeRef.current = fetchedAt ? new Date(fetchedAt).getTime() : Date.now();
  }, [aircraft, fetchedAt, enabled]);

  useEffect(() => {
    const tick = (now: number) => {
      frameRef.current = requestAnimationFrame(tick);
      if (now - lastTickRef.current < FRAME_INTERVAL_MS) return;
      lastTickRef.current = now;

      const base = baseTimeRef.current;
      const elapsedS =
        enabledRef.current && base != null
          ? Math.min(MAX_EXTRAPOLATION_S, Math.max(0, (Date.now() - base) / 1000))
          : 0;

      const next: Record<string, ReckonedPosition> = {};
      for (const a of aircraftRef.current) {
        const track = a.trackDegrees;
        const speed = a.groundSpeedKnots;
        if (elapsedS === 0 || track == null || speed == null || speed < 5) {
          next[a.icao24] = {
            latitude: a.latitude,
            longitude: a.longitude,
            track: track ?? 0,
          };
          continue;
        }
        const travelled = speed * KNOTS_TO_KM_PER_S * elapsedS;
        const projected = destinationPoint(a.latitude, a.longitude, track, travelled);
        next[a.icao24] = {
          latitude: projected.latitude,
          longitude: projected.longitude,
          track,
        };
      }
      setPositions(next);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return positions;
}
