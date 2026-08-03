import { describe, expect, it } from "vitest";
import {
  assessHeathrowArrival,
  isDisplayableArrival,
} from "@/lib/aviation/arrival-assessment";
import type { NormalisedAircraft } from "@/lib/aviation/types";

const OBS_LAT = 51.59568;
const OBS_LON = -0.12603;

function ac(
  partial: Partial<NormalisedAircraft> &
    Pick<NormalisedAircraft, "latitude" | "longitude">,
): NormalisedAircraft {
  return {
    icao24: "test01",
    callsign: "BAW123",
    registration: "G-TEST",
    aircraftTypeCode: "A320",
    aircraftDescription: "Airbus A320",
    altitudeFeet: 5000,
    geometricAltitudeFeet: 5100,
    groundSpeedKnots: 250,
    trackDegrees: 250,
    verticalRateFeetPerMinute: -600,
    squawk: "1234",
    category: "A3",
    seenSecondsAgo: 2,
    dataSource: "test",
    ...partial,
  };
}

describe("Heathrow arrival scoring", () => {
  it("scores a descending aircraft aligned toward Heathrow highly", () => {
    // East of observer, tracking SW toward Heathrow
    const aircraft = ac({
      latitude: 51.62,
      longitude: 0.05,
      trackDegrees: 245,
      altitudeFeet: 4500,
      verticalRateFeetPerMinute: -750,
      callsign: "BAW462",
    });
    const result = assessHeathrowArrival(aircraft, OBS_LAT, OBS_LON);
    expect(result.score).toBeGreaterThanOrEqual(50);
    expect(result.descending).toBe(true);
    expect(
      result.classification === "probable-arrival" ||
        result.classification === "high-confidence-arrival",
    ).toBe(true);
  });

  it("scores a climbing aircraft moving away from Heathrow poorly", () => {
    const aircraft = ac({
      icao24: "dep01",
      latitude: 51.48,
      longitude: -0.42,
      trackDegrees: 270,
      altitudeFeet: 5000,
      verticalRateFeetPerMinute: 2000,
      callsign: "BAW82",
      groundSpeedKnots: 300,
    });
    const result = assessHeathrowArrival(aircraft, OBS_LAT, OBS_LON);
    expect(result.score).toBeLessThan(40);
    expect(result.reasons.some((r) => /Climbing|Moving away/i.test(r))).toBe(true);
  });

  it("applies confirmed destination bonus", () => {
    // Weakly aligned so the destination bonus is visible before the clamp,
    // but still airline traffic so it clears the eligibility gate.
    const aircraft = ac({
      latitude: 51.55,
      longitude: -0.2,
      trackDegrees: 180,
      altitudeFeet: 8000,
      verticalRateFeetPerMinute: -100,
      callsign: "BAW999",
    });
    const without = assessHeathrowArrival(aircraft, OBS_LAT, OBS_LON);
    const withDest = assessHeathrowArrival(aircraft, OBS_LAT, OBS_LON, {
      flightNumber: "BA462",
      airlineName: "British Airways",
      airlineIata: "BA",
      airlineIcao: "BAW",
      originAirportIata: "CDG",
      originAirportIcao: "LFPG",
      originAirportName: "Paris Charles de Gaulle",
      originCity: "Paris",
      destinationAirportIata: "LHR",
      destinationAirportIcao: "EGLL",
      destinationAirportName: "London Heathrow",
      scheduledArrivalUtc: null,
      estimatedArrivalUtc: null,
      terminal: null,
      status: null,
    });
    expect(withDest.score).toBeGreaterThan(without.score);
    expect(withDest.reasons.some((r) => /Confirmed destination/i.test(r))).toBe(true);
    expect(withDest.score - without.score).toBeGreaterThanOrEqual(30);
  });

  it("penalises missing callsign and rewards commercial ones", () => {
    const base = {
      latitude: 51.62,
      longitude: 0.05,
      trackDegrees: 245,
      altitudeFeet: 5000,
      verticalRateFeetPerMinute: -500,
    };
    const commercial = assessHeathrowArrival(
      ac({ ...base, callsign: "VIR4L" }),
      OBS_LAT,
      OBS_LON,
    );
    const missing = assessHeathrowArrival(
      ac({ ...base, callsign: null }),
      OBS_LAT,
      OBS_LON,
    );
    expect(commercial.score).toBeGreaterThan(missing.score);
  });

  it("handles null altitude and speed without crashing", () => {
    const aircraft = ac({
      latitude: 51.6,
      longitude: -0.1,
      altitudeFeet: null,
      groundSpeedKnots: null,
      trackDegrees: null,
      verticalRateFeetPerMinute: null,
      callsign: null,
      seenSecondsAgo: null,
    });
    const result = assessHeathrowArrival(aircraft, OBS_LAT, OBS_LON);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.headingDifferenceToHeathrow).toBeNull();
  });
});

