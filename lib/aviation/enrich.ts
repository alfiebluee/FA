import type {
  ApproachPhase,
  AssessedAircraft,
  NormalisedAircraft,
  NormalisedFlightDetails,
} from "@/lib/aviation/types";
import {
  assessHeathrowArrival,
  isDisplayableArrival,
} from "@/lib/aviation/arrival-assessment";
import { computeFocusScore } from "@/lib/aviation/focus-selection";
import { projectClosestApproach } from "@/lib/aviation/projected-motion";
import { formatFlightLabel, lookupAirlineFromCallsign } from "@/lib/aviation/callsigns";
import { sanitizeDisplayString } from "@/lib/aviation/normalise";

export function enrichAircraft(
  aircraft: NormalisedAircraft,
  observerLat: number,
  observerLon: number,
  flightDetails: NormalisedFlightDetails | null = null,
): AssessedAircraft {
  const assessment = assessHeathrowArrival(
    aircraft,
    observerLat,
    observerLon,
    flightDetails,
  );
  const projection = projectClosestApproach(aircraft, observerLat, observerLon);
  const inferredAirline = lookupAirlineFromCallsign(aircraft.callsign);
  const callsign = sanitizeDisplayString(aircraft.callsign);
  const phase = derivePhase(aircraft, assessment, projection);

  const assessed: AssessedAircraft = {
    ...aircraft,
    callsign,
    registration: sanitizeDisplayString(aircraft.registration),
    aircraftTypeCode: sanitizeDisplayString(aircraft.aircraftTypeCode),
    aircraftDescription: sanitizeDisplayString(aircraft.aircraftDescription),
    assessment,
    projection,
    focusScore: 0,
    flightDetails,
    inferredAirline,
    displayLabel: formatFlightLabel(callsign),
    statusLabel: deriveStatusLabel(phase, assessment),
    relevance: isDisplayableArrival(assessment) ? "arrival" : "context",
    phase,
  };
  assessed.focusScore = computeFocusScore(assessed);
  return assessed;
}

function derivePhase(
  aircraft: NormalisedAircraft,
  assessment: AssessedAircraft["assessment"],
  projection: AssessedAircraft["projection"],
): ApproachPhase {
  const distance = projection.distanceFromObserverKm;
  const eta = assessment.estimatedSecondsToClosestApproach;

  // Very low and close to Heathrow — on final, about to land
  if (
    aircraft.altitudeFeet != null &&
    aircraft.altitudeFeet < 3000 &&
    assessment.distanceToHeathrowKm < 20
  ) {
    return "landing";
  }
  if (distance <= 4) return "overhead";
  if (!projection.approachingObserver && assessment.distanceToHeathrowKm < 30) {
    return "departed-view";
  }
  if (eta != null && eta <= 180) return "approaching";
  return "inbound";
}

function deriveStatusLabel(
  phase: ApproachPhase,
  assessment: AssessedAircraft["assessment"],
): string {
  if (assessment.reasons.some((r) => r.includes("Stale"))) return "Signal lost";
  switch (phase) {
    case "landing":
      return "On final approach";
    case "overhead":
      return "Passing overhead";
    case "departed-view":
      return "Continuing to Heathrow";
    case "approaching":
      return "Approaching";
    default:
      return assessment.descending ? "Descending" : "Inbound";
  }
}

export function enrichAll(
  aircraft: NormalisedAircraft[],
  observerLat: number,
  observerLon: number,
  detailsMap: Map<string, NormalisedFlightDetails | null> = new Map(),
): AssessedAircraft[] {
  return aircraft
    .map((a) =>
      enrichAircraft(a, observerLat, observerLon, detailsMap.get(a.icao24) ?? null),
    )
    .sort((a, b) => b.focusScore - a.focusScore);
}
