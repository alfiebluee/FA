import type { AircraftCategoryVisual } from "@/lib/aviation/types";

/**
 * Proportions used to draw a side-profile silhouette for a specific airframe
 * family. Values are in the 480x170 viewBox of AircraftSilhouette, tuned by eye
 * against real side elevations — close enough that an A380 reads as an A380 and
 * a 747 as a 747, but not a scale drawing.
 */
export type AirframeProfile = {
  /** Fuselage length */
  length: number;
  /** Fuselage depth at its deepest */
  depth: number;
  /** Fin height above the fuselage crown */
  finHeight: number;
  engineCount: 2 | 4;
  /** Nacelle half-height; drives overall engine bulk */
  engineRadius: number;
  /** Boeing 747-style forward upper-deck hump */
  forwardHump: boolean;
  /** Two rows of cabin windows (A380) */
  doubleDeck: boolean;
  /** Engines on the rear fuselage instead of under the wing */
  tailEngines: boolean;
  /** Tailplane mounted at the top of the fin */
  tTail: boolean;
  /** Wing above the fuselage (turboprops) */
  highWing: boolean;
  propellers: boolean;
  /** Wingspan relative to length, used by the plan view */
  spanRatio: number;
};

const BASE: AirframeProfile = {
  length: 350,
  depth: 32,
  finHeight: 58,
  engineCount: 2,
  engineRadius: 11,
  forwardHump: false,
  doubleDeck: false,
  tailEngines: false,
  tTail: false,
  highWing: false,
  propellers: false,
  spanRatio: 1,
};

function profile(overrides: Partial<AirframeProfile>): AirframeProfile {
  return { ...BASE, ...overrides };
}

const NARROW_BODY = profile({});
const WIDE_BODY = profile({
  length: 400,
  depth: 44,
  finHeight: 64,
  engineRadius: 15,
  spanRatio: 1.05,
});
const REGIONAL_JET = profile({
  length: 300,
  depth: 26,
  finHeight: 52,
  engineRadius: 9,
  spanRatio: 0.95,
});
const TURBOPROP = profile({
  length: 300,
  depth: 30,
  finHeight: 56,
  engineRadius: 8,
  highWing: true,
  propellers: true,
  tTail: true,
  spanRatio: 1.05,
});
const ROTORCRAFT = profile({ length: 300, depth: 56 });

