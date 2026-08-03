import { describe, expect, it } from "vitest";
import { bearingDegrees, haversineDistanceKm, kmToNm, nmToKm } from "@/lib/geo/distance";
import {
  circularHeadingDifference,
  normaliseHeading,
  signedHeadingDifference,
} from "@/lib/geo/angles";

describe("haversineDistanceKm", () => {
  it("returns ~0 for identical points", () => {
    expect(haversineDistanceKm(51.5, -0.1, 51.5, -0.1)).toBeLessThan(0.001);
  });

  it("computes known London distance approximately", () => {
    // Observer to Heathrow roughly 25–30 km
    const d = haversineDistanceKm(51.59568, -0.12603, 51.47, -0.4543);
    expect(d).toBeGreaterThan(20);
    expect(d).toBeLessThan(35);
  });
});

describe("bearingDegrees", () => {
  it("returns ~west from observer toward Heathrow", () => {
    const b = bearingDegrees(51.59568, -0.12603, 51.47, -0.4543);
    // Heathrow is southwest of North London observer
    expect(b).toBeGreaterThan(200);
    expect(b).toBeLessThan(260);
  });

  it("returns northbound bearing near 0", () => {
    const b = bearingDegrees(51.5, -0.1, 51.6, -0.1);
    expect(b).toBeLessThan(5);
  });
});

describe("circular heading difference", () => {
  it("handles wrap-around across 0°", () => {
    expect(circularHeadingDifference(350, 10)).toBe(20);
    expect(circularHeadingDifference(10, 350)).toBe(20);
  });

  it("returns 0 for identical headings", () => {
    expect(circularHeadingDifference(180, 180)).toBe(0);
  });

  it("caps at 180", () => {
    expect(circularHeadingDifference(0, 180)).toBe(180);
  });
});

describe("heading helpers", () => {
  it("normalises negative headings", () => {
    expect(normaliseHeading(-90)).toBe(270);
  });

  it("signed difference prefers shortest turn", () => {
    expect(signedHeadingDifference(350, 10)).toBe(20);
    expect(signedHeadingDifference(10, 350)).toBe(-20);
  });
});

describe("unit conversion", () => {
  it("converts nm and km", () => {
    expect(nmToKm(1)).toBeCloseTo(1.852, 3);
    expect(kmToNm(1.852)).toBeCloseTo(1, 3);
  });
});
