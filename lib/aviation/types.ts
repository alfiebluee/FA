export type NormalisedAircraft = {
  icao24: string;
  callsign: string | null;
  registration: string | null;
  aircraftTypeCode: string | null;
  aircraftDescription: string | null;
  latitude: number;
  longitude: number;
  altitudeFeet: number | null;
  geometricAltitudeFeet: number | null;
  groundSpeedKnots: number | null;
  trackDegrees: number | null;
  verticalRateFeetPerMinute: number | null;
  squawk: string | null;
  category: string | null;
  seenSecondsAgo: number | null;
  dataSource: string;
};

export type NormalisedFlightDetails = {
  flightNumber: string | null;
  airlineName: string | null;
  airlineIata: string | null;
  airlineIcao: string | null;
  originAirportIata: string | null;
  originAirportIcao: string | null;
  originAirportName: string | null;
  originCity: string | null;
  destinationAirportIata: string | null;
  destinationAirportIcao: string | null;
  destinationAirportName: string | null;
  scheduledArrivalUtc: string | null;
  estimatedArrivalUtc: string | null;
  terminal: string | null;
  status: string | null;
};

export type ArrivalClassification =
  | "high-confidence-arrival"
  | "probable-arrival"
  | "possible-arrival"
  | "unlikely-arrival";

export type ArrivalAssessment = {
  score: number;
  classification: ArrivalClassification;
  reasons: string[];
  distanceFromObserverKm: number;
  distanceToHeathrowKm: number;
  bearingFromAircraftToHeathrow: number;
  headingDifferenceToHeathrow: number | null;
  approachingObserver: boolean;
  descending: boolean;
  estimatedSecondsToClosestApproach: number | null;
  /** Predicted minimum ground distance from the observation point (km) */
  overheadDistanceKm: number | null;
  /** True when the projected track passes close enough to be seen overhead */
  passesOverhead: boolean;
  /** Trajectory-inferred destination when it is not Heathrow */
  competingAirportIcao: string | null;
  /** Fails the airline-traffic gate (general aviation, rotorcraft, departures) */
  eligible: boolean;
  ineligibleReason: string | null;
};

export type ProjectedApproach = {
  estimatedSecondsToClosestApproach: number | null;
  estimatedMinimumDistanceKm: number | null;
  approachingObserver: boolean;
  bearingFromObserver: number;
  distanceFromObserverKm: number;
};

export type AircraftRelevance = "arrival" | "context";

export type ApproachPhase =
  "inbound" | "approaching" | "overhead" | "departed-view" | "landing";

export type AssessedAircraft = NormalisedAircraft & {
  assessment: ArrivalAssessment;
  projection: ProjectedApproach;
  focusScore: number;
  flightDetails: NormalisedFlightDetails | null;
  inferredAirline: string | null;
  displayLabel: string;
  statusLabel: string;
  relevance: AircraftRelevance;
  phase: ApproachPhase;
};

export type ProviderStatus =
  "live" | "demo" | "error" | "rate-limited" | "stale" | "loading";

export type NearbyAircraftResponse = {
  aircraft: AssessedAircraft[];
  focusIcao24: string | null;
  providerStatus: ProviderStatus;
  providerName: string;
  fetchedAt: string;
  observer: { latitude: number; longitude: number };
  searchRadiusNm: number;
  message: string | null;
  isDemo: boolean;
  /** Total aircraft returned by the provider before Heathrow filtering */
  scannedCount: number;
  /** Aircraft passing the Heathrow-arrival filter */
  arrivalCount: number;
};

export type AircraftCategoryVisual =
  "narrow-body" | "wide-body" | "turboprop" | "helicopter" | "unknown";

export type MapMode = "follow" | "overview" | "observer" | "heathrow";

export type UnitsMode = "aviation" | "metric";
export type ClockMode = "12h" | "24h";

/**
 * "arrivals" shows only Heathrow arrivals routed over the observation point.
 * "all" additionally surfaces every aircraft the provider reports inside the
 * search radius, including departures, general aviation and rotorcraft.
 */
export type TrafficView = "arrivals" | "all";

export type DisplaySettings = {
  observerLat: number;
  observerLon: number;
  searchRadiusNm: number;
  refreshIntervalMs: number;
  minArrivalScore: number;
  trafficView: TrafficView;
  showProjectedPaths: boolean;
  showRadarAnimation: boolean;
  mapFollowMode: boolean;
  units: UnitsMode;
  clock: ClockMode;
  forceDemo: boolean;
  /**
   * Desktop notifications for 747 / A380 overflights and other notable
   * special flights (Beluga, An-124, VIP, military, rare quads).
   */
  desktopNotifications: boolean;
};
