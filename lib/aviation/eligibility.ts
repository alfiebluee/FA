import type { NormalisedAircraft } from "@/lib/aviation/types";
import { ARRIVAL_FILTER } from "@/lib/config/scoring";

/**
 * Commercial ICAO callsign shape: three-letter operator code followed by
 * 1–4 digits and an optional letter suffix (BAW462, VIR4L, EZY83QP).
 * Registration-style callsigns (GENLI, N1350J) fail this test, which is how
 * general aviation is separated from airline traffic.
 */
const COMMERCIAL_CALLSIGN = /^[A-Z]{3}\d{1,4}[A-Z]{0,2}$/;

/** Light aircraft, trainers, business props and rotorcraft — never shown. */
const LIGHT_AIRCRAFT_TYPES = new Set([
  "P28A",
  "P28B",
  "P28R",
  "P32R",
  "PA18",
  "PA24",
  "PA28",
  "PA31",
  "PA32",
  "PA34",
  "PA44",
  "PA46",
  "C152",
  "C162",
  "C172",
  "C177",
  "C182",
  "C206",
  "C210",
  "C72R",
  "DA40",
  "DA42",
  "DA62",
  "DV20",
  "SR20",
  "SR22",
  "S22T",
  "AA5",
  "AC11",
  "BE33",
  "BE35",
  "BE36",
  "BE58",
  "BE76",
  "M20P",
  "M20T",
  "TB10",
  "TB20",
  "TB21",
  "RV6",
  "RV7",
  "RV8",
  "RV9",
  "RV10",
  "RV14",
  "GLID",
  "ULAC",
  "TWEN",
  "EUPA",
  "SIRA",
  "P210",
  "AT3",
  "R22",
  "R44",
  "R66",
  "EC20",
  "EC30",
  "EC35",
  "EC45",
  "EC55",
  "A109",
  "A119",
  "AS50",
  "AS55",
  "AS65",
  "B06",
  "B407",
  "B429",
  "S76",
  "AW09",
  "AW13",
  "AW18",
  "H500",
  "GAZL",
  "H269",
  "C25A",
  "C25B",
  "C25C",
  "C510",
  "C525",
  "C550",
  "C56X",
  "C68A",
  "SF50",
  "E50P",
  "E55P",
  "PC12",
  "TBM7",
  "TBM8",
  "TBM9",
  "TBM4",
  "BALL",
  "DR40",
  "MCR1",
  "EV97",
  "P28T",
  "F260",
]);

/**
 * Business jets and regional bizliners. These overfly London constantly but
 * operate into Luton, Farnborough, Biggin Hill and Northolt rather than Heathrow.
 */
const BUSINESS_JET_TYPES = new Set([
  "GLF2",
  "GLF3",
  "GLF4",
  "GLF5",
  "GLF6",
  "GL5T",
  "GL7T",
  "GLEX",
  "GALX",
  "CL30",
  "CL35",
  "CL60",
  "CL64",
  "CRJ1",
  "LJ35",
  "LJ40",
  "LJ45",
  "LJ60",
  "LJ70",
  "LJ75",
  "FA7X",
  "FA8X",
  "FA10",
  "FA20",
  "FA50",
  "F900",
  "F2TH",
  "H25B",
  "HA4T",
  "HDJT",
  "PRM1",
  "BE40",
  "HHUM",
  "E35L",
  "E45X",
  "E50P",
  "E55P",
  "E545",
  "E550",
  "C700",
  "C750",
  "CL30",
]);

/**
 * ICAO operator codes that do not serve Heathrow. Low-cost carriers routing to
 * Gatwick, Luton and Stansted cross north London on almost identical tracks,
 * so operator identity is the cleanest way to separate them.
 */
const NON_HEATHROW_OPERATORS = new Set([
  // Low-cost, Gatwick / Luton / Stansted / Southend
  "RYR",
  "RUK",
  "RYS",
  "EZY",
  "EJU",
  "EZS",
  "WZZ",
  "WUK",
  "WMT",
  "EXS",
  "TOM",
  "TFL",
  "NOZ",
  "NAX",
  "NSZ",
  "IBK",
  "PGT",
  "FHY",
  "SXS",
  "CAI",
  "VLG",
  "TVF",
  "TRA",
  "JAF",
  "BLX",
  "WIF",
  "SDR",
  "AEA",
  // London City only
  "CFE",
  // Express freight, Stansted and East Midlands
  "BCS",
  "TAY",
  "ABR",
  "NPT",
  "SWN",
  "WSN",
]);

/** ADS-B emitter categories that are never Heathrow airline arrivals. */
const EXCLUDED_CATEGORIES = new Set([
  "A7", // Rotorcraft
  "B1", // Glider
  "B2", // Lighter-than-air
  "B3", // Parachutist
  "B4", // Ultralight
  "B6", // UAV
  "B7", // Space vehicle
  "C1",
  "C2",
  "C3",
  "C4",
  "C5",
  "C6",
  "C7", // Surface / obstacle
]);

export type EligibilityResult = {
  eligible: boolean;
  reason: string | null;
};

export function hasCommercialCallsignShape(callsign: string | null): boolean {
  if (!callsign) return false;
  return COMMERCIAL_CALLSIGN.test(callsign.trim().toUpperCase().replace(/\s+/g, ""));
}

export function isLightAircraft(aircraft: NormalisedAircraft): boolean {
  const type = aircraft.aircraftTypeCode?.trim().toUpperCase();
  if (type && LIGHT_AIRCRAFT_TYPES.has(type)) return true;
  if (type && BUSINESS_JET_TYPES.has(type)) return true;
  // Category A1 is "light" (< 15,500 lb) — airliners are never A1.
  if (aircraft.category === "A1") return true;
  return false;
}

/** True when the operating airline is known not to fly to Heathrow. */
export function operatesToHeathrow(callsign: string | null): boolean {
  if (!callsign) return true;
  const prefix = callsign.trim().toUpperCase().slice(0, 3);
  return !NON_HEATHROW_OPERATORS.has(prefix);
}

/**
 * Hard gate applied before scoring. Anything failing this is not airline
 * traffic on approach to Heathrow and should never reach the display.
 */
export function assessEligibility(aircraft: NormalisedAircraft): EligibilityResult {
  if (aircraft.category && EXCLUDED_CATEGORIES.has(aircraft.category)) {
    return { eligible: false, reason: "Not airline traffic" };
  }
  if (isLightAircraft(aircraft)) {
    return { eligible: false, reason: "General aviation" };
  }
  if (!hasCommercialCallsignShape(aircraft.callsign)) {
    return { eligible: false, reason: "No commercial callsign" };
  }
  if (!operatesToHeathrow(aircraft.callsign)) {
    return { eligible: false, reason: "Operator does not serve Heathrow" };
  }
  if (
    aircraft.altitudeFeet != null &&
    aircraft.altitudeFeet > ARRIVAL_FILTER.maxAltitudeFeet
  ) {
    return { eligible: false, reason: "Cruise altitude overflight" };
  }
  // Below circuit height the aircraft has landed or is on the runway — the
  // display should let it go rather than hold a stale card.
  if (
    aircraft.altitudeFeet != null &&
    aircraft.altitudeFeet < ARRIVAL_FILTER.landedBelowFeet
  ) {
    return { eligible: false, reason: "Landed" };
  }
  if (
    aircraft.verticalRateFeetPerMinute != null &&
    aircraft.verticalRateFeetPerMinute > 900
  ) {
    return { eligible: false, reason: "Departing" };
  }
  return { eligible: true, reason: null };
}
