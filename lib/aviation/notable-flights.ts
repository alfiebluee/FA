import { describeAircraftType } from "@/lib/aviation/aircraft-types";
import type { AssessedAircraft } from "@/lib/aviation/types";

export type NotableKind =
  | "a380"
  | "747"
  | "quad"
  | "outsize"
  | "historic"
  | "vip"
  | "military";

export type NotableMatch = {
  kind: NotableKind;
  /** Short label for the notification title, e.g. "Airbus A380" */
  headline: string;
  /** Why this aircraft was flagged */
  reason: string;
};

/** ICAO type → notable kind. Exact codes only. */
const BY_TYPE: Record<string, { kind: NotableKind; headline: string; reason: string }> = {
  // Super heavies — the ones people walk outside for
  A388: { kind: "a380", headline: "Airbus A380", reason: "Double-deck superjumbo" },
  B741: { kind: "747", headline: "Boeing 747-100", reason: "Classic Jumbo Jet" },
  B742: { kind: "747", headline: "Boeing 747-200", reason: "Classic Jumbo Jet" },
  B743: { kind: "747", headline: "Boeing 747-300", reason: "Classic Jumbo Jet" },
  B744: { kind: "747", headline: "Boeing 747-400", reason: "Jumbo Jet" },
  B74F: { kind: "747", headline: "Boeing 747 Freighter", reason: "747 freighter" },
  B748: { kind: "747", headline: "Boeing 747-8", reason: "Jumbo Jet" },
  BLCF: { kind: "outsize", headline: "Dreamlifter", reason: "Boeing 747 Large Cargo Freighter" },
  BSCA: { kind: "outsize", headline: "Shuttle Carrier", reason: "NASA Shuttle Carrier Aircraft" },

  // Rare four-engine passenger types at Heathrow
  A342: { kind: "quad", headline: "Airbus A340-200", reason: "Rare four-engine wide-body" },
  A343: { kind: "quad", headline: "Airbus A340-300", reason: "Rare four-engine wide-body" },
  A345: { kind: "quad", headline: "Airbus A340-500", reason: "Rare four-engine wide-body" },
  A346: { kind: "quad", headline: "Airbus A340-600", reason: "Rare four-engine wide-body" },
  IL96: { kind: "historic", headline: "Ilyushin Il-96", reason: "Rare Russian wide-body" },
  MD11: { kind: "historic", headline: "McDonnell Douglas MD-11", reason: "Trijet freighter" },
  DC10: { kind: "historic", headline: "McDonnell Douglas DC-10", reason: "Classic trijet" },
  L101: { kind: "historic", headline: "Lockheed L-1011", reason: "Classic trijet" },
  CONC: { kind: "historic", headline: "Concorde", reason: "Supersonic airliner" },

  // Outsize / special-mission freighters
  A124: { kind: "outsize", headline: "Antonov An-124", reason: "Outsize heavy freighter" },
  A225: { kind: "outsize", headline: "Antonov An-225", reason: "Largest aircraft ever built" },
  A337: { kind: "outsize", headline: "BelugaXL", reason: "Airbus BelugaXL" },
  A3ST: { kind: "outsize", headline: "Beluga", reason: "Airbus Beluga" },
  A400: { kind: "military", headline: "Airbus A400M", reason: "Military transport" },
  C17: { kind: "military", headline: "Boeing C-17", reason: "Military transport" },
  C5M: { kind: "military", headline: "Lockheed C-5M", reason: "Military transport" },
  C130: { kind: "military", headline: "Lockheed C-130", reason: "Military transport" },
  C30J: { kind: "military", headline: "Lockheed C-130J", reason: "Military transport" },
  K35R: { kind: "military", headline: "KC-135 Stratotanker", reason: "Aerial tanker" },
  K46A: { kind: "military", headline: "KC-46 Pegasus", reason: "Aerial tanker" },
  V22: { kind: "military", headline: "Bell Boeing V-22", reason: "Tiltrotor" },
};

/** Callsign prefixes / exacts for VIP and state flights. */
const CALLSIGN_RULES: { test: RegExp; kind: NotableKind; headline: string; reason: string }[] = [
  { test: /^(AF1|A1|SAM\d|EXEC1F)/, kind: "vip", headline: "US Special Air Mission", reason: "VIP / state aircraft" },
  { test: /^(SPAR|REACH|EVAC|BOXER)/, kind: "military", headline: "US Military flight", reason: "Military callsign" },
  { test: /^(RRR|ASCOT|RFR)/, kind: "military", headline: "RAF flight", reason: "Royal Air Force" },
  { test: /^BAW9\d{2}$/, kind: "vip", headline: "British Airways VIP", reason: "Likely state / charter BA flight" },
  { test: /^(KRF|BAF|GAF|FAF|IAM|CNV)/, kind: "military", headline: "Military flight", reason: "Military callsign" },
  { test: /^(NASA|NA\d)/, kind: "historic", headline: "NASA flight", reason: "NASA aircraft" },
];

const TYPE_PREFIXES: [string, NotableKind, string, string][] = [
  ["A38", "a380", "Airbus A380", "Double-deck superjumbo"],
  ["B74", "747", "Boeing 747", "Jumbo Jet"],
  ["A34", "quad", "Airbus A340", "Rare four-engine wide-body"],
  ["A12", "outsize", "Antonov An-124", "Outsize heavy freighter"],
  ["A22", "outsize", "Antonov An-225", "Largest aircraft ever built"],
];

/**
 * Classify an aircraft as worth a desktop notification, or null if ordinary.
 * 747 / A380 always win; everything else needs a special type or callsign.
 */
export function classifyNotable(aircraft: {
  aircraftTypeCode?: string | null;
  callsign?: string | null;
}): NotableMatch | null {
  const type = aircraft.aircraftTypeCode?.trim().toUpperCase() ?? "";
  const callsign = aircraft.callsign?.trim().toUpperCase() ?? "";

  if (type) {
    const exact = BY_TYPE[type];
    if (exact) return exact;
    for (const [prefix, kind, headline, reason] of TYPE_PREFIXES) {
      if (type.startsWith(prefix)) return { kind, headline, reason };
    }
  }

  for (const rule of CALLSIGN_RULES) {
    if (callsign && rule.test.test(callsign)) {
      return {
        kind: rule.kind,
        headline: rule.headline,
        reason: rule.reason,
      };
    }
  }

  return null;
}

/**
 * Only alert when the aircraft is actually going to be (or is) near the
 * observation point — not every 747 on the London FIR.
 */
export function shouldNotifyNotable(aircraft: AssessedAircraft): boolean {
  const match = classifyNotable(aircraft);
  if (!match) return false;

  const { assessment } = aircraft;

  // Heathrow arrivals routed overhead are the primary case
  if (aircraft.relevance === "arrival") return true;
  if (assessment.passesOverhead) return true;

  // Special traffic that isn't EGLL-bound but is closing in nearby
  const close =
    assessment.distanceFromObserverKm <= 22 ||
    (assessment.overheadDistanceKm != null && assessment.overheadDistanceKm <= 14);
  if (close && assessment.approachingObserver) return true;

  // Already overhead or just past
  if (assessment.distanceFromObserverKm <= 6) return true;

  return false;
}

export function notableDisplayName(aircraft: AssessedAircraft, match: NotableMatch): string {
  return (
    describeAircraftType(aircraft.aircraftTypeCode) ??
    match.headline
  );
}
