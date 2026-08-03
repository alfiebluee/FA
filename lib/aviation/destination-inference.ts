import { LONDON_AREA_AIRPORTS, type AirportRef } from "@/data/airports";
import { circularHeadingDifference } from "@/lib/geo/angles";
import {
  bearingDegrees,
  destinationPoint,
  haversineDistanceKm,
} from "@/lib/geo/distance";
import type { NormalisedAircraft } from "@/lib/aviation/types";

export type AirportFit = {
  airport: AirportRef;
  distanceKm: number;
  headingDifference: number | null;
  closing: boolean;
  /** Higher is a better trajectory match for this airport */
  fit: number;
};

/**
 * A 3° glideslope descends roughly 172 ft per horizontal kilometre.
 * Arrivals are usually above this close in, and step down from the holds
 * further out, so this is used only as a loose plausibility envelope.
 */
const GLIDE_FEET_PER_KM = 172;

function plausibleAltitudeForDistance(distanceKm: number): {
  min: number;
  max: number;
} {
  const nominal = distanceKm * GLIDE_FEET_PER_KM;
  return {
    min: Math.max(0, nominal * 0.25),
    max: Math.max(4000, nominal * 2.6 + 3000),
  };
}

/**
 * Score how well an aircraft's current state matches an approach to a
 * given airport. Heuristic only — used to reject traffic that is clearly
 * inbound to a different London airport.
 */
export function computeAirportFit(
  aircraft: NormalisedAircraft,
  airport: AirportRef,
): AirportFit {
  const distanceKm = haversineDistanceKm(
    aircraft.latitude,
    aircraft.longitude,
    airport.latitude,
    airport.longitude,
  );
  const bearingToAirport = bearingDegrees(
    aircraft.latitude,
    aircraft.longitude,
    airport.latitude,
    airport.longitude,
  );
  const headingDifference =
    aircraft.trackDegrees != null
      ? circularHeadingDifference(aircraft.trackDegrees, bearingToAirport)
      : null;

  let closing = false;
  if (aircraft.trackDegrees != null) {
    const ahead = destinationPoint(
      aircraft.latitude,
      aircraft.longitude,
      aircraft.trackDegrees,
      6,
    );
    const futureDistance = haversineDistanceKm(
      ahead.latitude,
      ahead.longitude,
      airport.latitude,
      airport.longitude,
    );
    closing = futureDistance < distanceKm;
  }

  // Alignment dominates; proximity and altitude plausibility refine it.
  let fit = 0;
  if (headingDifference != null) {
    fit += Math.max(0, 90 - headingDifference) * 0.8;
  }
  if (closing) fit += 25;
  fit += Math.max(0, 60 - distanceKm) * 0.35;

  if (aircraft.altitudeFeet != null) {
    const band = plausibleAltitudeForDistance(distanceKm);
    if (aircraft.altitudeFeet >= band.min && aircraft.altitudeFeet <= band.max) {
      fit += 15;
    } else {
      fit -= 10;
    }
  }

  // Biggin Hill, Northolt and Oxford take a fraction of the airline traffic,
  // so they should rarely win against Heathrow on geometry alone.
  if (airport.tier === "minor") fit -= 22;

  return { airport, distanceKm, headingDifference, closing, fit };
}

export type DestinationInference = {
  best: AirportFit;
  heathrow: AirportFit;
  /** True when Heathrow is the strongest trajectory match */
  heathrowIsBest: boolean;
  /** How far ahead the best non-Heathrow airport is (0 when Heathrow wins) */
  competitorLead: number;
  competitor: AirportFit | null;
};

/**
 * Determine which London-area airport an aircraft is most plausibly heading to.
 * This is trajectory inference, not confirmed routing.
 */
export function inferDestinationAirport(
  aircraft: NormalisedAircraft,
): DestinationInference {
  const fits = LONDON_AREA_AIRPORTS.map((airport) =>
    computeAirportFit(aircraft, airport),
  ).sort((a, b) => b.fit - a.fit);

  const best = fits[0];
  const heathrow = fits.find((f) => f.airport.icao === "EGLL") ?? best;
  const heathrowIsBest = best.airport.icao === "EGLL";
  const competitor = heathrowIsBest ? (fits[1] ?? null) : best;
  const competitorLead = heathrowIsBest ? 0 : best.fit - heathrow.fit;

  return { best, heathrow, heathrowIsBest, competitorLead, competitor };
}
