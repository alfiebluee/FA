import type {
  ArrivalAssessment,
  ArrivalClassification,
  NormalisedAircraft,
  NormalisedFlightDetails,
} from "@/lib/aviation/types";
import { isCommercialCallsign } from "@/lib/aviation/callsigns";
import { circularHeadingDifference } from "@/lib/geo/angles";
import { bearingDegrees, haversineDistanceKm } from "@/lib/geo/distance";
import { projectClosestApproach } from "@/lib/aviation/projected-motion";
import { ARRIVAL_FILTER, HEATHROW, SCORING } from "@/lib/config/scoring";
import { destinationPoint } from "@/lib/geo/distance";
import { assessEligibility } from "@/lib/aviation/eligibility";
import { inferDestinationAirport } from "@/lib/aviation/destination-inference";

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

const KNOTS_TO_KM_PER_SECOND = 1.852 / 3600;

/** Seconds to cover a ground distance at the reported ground speed. */
function estimateSecondsToTravel(
  distanceKm: number,
  groundSpeedKnots: number | null,
): number | null {
  if (groundSpeedKnots == null || groundSpeedKnots < 40) return null;
  return distanceKm / (groundSpeedKnots * KNOTS_TO_KM_PER_SECOND);
}

function classify(score: number): ArrivalClassification {
  if (score >= SCORING.classification.highConfidence) return "high-confidence-arrival";
  if (score >= SCORING.classification.probable) return "probable-arrival";
  if (score >= SCORING.classification.possible) return "possible-arrival";
  return "unlikely-arrival";
}

function destinationIsHeathrow(details: NormalisedFlightDetails | null): boolean {
  if (!details) return false;
  const dest =
    details.destinationAirportIcao?.toUpperCase() ??
    details.destinationAirportIata?.toUpperCase() ??
    "";
  return dest === HEATHROW.icao || dest === HEATHROW.iata;
}

/**
 * Heuristic Heathrow-arrival assessment.
 * Estimates likelihood from kinematics, altitude, callsign and optional
 * schedule data. This is NOT definitive air traffic information.
 */
