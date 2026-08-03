import {
  bearingDegrees,
  haversineDistanceKm,
  destinationPoint,
} from "@/lib/geo/distance";
import { circularHeadingDifference } from "@/lib/geo/angles";
import type { NormalisedAircraft, ProjectedApproach } from "@/lib/aviation/types";

const KNOTS_TO_KM_PER_S = 1.852 / 3600;

/**
 * Project aircraft ground track to estimate closest approach to the observer.
 * Uses constant-speed / constant-track approximation from current state.
 */
export function projectClosestApproach(
  aircraft: NormalisedAircraft,
  observerLat: number,
  observerLon: number,
): ProjectedApproach {
  const distanceFromObserverKm = haversineDistanceKm(
    observerLat,
    observerLon,
    aircraft.latitude,
    aircraft.longitude,
  );
  const bearingFromObserver = bearingDegrees(
    observerLat,
    observerLon,
    aircraft.latitude,
    aircraft.longitude,
  );

  const speed = aircraft.groundSpeedKnots;
  const track = aircraft.trackDegrees;

  if (speed == null || track == null || speed < 5) {
    return {
      estimatedSecondsToClosestApproach: null,
      estimatedMinimumDistanceKm: distanceFromObserverKm,
      approachingObserver: false,
      bearingFromObserver,
      distanceFromObserverKm,
    };
  }

  // Sample projection over ~15 minutes at 5s steps to find min distance.
  const speedKmPerS = speed * KNOTS_TO_KM_PER_S;
  let minDist = distanceFromObserverKm;
  let minT = 0;
  const maxT = 900;
  const step = 5;

  for (let t = step; t <= maxT; t += step) {
    const distTravelled = speedKmPerS * t;
    const pos = destinationPoint(
      aircraft.latitude,
      aircraft.longitude,
      track,
      distTravelled,
    );
    const d = haversineDistanceKm(observerLat, observerLon, pos.latitude, pos.longitude);
    if (d < minDist) {
      minDist = d;
      minT = t;
    } else if (t > minT + 30 && d > minDist + 0.5) {
      // Past closest point and opening — stop early
      break;
    }
  }

  const approachingObserver = minT > 0 && minDist < distanceFromObserverKm - 0.05;

  // Also check if currently closing: bearing from aircraft to observer vs track
  const bearingToObserver = bearingDegrees(
    aircraft.latitude,
    aircraft.longitude,
    observerLat,
    observerLon,
  );
  const headingToObserverDiff = circularHeadingDifference(track, bearingToObserver);
  const currentlyClosing = headingToObserverDiff < 90;

  return {
    estimatedSecondsToClosestApproach: approachingObserver
      ? minT
      : currentlyClosing
        ? minT || null
        : null,
    estimatedMinimumDistanceKm: minDist,
    approachingObserver: approachingObserver || currentlyClosing,
    bearingFromObserver,
    distanceFromObserverKm,
  };
}

/** Project a point ahead of the aircraft along its track (km). */
export function projectTrackPoint(
  aircraft: NormalisedAircraft,
  distanceKm: number,
): { latitude: number; longitude: number } | null {
  if (aircraft.trackDegrees == null) return null;
  return destinationPoint(
    aircraft.latitude,
    aircraft.longitude,
    aircraft.trackDegrees,
    distanceKm,
  );
}
