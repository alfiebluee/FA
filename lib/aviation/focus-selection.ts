import type { AssessedAircraft } from "@/lib/aviation/types";
import { FOCUS_SELECTION, SCORING } from "@/lib/config/scoring";
import { kmToNm } from "@/lib/geo/distance";

export type FocusSelectionState = {
  focusIcao24: string | null;
  focusSinceMs: number;
};

export type FocusSelectionInput = {
  aircraft: AssessedAircraft[];
  previous: FocusSelectionState;
  nowMs: number;
  minArrivalScore?: number;
  maxFocusDistanceNm?: number;
  hysteresisMargin?: number;
  minFocusDwellMs?: number;
};

/**
 * Compute a visual-relevance focus score (0–100) from weighted factors.
 * Higher = more meaningful to an observer at the observation point.
 */
export function computeFocusScore(aircraft: AssessedAircraft): number {
  const w = FOCUS_SELECTION.weights;
  const arrival = aircraft.assessment.score / 100;

  const minDist =
    aircraft.projection.estimatedMinimumDistanceKm ??
    aircraft.projection.distanceFromObserverKm;
  // Closer predicted pass → higher (0 at 25km+, 1 at 0km)
  const predictedProximity = Math.max(0, 1 - minDist / 25);

  const currentDistance = Math.max(
    0,
    1 - aircraft.projection.distanceFromObserverKm / 40,
  );

  const approaching = aircraft.projection.approachingObserver ? 1 : 0.15;

  const alt = aircraft.altitudeFeet;
  let altitudeFactor = 0.5;
  if (alt != null) {
    if (alt >= 1500 && alt <= 10000) altitudeFactor = 1;
    else if (alt > 10000 && alt <= 15000) altitudeFactor = 0.6;
    else if (alt > 15000) altitudeFactor = 0.2;
    else altitudeFactor = 0.3;
  }

  const seen = aircraft.seenSecondsAgo ?? 0;
  const freshness = Math.max(0, 1 - seen / 45);

  const score =
    (w.arrivalConfidence * arrival +
      w.predictedProximity * predictedProximity +
      w.currentDistance * currentDistance +
      w.approaching * approaching +
      w.altitude * altitudeFactor +
      w.freshness * freshness) *
    100;

  return Math.round(Math.max(0, Math.min(100, score)));
}

function isStaleForFocus(aircraft: AssessedAircraft): boolean {
  return (
    aircraft.seenSecondsAgo != null &&
    aircraft.seenSecondsAgo > SCORING.excludeFromFocusAfterSeconds
  );
}

function isClearlyIrrelevant(aircraft: AssessedAircraft): boolean {
  const climbing =
    aircraft.verticalRateFeetPerMinute != null &&
    aircraft.verticalRateFeetPerMinute > 500;
  const movingAway = aircraft.assessment.reasons.some((r) =>
    r.includes("Moving away from Heathrow"),
  );
  return (
    aircraft.assessment.classification === "unlikely-arrival" && (climbing || movingAway)
  );
}

/**
 * Select focus aircraft with hysteresis to avoid flicker.
 * Keep current focus unless another candidate exceeds score by margin,
 * or dwell time elapsed and a better candidate exists.
 */
export function selectFocusAircraft(input: FocusSelectionInput): FocusSelectionState {
  const minScore = input.minArrivalScore ?? FOCUS_SELECTION.minArrivalScore;
  const maxNm = input.maxFocusDistanceNm ?? FOCUS_SELECTION.maxFocusDistanceNm;
  const margin = input.hysteresisMargin ?? FOCUS_SELECTION.hysteresisMargin;
  const dwell = input.minFocusDwellMs ?? FOCUS_SELECTION.minFocusDwellMs;

  const candidates = input.aircraft
    .filter((a) => !isStaleForFocus(a))
    .filter((a) => a.assessment.score >= minScore)
    .filter((a) => !isClearlyIrrelevant(a))
    .map((a) => ({
      ...a,
      focusScore: a.focusScore || computeFocusScore(a),
    }));

  const withinRange = candidates.filter(
    (a) => kmToNm(a.projection.distanceFromObserverKm) <= maxNm,
  );
  const pool = withinRange.length > 0 ? withinRange : candidates;

  if (pool.length === 0) {
    return { focusIcao24: null, focusSinceMs: input.nowMs };
  }

  pool.sort(
    (a, b) =>
      b.focusScore - a.focusScore ||
      a.projection.distanceFromObserverKm - b.projection.distanceFromObserverKm,
  );
  const best = pool[0];

  const prevId = input.previous.focusIcao24;
  const prevAircraft = prevId
    ? (pool.find((a) => a.icao24 === prevId) ??
      input.aircraft.find((a) => a.icao24 === prevId))
    : null;

  // Previous focus gone or stale — switch immediately
  if (!prevId || !prevAircraft || isStaleForFocus(prevAircraft as AssessedAircraft)) {
    return { focusIcao24: best.icao24, focusSinceMs: input.nowMs };
  }

  const prevFocusScore =
    "focusScore" in prevAircraft
      ? (prevAircraft as AssessedAircraft).focusScore ||
        computeFocusScore(prevAircraft as AssessedAircraft)
      : computeFocusScore(prevAircraft as AssessedAircraft);

  const dwellElapsed = input.nowMs - input.previous.focusSinceMs >= dwell;
  const significantlyBetter = best.focusScore >= prevFocusScore + margin;

  if (best.icao24 === prevId) {
    return input.previous;
  }

  if (significantlyBetter && (dwellElapsed || prevFocusScore < minScore)) {
    return { focusIcao24: best.icao24, focusSinceMs: input.nowMs };
  }

  // Keep previous if still in pool
  if (pool.some((a) => a.icao24 === prevId)) {
    return input.previous;
  }

  return { focusIcao24: best.icao24, focusSinceMs: input.nowMs };
}
