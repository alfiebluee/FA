import type { AircraftPositionProvider } from "@/lib/providers/aircraft/interface";
import type { NormalisedAircraft } from "@/lib/aviation/types";
import { destinationPoint } from "@/lib/geo/distance";
import { HEATHROW } from "@/lib/config/scoring";

/**
 * Demonstration traffic modelled on the real picture over north London:
 * Heathrow arrivals tracking south-west across the observation point,
 * stepping down from around 9,000 ft to circuit height, plus a couple of
 * deliberately irrelevant aircraft to prove the filter works.
 */
type MockTrack = {
  icao24: string;
  callsign: string;
  registration: string;
  aircraftTypeCode: string;
  aircraftDescription: string;
  category: string;
  role: "arrival" | "overflight" | "departure";
  /** Distance along the approach path at t=0, in km before the observer */
  startOffsetKm: number;
  /** Ground speed in knots */
  groundSpeedKnots: number;
  /** Seconds for one full pass; controls animation pace */
  cycleSeconds: number;
};

/** Arrivals run inbound on this track, which passes over the observer. */
const APPROACH_TRACK_DEG = 238;
/** Aircraft enter this far up-track from the observer. */
const PATH_LENGTH_KM = 62;
/** And continue this far past it toward Heathrow. */
const PATH_OVERRUN_KM = 22;

const MOCK_TRACKS: MockTrack[] = [
  {
    icao24: "400001",
    callsign: "BAW462",
    registration: "G-EUUY",
    aircraftTypeCode: "A320",
    aircraftDescription: "Airbus A320",
    category: "A3",
    role: "arrival",
    startOffsetKm: 8,
    groundSpeedKnots: 245,
    cycleSeconds: 260,
  },
  {
    icao24: "400002",
    callsign: "BAW15",
    registration: "G-STBA",
    aircraftTypeCode: "B77W",
    aircraftDescription: "Boeing 777-300ER",
    category: "A5",
    role: "arrival",
    startOffsetKm: 26,
    groundSpeedKnots: 262,
    cycleSeconds: 300,
  },
  {
    icao24: "400003",
    callsign: "VIR4L",
    registration: "G-VLDY",
    aircraftTypeCode: "A35K",
    aircraftDescription: "Airbus A350-1000",
    category: "A5",
    role: "arrival",
    startOffsetKm: 45,
    groundSpeedKnots: 275,
    cycleSeconds: 320,
  },
  {
    icao24: "400004",
    callsign: "UAE3",
    registration: "A6-EVQ",
    aircraftTypeCode: "A388",
    aircraftDescription: "Airbus A380-800",
    category: "A5",
    role: "arrival",
    startOffsetKm: 66,
    groundSpeedKnots: 288,
    cycleSeconds: 350,
  },
  {
    icao24: "400005",
    callsign: "EZY8321",
    registration: "G-UZHD",
    aircraftTypeCode: "A20N",
    aircraftDescription: "Airbus A320neo",
    category: "A3",
    role: "overflight",
    startOffsetKm: 0,
    groundSpeedKnots: 430,
    cycleSeconds: 420,
  },
  {
    icao24: "400006",
    callsign: "BAW82",
    registration: "G-ZBJA",
    aircraftTypeCode: "B789",
    aircraftDescription: "Boeing 787-9",
    category: "A5",
    role: "departure",
    startOffsetKm: 0,
    groundSpeedKnots: 310,
    cycleSeconds: 380,
  },
];

export class MockAircraftProvider implements AircraftPositionProvider {
  readonly name = "mock";

  constructor(
    private readonly epochMs: number = Date.now(),
    private readonly observer: { lat: number; lon: number } = {
      lat: 51.59568,
      lon: -0.12603,
    },
  ) {}

  async getNearbyAircraft(
    latitude: number,
    longitude: number,
    radiusNm: number,
  ): Promise<NormalisedAircraft[]> {
    void radiusNm;
    const elapsedSec = (Date.now() - this.epochMs) / 1000;
    const observerLat = Number.isFinite(latitude) ? latitude : this.observer.lat;
    const observerLon = Number.isFinite(longitude) ? longitude : this.observer.lon;
    return MOCK_TRACKS.map((track) =>
      animateTrack(track, elapsedSec, observerLat, observerLon),
    );
  }
}

