import { describe, expect, it } from "vitest";
import { enrichAircraft } from "@/lib/aviation/enrich";
import {
  classifyNotable,
  shouldNotifyNotable,
} from "@/lib/aviation/notable-flights";
import { buildNotableNotification } from "@/lib/notifications/notable-alerts";
import type { NormalisedAircraft } from "@/lib/aviation/types";

const OBS_LAT = 51.59568;
const OBS_LON = -0.12603;

function raw(
  overrides: Partial<NormalisedAircraft> & {
    icao24?: string;
    latitude?: number;
    longitude?: number;
  } = {},
): NormalisedAircraft {
  return {
    icao24: "abc123",
    callsign: "UAE3",
    registration: "A6-EVQ",
    aircraftTypeCode: "A388",
    aircraftDescription: "Airbus A380-800",
    latitude: 51.62,
    longitude: 0.05,
    altitudeFeet: 8200,
    geometricAltitudeFeet: 8300,
    groundSpeedKnots: 280,
    trackDegrees: 245,
    verticalRateFeetPerMinute: -600,
    squawk: "1234",
    category: "A5",
    seenSecondsAgo: 2,
    dataSource: "test",
    ...overrides,
  };
}

describe("classifyNotable", () => {
  it("flags an A380", () => {
    expect(classifyNotable(raw({ aircraftTypeCode: "A388" }))?.kind).toBe("a380");
  });

  it("flags a 747-8", () => {
    expect(classifyNotable(raw({ aircraftTypeCode: "B748" }))?.kind).toBe("747");
  });

  it("flags an An-124", () => {
    expect(classifyNotable(raw({ aircraftTypeCode: "A124" }))?.kind).toBe("outsize");
  });

  it("flags RAF callsigns", () => {
    expect(
      classifyNotable(raw({ aircraftTypeCode: "A332", callsign: "RRR6521" }))?.kind,
    ).toBe("military");
  });

  it("ignores ordinary narrow-bodies", () => {
    expect(
      classifyNotable(raw({ aircraftTypeCode: "A320", callsign: "BAW462" })),
    ).toBeNull();
  });
});

describe("shouldNotifyNotable", () => {
  it("notifies Heathrow arrivals that are notable", () => {
    const assessed = enrichAircraft(raw(), OBS_LAT, OBS_LON, null);
    expect(shouldNotifyNotable(assessed)).toBe(true);
  });

  it("does not notify a distant A380 that will not pass overhead", () => {
    const assessed = enrichAircraft(
      raw({
        latitude: 51.2,
        longitude: 0.5,
        trackDegrees: 90,
        verticalRateFeetPerMinute: 0,
        altitudeFeet: 35000,
      }),
      OBS_LAT,
      OBS_LON,
      null,
    );
    // Force non-arrival context if enrich still classified it somehow
    const candidate = {
      ...assessed,
      relevance: "context" as const,
      assessment: {
        ...assessed.assessment,
        passesOverhead: false,
        approachingObserver: false,
        distanceFromObserverKm: 55,
        overheadDistanceKm: 40,
      },
    };
    expect(shouldNotifyNotable(candidate)).toBe(false);
  });
});

describe("buildNotableNotification", () => {
  it("includes altitude and overhead timing", () => {
    const assessed = enrichAircraft(raw(), OBS_LAT, OBS_LON, null);
    const match = classifyNotable(assessed)!;
    const { title, body } = buildNotableNotification(assessed, match, "aviation");
    expect(title).toMatch(/A380|Airbus A380/);
    expect(body).toMatch(/8,?200 ft/);
    expect(body).toContain("Overhead");
  });
});
