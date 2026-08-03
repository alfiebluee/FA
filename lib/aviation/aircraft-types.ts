import type { AircraftCategoryVisual } from "@/lib/aviation/types";

/** Broad visual category from ICAO type designator — simplified, not exact. */
const WIDE_BODY = new Set([
  "A332",
  "A333",
  "A338",
  "A339",
  "A342",
  "A343",
  "A345",
  "A346",
  "A359",
  "A35K",
  "A388",
  "B744",
  "B748",
  "B762",
  "B763",
  "B764",
  "B772",
  "B77L",
  "B77W",
  "B788",
  "B789",
  "B78X",
  "MD11",
  "IL96",
]);

const TURBOPROP = new Set([
  "AT72",
  "AT76",
  "AT45",
  "AT46",
  "AT43",
  "AT75",
  "DH8A",
  "DH8B",
  "DH8C",
  "DH8D",
  "E120",
  "SF34",
  "B350",
  "BE20",
  "PC12",
  "TBM7",
  "TBM8",
  "TBM9",
  "C208",
  "DHC6",
]);

const HELICOPTER = new Set([
  "EC35",
  "EC45",
  "EC55",
  "A109",
  "B06",
  "B407",
  "R44",
  "R66",
  "AS50",
  "AS65",
  "H60",
  "S76",
  "AW13",
  "AW18",
]);

const TYPE_DESCRIPTIONS: Record<string, string> = {
  A319: "Airbus A319",
  A320: "Airbus A320",
  A20N: "Airbus A320neo",
  A321: "Airbus A321",
  A21N: "Airbus A321neo",
  A332: "Airbus A330-200",
  A333: "Airbus A330-300",
  A339: "Airbus A330-900neo",
  A359: "Airbus A350-900",
  A35K: "Airbus A350-1000",
  A388: "Airbus A380-800",
  B738: "Boeing 737-800",
  B38M: "Boeing 737 MAX 8",
  B739: "Boeing 737-900",
  B744: "Boeing 747-400",
  B763: "Boeing 767-300",
  B772: "Boeing 777-200",
  B77W: "Boeing 777-300ER",
  B788: "Boeing 787-8",
  B789: "Boeing 787-9",
  B78X: "Boeing 787-10",
  E190: "Embraer E190",
  E195: "Embraer E195",
  E290: "Embraer E190-E2",
  E295: "Embraer E195-E2",
  BCS3: "Airbus A220-300",
  BCS1: "Airbus A220-100",
  A346: "Airbus A340-600",
  A343: "Airbus A340-300",
  B734: "Boeing 737-400",
  B737: "Boeing 737-700",
  B39M: "Boeing 737 MAX 9",
  B748: "Boeing 747-8",
  B752: "Boeing 757-200",
  B762: "Boeing 767-200",
  B764: "Boeing 767-400",
  B77L: "Boeing 777-200LR",
  B773: "Boeing 777-300",
  AT72: "ATR 72",
  AT76: "ATR 72-600",
  DH8D: "De Havilland Dash 8 Q400",
  CRJ9: "Bombardier CRJ900",
  CRJ2: "Bombardier CRJ200",
};

const QUAD_ENGINE = new Set([
  "A388",
  "A342",
  "A343",
  "A345",
  "A346",
  "B741",
  "B742",
  "B743",
  "B744",
  "B748",
  "BLCF",
  "IL96",
  "A124",
  "AN12",
]);

/** Four-engine airframes get a different nacelle treatment in the artwork. */
export function isQuadEngine(typeCode: string | null): boolean {
  if (!typeCode) return false;
  return QUAD_ENGINE.has(typeCode.trim().toUpperCase());
}

export function describeAircraftType(typeCode: string | null): string | null {
  if (!typeCode) return null;
  const code = typeCode.trim().toUpperCase();
  return TYPE_DESCRIPTIONS[code] ?? code;
}

export function visualCategoryFromType(
  typeCode: string | null,
  category: string | null,
): AircraftCategoryVisual {
  if (typeCode) {
    const code = typeCode.trim().toUpperCase();
    if (HELICOPTER.has(code)) return "helicopter";
    if (TURBOPROP.has(code)) return "turboprop";
    if (WIDE_BODY.has(code)) return "wide-body";
    if (/^(A3|B7|MD1|IL9)/.test(code) && WIDE_BODY.has(code)) return "wide-body";
    // Most remaining jet airliner codes are narrow-body
    if (/^(A1|A2|B7[0-3]|E1|E2|BC|CRJ|C25)/.test(code)) return "narrow-body";
    if (WIDE_BODY.has(code)) return "wide-body";
  }

  // ADS-B emitter category: A3–A5 often larger jets; A7 rotorcraft
  if (category === "A7") return "helicopter";
  if (category === "A5" || category === "A4") return "wide-body";
  if (category === "A1" || category === "A2" || category === "A3") return "narrow-body";

  return "unknown";
}