function animateTrack(
  track: MockTrack,
  elapsedSec: number,
  observerLat: number,
  observerLon: number,
): NormalisedAircraft {
  if (track.role === "departure") {
    return animateDeparture(track, elapsedSec);
  }
  if (track.role === "overflight") {
    return animateOverflight(track, elapsedSec, observerLat, observerLon);
  }

  const totalPath = PATH_LENGTH_KM + PATH_OVERRUN_KM;
  const progressKm =
    ((elapsedSec / track.cycleSeconds) * totalPath + track.startOffsetKm) % totalPath;

  // Distance still to run before reaching the observation point.
  const kmBeforeObserver = PATH_LENGTH_KM - progressKm;
  // Inbound aircraft sit up-track on the reciprocal bearing from the observer.
  const inboundBearing = (APPROACH_TRACK_DEG + 180) % 360;
  const position = destinationPoint(
    observerLat,
    observerLon,
    kmBeforeObserver >= 0 ? inboundBearing : APPROACH_TRACK_DEG,
    Math.abs(kmBeforeObserver),
  );

  // Step down from about 9,000 ft on entry to circuit height near Heathrow.
  const descentFraction = Math.min(1, Math.max(0, progressKm / totalPath));
  const altitude = Math.round(9200 - descentFraction * 7100);
  const verticalRate = Math.round(-620 - Math.sin(elapsedSec / 30) * 120);

  return {
    icao24: track.icao24,
    callsign: track.callsign,
    registration: track.registration,
    aircraftTypeCode: track.aircraftTypeCode,
    aircraftDescription: track.aircraftDescription,
    latitude: position.latitude,
    longitude: position.longitude,
    altitudeFeet: altitude,
    geometricAltitudeFeet: altitude + 60,
    groundSpeedKnots: track.groundSpeedKnots,
    trackDegrees: APPROACH_TRACK_DEG,
    verticalRateFeetPerMinute: verticalRate,
    squawk: "6041",
    category: track.category,
    seenSecondsAgo: 0.4,
    dataSource: "mock",
  };
}

function animateOverflight(
  track: MockTrack,
  elapsedSec: number,
  observerLat: number,
  observerLon: number,
): NormalisedAircraft {
  const progress = (elapsedSec % track.cycleSeconds) / track.cycleSeconds;
  const position = destinationPoint(observerLat, observerLon, 270, -60 + progress * 120);
  return {
    icao24: track.icao24,
    callsign: track.callsign,
    registration: track.registration,
    aircraftTypeCode: track.aircraftTypeCode,
    aircraftDescription: track.aircraftDescription,
    latitude: position.latitude,
    longitude: position.longitude,
    altitudeFeet: 36000,
    geometricAltitudeFeet: 36400,
    groundSpeedKnots: track.groundSpeedKnots,
    trackDegrees: 90,
    verticalRateFeetPerMinute: 0,
    squawk: "2000",
    category: track.category,
    seenSecondsAgo: 1.2,
    dataSource: "mock",
  };
}

function animateDeparture(track: MockTrack, elapsedSec: number): NormalisedAircraft {
  const progress = (elapsedSec % track.cycleSeconds) / track.cycleSeconds;
  const position = destinationPoint(
    HEATHROW.latitude,
    HEATHROW.longitude,
    268,
    2 + progress * 55,
  );
  return {
    icao24: track.icao24,
    callsign: track.callsign,
    registration: track.registration,
    aircraftTypeCode: track.aircraftTypeCode,
    aircraftDescription: track.aircraftDescription,
    latitude: position.latitude,
    longitude: position.longitude,
    altitudeFeet: Math.round(2000 + progress * 15000),
    geometricAltitudeFeet: Math.round(2100 + progress * 15000),
    groundSpeedKnots: track.groundSpeedKnots,
    trackDegrees: 268,
    verticalRateFeetPerMinute: 2200,
    squawk: "5312",
    category: track.category,
    seenSecondsAgo: 0.8,
    dataSource: "mock",
  };
}

/** Shared epoch so client and server demo animations stay roughly aligned. */
const sharedMockEpoch = Date.now();

export function getSharedMockProvider(): MockAircraftProvider {
  return new MockAircraftProvider(sharedMockEpoch);
}
