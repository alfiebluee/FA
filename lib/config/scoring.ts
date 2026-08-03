/**
 * Heathrow arrival scoring configuration.
 *
 * These weights are heuristic defaults for a private home display.
 * They estimate likely Heathrow arrivals from ADS-B kinematics and
 * callsign cues — they are NOT definitive ATC classification.
 */

export const HEATHROW = {
  icao: "EGLL",
  iata: "LHR",
  name: "London Heathrow",
  latitude: 51.47,
  longitude: -0.4543,
} as const;

export const SCORING = {
  /** Confirmed destination EGLL/LHR from flight-details provider */
  confirmedDestination: 50,

  /** Heading alignment with bearing toward Heathrow (circular difference) */
  headingDiff: [
    { maxDeg: 10, points: 22 },
    { maxDeg: 20, points: 18 },
    { maxDeg: 35, points: 12 },
    { maxDeg: 55, points: 5 },
  ] as const,
  headingMisalignedPenalty: -15,
  /** Beyond this heading difference, aircraft is unlikely inbound */
  headingMisalignedThreshold: 55,

  /** Vertical behaviour */
  descendingMild: { maxRate: -200, points: 10 },
  descendingSteep: { maxRate: -700, points: 14 },
  levelFlightLow: { maxAltitude: 6000, points: 4 },
  climbingPenalty: -12,
  climbingThreshold: 200,

  /** Altitude bands (feet) for plausible local arrivals */
  altitudeBandLow: { min: 1500, max: 6500, points: 12 },
  altitudeBandMid: { min: 6500, max: 12000, points: 6 },
  altitudeHighPenalty: { above: 15000, points: -8 },
  altitudeTooLowFar: { below: 700, minDistanceKm: 15, points: -10 },

  /** Distance */
  withinHeathrowApproachKm: 45,
  withinHeathrowApproachBonus: 8,
  nearObserverKm: 12,
  nearObserverBonus: 10,
  movingAwayFromHeathrowPenalty: -20,
  /** Rate of change of distance to Heathrow (km/s approx via projection) */
  movingAwayThresholdKm: 0.5,

  /** Callsign */
  commercialCallsignBonus: 4,
  missingCallsignPenalty: -3,

  /** Data freshness (seenSecondsAgo) */
  freshBonus: { withinSeconds: 10, points: 4 },
  stalePenalty: { afterSeconds: 30, points: -6 },
  /** Exclude from focus selection entirely */
  excludeFromFocusAfterSeconds: 60,

  /** Classification thresholds */
  classification: {
    highConfidence: 70,
    probable: 50,
    possible: 30,
  },
} as const;

/**
 * Filter applied before anything reaches the display.
 *
 * The product only shows airline traffic that is (a) plausibly landing at
 * Heathrow and (b) actually going to pass over the observation point.
 * Gatwick, Luton, Stansted, City and general aviation are removed here.
 */
export const ARRIVAL_FILTER = {
  /** Projected track must pass within this distance of the observer (km) */
  maxOverheadDistanceKm: 14,
  /**
   * Tolerance when comparing time-to-observer against time-to-Heathrow.
   * Absorbs vectoring and speed changes on the approach.
   */
  overheadEtaSlackSeconds: 45,
  /** Minimum arrival score to appear as an arrival */
  minArrivalScore: 42,
  /** Another London airport fitting better than Heathrow by this margin rejects it */
  competitorLeadRejection: 18,
  /** Score penalty when a competing airport fits the trajectory better */
  competingAirportPenalty: -40,
  /** Bonus for a projected pass directly over the observation point */
  overheadBonus: 14,
  /** Aircraft above this are not local arrivals (ft) */
  maxAltitudeFeet: 16000,
  /** Below this the aircraft has effectively landed and is dropped (ft) */
  landedBelowFeet: 700,
  /** Aircraft further than this from Heathrow are not on local approach (km) */
  maxDistanceToHeathrowKm: 75,
} as const;

export const FOCUS_SELECTION = {
  /** Weighting for visual relevance / focus ranking (0–1 sum ≈ 1) */
  weights: {
    arrivalConfidence: 0.35,
    predictedProximity: 0.25,
    currentDistance: 0.15,
    approaching: 0.12,
    altitude: 0.08,
    freshness: 0.05,
  },
  /** Do not focus beyond this unless no closer candidates */
  maxFocusDistanceNm: 35,
  /** New candidate must exceed current focus by this margin */
  hysteresisMargin: 12,
  /** Minimum dwell time on a focus aircraft (ms) */
  minFocusDwellMs: 15_000,
  /** Minimum arrival score to be considered for auto-focus */
  minArrivalScore: 42,
  /** Max trail points retained per aircraft in browser memory */
  maxTrailPoints: 20,
} as const;

export const DEFAULTS = {
  searchRadiusNm: 35,
  refreshIntervalMs: 8000,
  mapStyleUrl: "https://tiles.openfreemap.org/styles/dark",
  providerTimeoutMs: 8000,
  providerRetries: 2,
  providerBackoffMs: 500,
  serverCacheTtlMs: 4000,
  /** Cap on non-arrival aircraft returned by the "all nearby traffic" view */
  maxContextAircraft: 80,
} as const;