export function assessHeathrowArrival(
  aircraft: NormalisedAircraft,
  observerLat: number,
  observerLon: number,
  flightDetails: NormalisedFlightDetails | null = null,
): ArrivalAssessment {
  const reasons: string[] = [];
  let score = 0;

  const distanceFromObserverKm = haversineDistanceKm(
    observerLat,
    observerLon,
    aircraft.latitude,
    aircraft.longitude,
  );
  const distanceToHeathrowKm = haversineDistanceKm(
    aircraft.latitude,
    aircraft.longitude,
    HEATHROW.latitude,
    HEATHROW.longitude,
  );
  const bearingFromAircraftToHeathrow = bearingDegrees(
    aircraft.latitude,
    aircraft.longitude,
    HEATHROW.latitude,
    HEATHROW.longitude,
  );

  const headingDifferenceToHeathrow =
    aircraft.trackDegrees != null
      ? circularHeadingDifference(aircraft.trackDegrees, bearingFromAircraftToHeathrow)
      : null;

  const projection = projectClosestApproach(aircraft, observerLat, observerLon);
  const approachingObserver = projection.approachingObserver;
  const descending =
    aircraft.verticalRateFeetPerMinute != null &&
    aircraft.verticalRateFeetPerMinute <= SCORING.descendingMild.maxRate;

  // --- Destination evidence ---
  if (destinationIsHeathrow(flightDetails)) {
    score += SCORING.confirmedDestination;
    reasons.push("Confirmed destination Heathrow");
  }

  // --- Direction towards Heathrow ---
  if (headingDifferenceToHeathrow != null) {
    let matched = false;
    for (const band of SCORING.headingDiff) {
      if (headingDifferenceToHeathrow <= band.maxDeg) {
        score += band.points;
        reasons.push(
          `Track within ${band.maxDeg}° of Heathrow bearing (${headingDifferenceToHeathrow.toFixed(0)}°)`,
        );
        matched = true;
        break;
      }
    }
    if (!matched) {
      score += SCORING.headingMisalignedPenalty;
      reasons.push(
        `Track misaligned with Heathrow (${headingDifferenceToHeathrow.toFixed(0)}° difference)`,
      );
    }
  }

  // --- Moving toward / away from Heathrow ---
  if (aircraft.trackDegrees != null && aircraft.groundSpeedKnots != null) {
    const ahead = destinationPoint(
      aircraft.latitude,
      aircraft.longitude,
      aircraft.trackDegrees,
      5, // 5 km ahead
    );
    const futureDist = haversineDistanceKm(
      ahead.latitude,
      ahead.longitude,
      HEATHROW.latitude,
      HEATHROW.longitude,
    );
    if (futureDist < distanceToHeathrowKm - SCORING.movingAwayThresholdKm) {
      score += 6;
      reasons.push("Closing distance to Heathrow");
    } else if (futureDist > distanceToHeathrowKm + SCORING.movingAwayThresholdKm) {
      score += SCORING.movingAwayFromHeathrowPenalty;
      reasons.push("Moving away from Heathrow");
    }
  }

  // --- Vertical behaviour ---
  const vr = aircraft.verticalRateFeetPerMinute;
  if (vr != null) {
    if (vr <= SCORING.descendingSteep.maxRate) {
      score += SCORING.descendingSteep.points;
      reasons.push("Steep descent");
    } else if (vr <= SCORING.descendingMild.maxRate) {
      score += SCORING.descendingMild.points;
      reasons.push("Descending");
    } else if (vr >= SCORING.climbingThreshold) {
      score += SCORING.climbingPenalty;
      reasons.push("Climbing");
    } else if (
      Math.abs(vr) < 150 &&
      aircraft.altitudeFeet != null &&
      aircraft.altitudeFeet < SCORING.levelFlightLow.maxAltitude
    ) {
      score += SCORING.levelFlightLow.points;
      reasons.push("Level flight at low altitude");
    }
  }

  // --- Altitude ---
  const alt = aircraft.altitudeFeet;
  if (alt != null) {
    if (alt >= SCORING.altitudeBandLow.min && alt <= SCORING.altitudeBandLow.max) {
      score += SCORING.altitudeBandLow.points;
      reasons.push("Altitude in local arrival band");
    } else if (alt > SCORING.altitudeBandMid.min && alt <= SCORING.altitudeBandMid.max) {
      score += SCORING.altitudeBandMid.points;
      reasons.push("Altitude in upper approach band");
    } else if (alt > SCORING.altitudeHighPenalty.above) {
      score += SCORING.altitudeHighPenalty.points;
      reasons.push("Cruise altitude — unlikely local arrival");
    }
    if (
      alt < SCORING.altitudeTooLowFar.below &&
      distanceToHeathrowKm > SCORING.altitudeTooLowFar.minDistanceKm
    ) {
      score += SCORING.altitudeTooLowFar.points;
      reasons.push("Very low altitude far from Heathrow");
    }
  }

  // --- Distance ---
  if (distanceToHeathrowKm <= SCORING.withinHeathrowApproachKm) {
    score += SCORING.withinHeathrowApproachBonus;
    reasons.push("Within Heathrow approach area");
  }
  if (distanceFromObserverKm <= SCORING.nearObserverKm && approachingObserver) {
    score += SCORING.nearObserverBonus;
    reasons.push("Near observer and approaching");
  }

  // --- Callsign ---
  if (isCommercialCallsign(aircraft.callsign)) {
    score += SCORING.commercialCallsignBonus;
    reasons.push("Recognisable commercial callsign");
  } else if (!aircraft.callsign) {
    score += SCORING.missingCallsignPenalty;
    reasons.push("Missing callsign");
  }

  // --- Freshness ---
  const seen = aircraft.seenSecondsAgo;
  if (seen != null) {
    if (seen <= SCORING.freshBonus.withinSeconds) {
      score += SCORING.freshBonus.points;
    } else if (seen > SCORING.stalePenalty.afterSeconds) {
      score += SCORING.stalePenalty.points;
      reasons.push("Stale position data");
    }
  }

  // --- Competing London airports ---
  // Gatwick, Luton, Stansted and City arrivals also cross north London.
  // If another field fits the trajectory clearly better, this is not ours.
  const inference = inferDestinationAirport(aircraft);
  let competingAirportIcao: string | null = null;
  if (
    !inference.heathrowIsBest &&
    inference.competitorLead >= ARRIVAL_FILTER.competitorLeadRejection
  ) {
    competingAirportIcao = inference.best.airport.icao;
    score += ARRIVAL_FILTER.competingAirportPenalty;
    reasons.push(`Trajectory better matches ${inference.best.airport.name}`);
  } else if (inference.heathrowIsBest) {
    reasons.push("Heathrow is the best trajectory match");
  }

  // --- Overhead the observation point ---
  // The display only cares about aircraft that will actually be visible from
  // the observation point, not every Heathrow arrival in the region.
  //
  // A straight-line projection alone is not enough: an aircraft already on
  // final west of Heathrow tracks east, and extrapolating that line forever
  // eventually brings it near north London. It lands long before then, so the
  // pass only counts if it happens before the aircraft reaches Heathrow.
  const overheadDistanceKm = projection.estimatedMinimumDistanceKm;
  const secondsToHeathrow = estimateSecondsToTravel(
    distanceToHeathrowKm,
    aircraft.groundSpeedKnots,
  );
  const etaToClosestApproach = projection.estimatedSecondsToClosestApproach;
  const reachesObserverFirst =
    etaToClosestApproach == null ||
    secondsToHeathrow == null ||
    etaToClosestApproach <= secondsToHeathrow + ARRIVAL_FILTER.overheadEtaSlackSeconds;

  const passesOverhead =
    overheadDistanceKm != null &&
    overheadDistanceKm <= ARRIVAL_FILTER.maxOverheadDistanceKm &&
    reachesObserverFirst;

  if (!reachesObserverFirst) {
    reasons.push("Reaches Heathrow before the observation point");
  }

  if (passesOverhead) {
    score += ARRIVAL_FILTER.overheadBonus;
    reasons.push("Projected to pass over the observation point");
  }

  if (distanceToHeathrowKm > ARRIVAL_FILTER.maxDistanceToHeathrowKm) {
    score -= 20;
    reasons.push("Outside the local approach area");
  }

  const eligibility = assessEligibility(aircraft);
  if (!eligibility.eligible) {
    score = Math.min(score, 10);
    reasons.push(eligibility.reason ?? "Not airline traffic");
  }

  const finalScore = clampScore(score);

  return {
    score: finalScore,
    classification: classify(finalScore),
    reasons,
    distanceFromObserverKm,
    distanceToHeathrowKm,
    bearingFromAircraftToHeathrow,
    headingDifferenceToHeathrow,
    approachingObserver,
    descending,
    estimatedSecondsToClosestApproach: projection.estimatedSecondsToClosestApproach,
    overheadDistanceKm,
    passesOverhead,
    competingAirportIcao,
    eligible: eligibility.eligible,
    ineligibleReason: eligibility.reason,
  };
}

/**
 * Final gate for the display: airline traffic, plausibly Heathrow-bound,
 * and passing over the observation point.
 */
export function isDisplayableArrival(assessment: ArrivalAssessment): boolean {
  if (!assessment.eligible) return false;
  if (assessment.competingAirportIcao) return false;
  if (!assessment.passesOverhead) return false;
  if (assessment.score < ARRIVAL_FILTER.minArrivalScore) return false;
  return true;
}
