import { describe, expect, it } from "vitest";
import { enrichAircraft } from "@/lib/aviation/enrich";
import { computeFocusScore, selectFocusAircraft } from "@/lib/aviation/focus-selection";
import type { NormalisedAircraft } from "@/lib/aviation/types";
import {
  extractCallsignPrefix,
  formatFlightLabel,
  lookupAirlineFromCallsign,
} from "@/lib/aviation/callsigns";
import { SCORING } from "@/lib/config/scoring";

const OBS_LAT = 51.59568;
const OBS_LON = -0.12603;

function raw(
  overrides: Partial<NormalisedAircraft> & {
    icao24: string;
    latitude: number;
    longitude: number;
  },
): NormalisedAircraft {
  return {
    callsign: "BAW100",
    registration: "G-TEST",
    aircraftTypeCode: "A320",
    aircraftDescription: "Airbus A320",
    altitudeFeet: 5000,
    geometricAltitudeFeet: 5100,
    groundSpeedKnots: 240,
    trackDegrees: 250,
    verticalRateFeetPerMinute: -600,
    squawk: "1000",
    category: "A3",
    seenSecondsAgo: 2,
    dataSource: "test",
    ...overrides,
  };
}

describe("focus selection", () => {
  it("does not auto-select a nearby overflight over a clear approach", () => {
    const overflight = enrichAircraft(
      raw({
        icao24: "over01",
        callsign: "EZY999",
        latitude: 51.59,
        longitude: -0.14,
        altitudeFeet: 36000,
        trackDegrees: 90,
        verticalRateFeetPerMinute: 0,
        groundSpeedKnots: 450,
      }),
      OBS_LAT,
      OBS_LON,
    );

    const approach = enrichAircraft(
      raw({
        icao24: "arr01",
        callsign: "BAW462",
        latitude: 51.64,
        longitude: 0.08,
        altitudeFeet: 4800,
        trackDegrees: 245,
        verticalRateFeetPerMinute: -700,
        groundSpeedKnots: 250,
      }),
      OBS_LAT,
      OBS_LON,
    );

    expect(approach.assessment.score).toBeGreaterThan(overflight.assessment.score);
    expect(computeFocusScore(approach)).toBeGreaterThan(computeFocusScore(overflight));

    const selected = selectFocusAircraft({
      aircraft: [overflight, approach],
      previous: { focusIcao24: null, focusSinceMs: 0 },
      nowMs: 1_000_000,
      minArrivalScore: 30,
    });
    expect(selected.focusIcao24).toBe("arr01");
  });

  it("excludes stale aircraft from focus", () => {
    const stale = enrichAircraft(
      raw({
        icao24: "stale1",
        latitude: 51.62,
        longitude: 0.05,
        seenSecondsAgo: SCORING.excludeFromFocusAfterSeconds + 5,
      }),
      OBS_LAT,
      OBS_LON,
    );
    const fresh = enrichAircraft(
      raw({
        icao24: "fresh1",
        latitude: 51.63,
        longitude: 0.06,
        seenSecondsAgo: 2,
      }),
      OBS_LAT,
      OBS_LON,
    );

    const selected = selectFocusAircraft({
      aircraft: [stale, fresh],
      previous: { focusIcao24: null, focusSinceMs: 0 },
      nowMs: 1_000_000,
    });
    expect(selected.focusIcao24).toBe("fresh1");
  });

  it("applies hysteresis — keeps focus unless margin exceeded after dwell", () => {
    const a = enrichAircraft(
      raw({
        icao24: "keep01",
        latitude: 51.62,
        longitude: 0.05,
        altitudeFeet: 5000,
        trackDegrees: 245,
        verticalRateFeetPerMinute: -600,
      }),
      OBS_LAT,
      OBS_LON,
    );
    const b = enrichAircraft(
      raw({
        icao24: "chall01",
        latitude: 51.625,
        longitude: 0.055,
        altitudeFeet: 4900,
        trackDegrees: 246,
        verticalRateFeetPerMinute: -620,
        callsign: "VIR4L",
      }),
      OBS_LAT,
      OBS_LON,
    );

    // Ensure both are viable
    a.focusScore = 60;
    b.focusScore = 65; // only +5 — below default margin of 12

    const duringDwell = selectFocusAircraft({
      aircraft: [
        { ...a, focusScore: 60 },
        { ...b, focusScore: 65 },
      ],
      previous: { focusIcao24: "keep01", focusSinceMs: 1_000_000 },
      nowMs: 1_000_000 + 5_000, // 5s < 15s dwell
      hysteresisMargin: 12,
      minFocusDwellMs: 15_000,
    });
    expect(duringDwell.focusIcao24).toBe("keep01");

    const afterDwellStillClose = selectFocusAircraft({
      aircraft: [
        { ...a, focusScore: 60 },
        { ...b, focusScore: 65 },
      ],
      previous: { focusIcao24: "keep01", focusSinceMs: 1_000_000 },
      nowMs: 1_000_000 + 20_000,
      hysteresisMargin: 12,
      minFocusDwellMs: 15_000,
    });
    expect(afterDwellStillClose.focusIcao24).toBe("keep01");

    const afterSignificantLead = selectFocusAircraft({
      aircraft: [
        { ...a, focusScore: 60 },
        { ...b, focusScore: 80 },
      ],
      previous: { focusIcao24: "keep01", focusSinceMs: 1_000_000 },
      nowMs: 1_000_000 + 20_000,
      hysteresisMargin: 12,
      minFocusDwellMs: 15_000,
    });
    expect(afterSignificantLead.focusIcao24).toBe("chall01");
  });

  it("switches immediately when previous focus disappears", () => {
    const b = enrichAircraft(
      raw({
        icao24: "only01",
        latitude: 51.62,
        longitude: 0.05,
      }),
      OBS_LAT,
      OBS_LON,
    );
    const selected = selectFocusAircraft({
      aircraft: [b],
      previous: { focusIcao24: "gone01", focusSinceMs: 1_000_000 },
      nowMs: 1_005_000,
    });
    expect(selected.focusIcao24).toBe("only01");
  });
});

describe("callsign recognition", () => {
  it("maps common Heathrow airline prefixes", () => {
    expect(lookupAirlineFromCallsign("BAW462")).toBe("British Airways");
    expect(lookupAirlineFromCallsign("VIR4L")).toBe("Virgin Atlantic");
    expect(lookupAirlineFromCallsign("UAE3")).toBe("Emirates");
    expect(extractCallsignPrefix("UAL15")).toBe("UAL");
  });

  it("formats flight labels", () => {
    expect(formatFlightLabel("baw462  ")).toBe("BAW462");
    expect(formatFlightLabel(null)).toBe("UNKNOWN");
  });
});