describe("Heathrow-only filtering", () => {
  it("rejects a Gatwick arrival crossing south London", () => {
    // South of the observer, descending on a southerly track toward Gatwick
    const aircraft = ac({
      icao24: "lgw001",
      latitude: 51.35,
      longitude: -0.18,
      trackDegrees: 178,
      altitudeFeet: 5000,
      verticalRateFeetPerMinute: -800,
      callsign: "EZY812",
    });
    const result = assessHeathrowArrival(aircraft, OBS_LAT, OBS_LON);
    expect(result.competingAirportIcao).toBe("EGKK");
    expect(isDisplayableArrival(result)).toBe(false);
  });

  it("rejects general aviation with a registration callsign", () => {
    const aircraft = ac({
      icao24: "ga0001",
      latitude: 51.62,
      longitude: 0.05,
      trackDegrees: 245,
      altitudeFeet: 2500,
      aircraftTypeCode: "P28A",
      category: "A1",
      callsign: "GENLI",
      groundSpeedKnots: 110,
    });
    const result = assessHeathrowArrival(aircraft, OBS_LAT, OBS_LON);
    expect(result.eligible).toBe(false);
    expect(isDisplayableArrival(result)).toBe(false);
  });

  it("rejects a rotorcraft even on a Heathrow-ish track", () => {
    const aircraft = ac({
      icao24: "heli01",
      latitude: 51.62,
      longitude: 0.05,
      trackDegrees: 245,
      altitudeFeet: 1500,
      category: "A7",
      callsign: "PLM12",
      groundSpeedKnots: 120,
    });
    const result = assessHeathrowArrival(aircraft, OBS_LAT, OBS_LON);
    expect(result.eligible).toBe(false);
  });

  it("rejects a Heathrow arrival that will not pass over the observer", () => {
    // Routed across south London — Heathrow-bound, but never near the observer
    const aircraft = ac({
      icao24: "far001",
      latitude: 51.3,
      longitude: -0.05,
      trackDegrees: 262,
      altitudeFeet: 4000,
      verticalRateFeetPerMinute: -600,
      callsign: "BAW11",
    });
    const result = assessHeathrowArrival(aircraft, OBS_LAT, OBS_LON);
    expect(result.passesOverhead).toBe(false);
    expect(isDisplayableArrival(result)).toBe(false);
  });

  it("accepts a descending airliner tracking over the observer to Heathrow", () => {
    const aircraft = ac({
      icao24: "lhr001",
      latitude: 51.72,
      longitude: 0.16,
      trackDegrees: 238,
      altitudeFeet: 6000,
      verticalRateFeetPerMinute: -700,
      callsign: "BAW462",
      groundSpeedKnots: 260,
    });
    const result = assessHeathrowArrival(aircraft, OBS_LAT, OBS_LON);
    expect(result.eligible).toBe(true);
    expect(result.competingAirportIcao).toBeNull();
    expect(result.passesOverhead).toBe(true);
    expect(isDisplayableArrival(result)).toBe(true);
  });

  it("rejects an aircraft on final west of Heathrow tracking east", () => {
    // Extrapolating this track far enough eventually nears north London,
    // but the aircraft lands at Heathrow minutes beforehand.
    const aircraft = ac({
      icao24: "fin001",
      latitude: 51.476,
      longitude: -0.763,
      trackDegrees: 89,
      altitudeFeet: 3300,
      verticalRateFeetPerMinute: -700,
      callsign: "BAW425",
      groundSpeedKnots: 190,
    });
    const result = assessHeathrowArrival(aircraft, OBS_LAT, OBS_LON);
    expect(result.passesOverhead).toBe(false);
    expect(isDisplayableArrival(result)).toBe(false);
  });

  it("rejects an aircraft climbing out of Heathrow", () => {
    const aircraft = ac({
      icao24: "dep002",
      latitude: 51.48,
      longitude: -0.42,
      trackDegrees: 270,
      altitudeFeet: 5000,
      verticalRateFeetPerMinute: 2400,
      callsign: "BAW82",
    });
    const result = assessHeathrowArrival(aircraft, OBS_LAT, OBS_LON);
    expect(result.eligible).toBe(false);
    expect(result.ineligibleReason).toBe("Departing");
  });
});