/** Exact matches first; anything unlisted falls back to a family prefix. */
const BY_TYPE: Record<string, AirframeProfile> = {
  // Airbus A380 — full double deck, four engines, very deep fuselage
  A388: profile({
    length: 445,
    depth: 64,
    finHeight: 72,
    engineCount: 4,
    engineRadius: 15,
    doubleDeck: true,
    spanRatio: 1.06,
  }),

  // Boeing 747 — forward upper-deck hump, four engines
  B741: profile({ length: 420, depth: 44, finHeight: 66, engineCount: 4, engineRadius: 13, forwardHump: true, spanRatio: 0.95 }),
  B742: profile({ length: 420, depth: 44, finHeight: 66, engineCount: 4, engineRadius: 13, forwardHump: true, spanRatio: 0.95 }),
  B743: profile({ length: 420, depth: 44, finHeight: 66, engineCount: 4, engineRadius: 13, forwardHump: true, spanRatio: 0.95 }),
  B744: profile({ length: 430, depth: 44, finHeight: 68, engineCount: 4, engineRadius: 13, forwardHump: true, spanRatio: 0.98 }),
  B748: profile({ length: 445, depth: 44, finHeight: 68, engineCount: 4, engineRadius: 14, forwardHump: true, spanRatio: 1 }),
  BLCF: profile({ length: 420, depth: 52, finHeight: 66, engineCount: 4, engineRadius: 13, forwardHump: true, spanRatio: 0.95 }),

  // Boeing 777 — long, huge twin engines, tall raked fin
  B772: profile({ length: 415, depth: 46, finHeight: 66, engineRadius: 18, spanRatio: 1 }),
  B77L: profile({ length: 415, depth: 46, finHeight: 66, engineRadius: 18, spanRatio: 1.04 }),
  B773: profile({ length: 450, depth: 46, finHeight: 66, engineRadius: 18, spanRatio: 0.98 }),
  B77W: profile({ length: 450, depth: 46, finHeight: 66, engineRadius: 18, spanRatio: 1 }),

  // Boeing 787 — slim wide-body, large engines
  B788: profile({ length: 395, depth: 41, finHeight: 62, engineRadius: 15, spanRatio: 1.1 }),
  B789: profile({ length: 420, depth: 41, finHeight: 62, engineRadius: 15, spanRatio: 1.06 }),
  B78X: profile({ length: 445, depth: 41, finHeight: 62, engineRadius: 15, spanRatio: 1 }),

  // Boeing 767
  B762: profile({ length: 370, depth: 40, finHeight: 60, engineRadius: 14, spanRatio: 1 }),
  B763: profile({ length: 400, depth: 40, finHeight: 60, engineRadius: 14, spanRatio: 0.95 }),
  B764: profile({ length: 425, depth: 40, finHeight: 62, engineRadius: 14, spanRatio: 0.95 }),

  // Boeing 757 — long, slim narrow-body
  B752: profile({ length: 385, depth: 32, finHeight: 60, engineRadius: 12, spanRatio: 0.85 }),
  B753: profile({ length: 420, depth: 32, finHeight: 60, engineRadius: 12, spanRatio: 0.8 }),

  // Airbus A350
  A359: profile({ length: 415, depth: 42, finHeight: 64, engineRadius: 16, spanRatio: 1.08 }),
  A35K: profile({ length: 445, depth: 42, finHeight: 64, engineRadius: 16, spanRatio: 1.02 }),

  // Airbus A330 / A340
  A332: profile({ length: 385, depth: 42, finHeight: 62, engineRadius: 15, spanRatio: 1.12 }),
  A333: profile({ length: 415, depth: 42, finHeight: 62, engineRadius: 15, spanRatio: 1.05 }),
  A339: profile({ length: 415, depth: 42, finHeight: 62, engineRadius: 16, spanRatio: 1.05 }),
  A342: profile({ length: 390, depth: 42, finHeight: 62, engineCount: 4, engineRadius: 11, spanRatio: 1.1 }),
  A343: profile({ length: 425, depth: 42, finHeight: 62, engineCount: 4, engineRadius: 11, spanRatio: 1.03 }),
  A345: profile({ length: 420, depth: 42, finHeight: 64, engineCount: 4, engineRadius: 12, spanRatio: 1.1 }),
  A346: profile({ length: 455, depth: 42, finHeight: 64, engineCount: 4, engineRadius: 12, spanRatio: 1 }),

  // Airbus A320 family — the everyday Heathrow narrow-body
  A318: profile({ length: 315, depth: 32, finHeight: 58, engineRadius: 11, spanRatio: 1.1 }),
  A319: profile({ length: 335, depth: 32, finHeight: 58, engineRadius: 11, spanRatio: 1.05 }),
  A320: profile({ length: 355, depth: 32, finHeight: 56, engineRadius: 11, spanRatio: 1 }),
  A20N: profile({ length: 355, depth: 32, finHeight: 56, engineRadius: 13, spanRatio: 1.02 }),
  A321: profile({ length: 395, depth: 32, finHeight: 56, engineRadius: 11, spanRatio: 0.9 }),
  A21N: profile({ length: 395, depth: 32, finHeight: 56, engineRadius: 13, spanRatio: 0.92 }),

  // Boeing 737 family — shorter fin, engines tucked close under the wing
  B733: profile({ length: 320, depth: 31, finHeight: 54, engineRadius: 10, spanRatio: 0.95 }),
  B734: profile({ length: 335, depth: 31, finHeight: 54, engineRadius: 10, spanRatio: 0.92 }),
  B735: profile({ length: 310, depth: 31, finHeight: 54, engineRadius: 10, spanRatio: 0.98 }),
  B736: profile({ length: 320, depth: 31, finHeight: 56, engineRadius: 11, spanRatio: 1.02 }),
  B737: profile({ length: 340, depth: 31, finHeight: 56, engineRadius: 11, spanRatio: 1 }),
  B738: profile({ length: 365, depth: 31, finHeight: 56, engineRadius: 11, spanRatio: 0.92 }),
  B739: profile({ length: 385, depth: 31, finHeight: 56, engineRadius: 11, spanRatio: 0.88 }),
  B38M: profile({ length: 365, depth: 31, finHeight: 56, engineRadius: 13, spanRatio: 0.95 }),
  B39M: profile({ length: 385, depth: 31, finHeight: 56, engineRadius: 13, spanRatio: 0.9 }),

  // Airbus A220
  BCS1: profile({ length: 305, depth: 28, finHeight: 54, engineRadius: 11, spanRatio: 1.1 }),
  BCS3: profile({ length: 335, depth: 28, finHeight: 54, engineRadius: 11, spanRatio: 1 }),

  // Embraer E-Jets — under-wing engines, small
  E170: profile({ length: 290, depth: 26, finHeight: 52, engineRadius: 9, spanRatio: 1 }),
  E75L: profile({ length: 305, depth: 26, finHeight: 52, engineRadius: 9, spanRatio: 0.95 }),
  E190: profile({ length: 320, depth: 27, finHeight: 54, engineRadius: 10, spanRatio: 0.95 }),
  E195: profile({ length: 340, depth: 27, finHeight: 54, engineRadius: 10, spanRatio: 0.9 }),
  E290: profile({ length: 320, depth: 27, finHeight: 54, engineRadius: 11, spanRatio: 1 }),
  E295: profile({ length: 350, depth: 27, finHeight: 54, engineRadius: 11, spanRatio: 0.92 }),

  // Rear-engined regional jets with a T-tail
  CRJ2: profile({ length: 295, depth: 24, finHeight: 56, engineRadius: 9, tailEngines: true, tTail: true, spanRatio: 0.8 }),
  CRJ7: profile({ length: 320, depth: 24, finHeight: 58, engineRadius: 9, tailEngines: true, tTail: true, spanRatio: 0.8 }),
  CRJ9: profile({ length: 340, depth: 24, finHeight: 58, engineRadius: 9, tailEngines: true, tTail: true, spanRatio: 0.78 }),
  CRJX: profile({ length: 360, depth: 24, finHeight: 58, engineRadius: 9, tailEngines: true, tTail: true, spanRatio: 0.75 }),
  E135: profile({ length: 275, depth: 23, finHeight: 52, engineRadius: 8, tailEngines: true, tTail: true, spanRatio: 0.8 }),
  E145: profile({ length: 300, depth: 23, finHeight: 52, engineRadius: 8, tailEngines: true, tTail: true, spanRatio: 0.75 }),

  // Turboprops
  AT43: profile({ ...TURBOPROP, length: 280 }),
  AT45: profile({ ...TURBOPROP, length: 285 }),
  AT72: profile({ ...TURBOPROP, length: 310 }),
  AT75: profile({ ...TURBOPROP, length: 310 }),
  AT76: profile({ ...TURBOPROP, length: 310 }),
  DH8A: profile({ ...TURBOPROP, length: 275 }),
  DH8C: profile({ ...TURBOPROP, length: 300 }),
  DH8D: profile({ ...TURBOPROP, length: 325 }),
  SF34: profile({ ...TURBOPROP, length: 265, tTail: false }),
};

/** Family prefixes for type codes not listed individually. */
const BY_PREFIX: [string, AirframeProfile][] = [
  ["A38", BY_TYPE.A388],
  ["A35", BY_TYPE.A359],
  ["A34", BY_TYPE.A343],
  ["A33", BY_TYPE.A333],
  ["A32", BY_TYPE.A320],
  ["A31", BY_TYPE.A319],
  ["A22", BY_TYPE.BCS3],
  ["B74", BY_TYPE.B744],
  ["B77", BY_TYPE.B77W],
  ["B78", BY_TYPE.B789],
  ["B76", BY_TYPE.B763],
  ["B75", BY_TYPE.B752],
  ["B73", BY_TYPE.B738],
  ["B3", BY_TYPE.B38M],
  ["BCS", BY_TYPE.BCS3],
  ["CRJ", BY_TYPE.CRJ9],
  ["E19", BY_TYPE.E190],
  ["E29", BY_TYPE.E290],
  ["E17", BY_TYPE.E170],
  ["E14", BY_TYPE.E145],
  ["AT", TURBOPROP],
  ["DH8", TURBOPROP],
];

const BY_CATEGORY: Record<AircraftCategoryVisual, AirframeProfile> = {
  "wide-body": WIDE_BODY,
  "narrow-body": NARROW_BODY,
  turboprop: TURBOPROP,
  helicopter: ROTORCRAFT,
  unknown: NARROW_BODY,
};

/**
 * Resolve the drawing profile for an aircraft, preferring an exact ICAO type
 * match, then the manufacturer family, then the broad visual category.
 */
export function resolveAirframeProfile(
  typeCode: string | null | undefined,
  category: AircraftCategoryVisual,
): AirframeProfile {
  if (category === "helicopter") return ROTORCRAFT;

  const code = typeCode?.trim().toUpperCase();
  if (code) {
    const exact = BY_TYPE[code];
    if (exact) return exact;
    for (const [prefix, fallback] of BY_PREFIX) {
      if (code.startsWith(prefix)) return fallback;
    }
  }
  return BY_CATEGORY[category] ?? NARROW_BODY;
}

export { NARROW_BODY, WIDE_BODY, REGIONAL_JET, TURBOPROP };
